import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

GOWINSTON_API_KEY = os.getenv("WINSTON_AI_API_KEY") or os.getenv("GOWINSTON_API_KEY")
GOWINSTON_URL = "https://api.gowinston.ai/v2/plagiarism"


def check_plagiarism(text: str) -> dict:
    """
    Sends text to GoWinston AI's plagiarism detection API.
    Returns the full response including score and matched sources.
    """
    if not GOWINSTON_API_KEY:
        logger.error("GOWINSTON_API_KEY not set")
        return {
            "success": False,
            "error": "GoWinston API key not configured",
            "score": None,
            "sources": [],
        }

    # Strip LaTeX commands to get cleaner text for plagiarism checking
    import re
    clean_text = re.sub(r'\\[a-zA-Z]+\{[^}]*\}', '', text)
    clean_text = re.sub(r'\\[a-zA-Z]+', '', clean_text)
    clean_text = re.sub(r'[{}]', '', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    # Limit to max 500 words to fit within remaining GoWinston credit balance (1 credit per word)
    words = clean_text.split()
    if len(words) > 500:
        clean_text = " ".join(words[:500])

    try:
        logger.info(f"Sending {len(clean_text.split())} words to GoWinston for plagiarism check...")
        response = requests.post(
            GOWINSTON_URL,
            headers={
                "Authorization": f"Bearer {GOWINSTON_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "text": clean_text,
                "language": "en",
            },
            timeout=120,
        )

        if response.status_code == 403 and "INSUFFICIENT_CREDIT" in response.text:
            logger.warning("GoWinston credit limit reached")
            return {
                "success": False,
                "error": "GoWinston credit limit reached. Please top up your balance at https://dev.gowinston.ai/billing.",
                "score": None,
                "sources": [],
            }

        if response.status_code == 429:
            logger.warning("GoWinston rate limit reached")
            return {
                "success": False,
                "error": "Rate limit reached. Please try again shortly.",
                "score": None,
                "sources": [],
            }

        if response.status_code == 401:
            logger.error("GoWinston API key is invalid")
            return {
                "success": False,
                "error": "Invalid API key",
                "score": None,
                "sources": [],
            }

        if not response.ok:
            logger.error(f"GoWinston API error: {response.status_code} {response.text[:300]}")
            return {
                "success": False,
                "error": f"API error ({response.status_code})",
                "score": None,
                "sources": [],
            }

        data = response.json()
        logger.info(f"GoWinston response keys: {list(data.keys())}")

        result = data.get("result", {})
        score = result.get("score") if "score" in result else data.get("score", 0)
        sources = data.get("sources") or result.get("sources") or []

        return {
            "success": True,
            "score": score,
            "sources": sources,
            "credits_remaining": data.get("credits_remaining"),
            "raw": data,
        }

    except requests.exceptions.Timeout:
        logger.error("GoWinston API timed out")
        return {
            "success": False,
            "error": "Plagiarism check timed out (>120s)",
            "score": None,
            "sources": [],
        }
    except Exception as e:
        logger.error(f"GoWinston API failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "score": None,
            "sources": [],
        }
