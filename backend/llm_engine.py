import os
import json
import logging
from typing import Dict, Any, Optional

import google.generativeai as genai
from groq import Groq
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize clients
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_FALLBACK_MODEL = "llama-3.1-8b-instant"
GEMINI_MODEL = "gemini-2.5-flash"

def call_llm(prompt: str, system_prompt: str = "", require_json: bool = False, json_schema: Optional[type[BaseModel]] = None) -> str:
    """
    Calls Groq 70b first. If rate limited, falls back to Groq 8b instant, then Gemini.
    """
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    try:
        if not groq_client:
            raise ValueError("Groq client not initialized")
        
        logger.info(f"Calling Groq ({GROQ_MODEL})...")
        kwargs = {
            "messages": messages,
            "model": GROQ_MODEL,
        }
        if require_json:
            kwargs["response_format"] = {"type": "json_object"}
            
        completion = groq_client.chat.completions.create(**kwargs)
        return completion.choices[0].message.content
        
    except Exception as e:
        logger.warning(f"Groq 70b failed ({e}). Retrying with Groq 8b ({GROQ_FALLBACK_MODEL})...")
        try:
            kwargs = {
                "messages": messages,
                "model": GROQ_FALLBACK_MODEL,
            }
            if require_json:
                kwargs["response_format"] = {"type": "json_object"}
            completion = groq_client.chat.completions.create(**kwargs)
            return completion.choices[0].message.content
        except Exception as e2:
            logger.warning(f"Groq 8b failed: {e2}. Falling back to Gemini ({GEMINI_MODEL})...")
            
            if not GEMINI_API_KEY:
                raise ValueError("Gemini API key not configured for fallback")
                
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=system_prompt if system_prompt else None,
            )
            
            generation_config = genai.types.GenerationConfig()
            if require_json:
                generation_config.response_mime_type = "application/json"
                if json_schema:
                    generation_config.response_schema = json_schema
                    
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            return response.text

def extract_json(raw: str) -> dict:
    """Safely extracts JSON from an LLM response even if fenced in markdown."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        try:
            # Try to strip markdown fences
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0]
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0]
            return json.loads(raw.strip())
        except Exception:
            raise ValueError("Failed to parse JSON from LLM response")
