import os
import json
import logging
import requests
from typing import Dict, Any, Optional

from groq import Groq
from pydantic import BaseModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize clients
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

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

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            if system_prompt:
                payload["system_instruction"] = {"parts": [{"text": system_prompt}]}
            if require_json:
                payload["generationConfig"] = {"responseMimeType": "application/json"}

            g_res = requests.post(url, json=payload, timeout=60)
            if not g_res.ok:
                raise ValueError(f"Gemini API error ({g_res.status_code}): {g_res.text}")
            
            g_json = g_res.json()
            return g_json["candidates"][0]["content"]["parts"][0]["text"]

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
