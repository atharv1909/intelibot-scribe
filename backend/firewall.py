import os
import re
import numpy as np
import logging

logger = logging.getLogger(__name__)

_model = None

# --- Pure-Python / numpy MurmurHash3 (x86_32, seed=0) ---
# Bit-for-bit equivalent to sklearn's HashingVectorizer(n_features=384, norm='l2')
# with default alternate_sign=True. Reimplemented so we don't need to bundle
# scikit-learn + scipy (~200MB) into the serverless function just for this.
_TOKEN_PATTERN = re.compile(r"(?u)\b\w\w+\b")


def _murmurhash3_32(key: bytes, seed: int = 0) -> int:
    c1 = 0xcc9e2d51
    c2 = 0x1b873593
    length = len(key)
    h1 = seed
    rounded_end = (length // 4) * 4
    for i in range(0, rounded_end, 4):
        k1 = (key[i] & 0xff) | ((key[i + 1] & 0xff) << 8) | ((key[i + 2] & 0xff) << 16) | ((key[i + 3] & 0xff) << 24)
        k1 = (k1 * c1) & 0xFFFFFFFF
        k1 = ((k1 << 15) | (k1 >> 17)) & 0xFFFFFFFF
        k1 = (k1 * c2) & 0xFFFFFFFF
        h1 ^= k1
        h1 = ((h1 << 13) | (h1 >> 19)) & 0xFFFFFFFF
        h1 = (h1 * 5 + 0xe6546b64) & 0xFFFFFFFF
    k1 = 0
    val = length & 0x03
    tail_index = rounded_end
    if val == 3:
        k1 = (key[tail_index + 2] & 0xff) << 16
    if val in (3, 2):
        k1 |= (key[tail_index + 1] & 0xff) << 8
    if val in (3, 2, 1):
        k1 |= (key[tail_index] & 0xff)
        k1 = (k1 * c1) & 0xFFFFFFFF
        k1 = ((k1 << 15) | (k1 >> 17)) & 0xFFFFFFFF
        k1 = (k1 * c2) & 0xFFFFFFFF
        h1 ^= k1
    h1 ^= length
    h1 ^= (h1 >> 16)
    h1 = (h1 * 0x85ebca6b) & 0xFFFFFFFF
    h1 ^= (h1 >> 13)
    h1 = (h1 * 0xc2b2ae35) & 0xFFFFFFFF
    h1 ^= (h1 >> 16)
    if h1 >= 0x80000000:
        h1 -= 0x100000000
    return h1


def _hashing_vectorize(text: str, n_features: int = 384) -> np.ndarray:
    tokens = _TOKEN_PATTERN.findall(text.lower())
    vec = np.zeros(n_features, dtype=np.float64)
    for tok in tokens:
        h = _murmurhash3_32(tok.encode("utf-8"), 0)
        idx = abs(h) % n_features
        sign = 1.0 if h >= 0 else -1.0
        vec[idx] += sign
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.astype(np.float32)


def get_model():
    """Loads the native XGBoost Booster (no scikit-learn wrapper required)."""
    global _model
    if _model is not None:
        return _model

    import xgboost as xgb

    model_path = os.path.join(os.path.dirname(__file__), "embedding_xgboost.json")
    if not os.path.exists(model_path):
        model_path = os.path.join(os.path.dirname(__file__), "..", "embedding_xgboost.json")

    if os.path.exists(model_path):
        try:
            booster = xgb.Booster()
            booster.load_model(model_path)
            _model = booster
            logger.info("Loaded XGBoost Prompt Security Model successfully.")
            return _model
        except Exception as e:
            logger.warning(f"Failed to load XGBoost model from {model_path}: {e}")
    return None


def text_to_384_features(text: str) -> np.ndarray:
    """
    Generates a 384-dimensional feature embedding vector for the prompt text.
    Uses sentence-transformers / MiniLM embedding if available, otherwise a
    384-d hashing vector (bit-for-bit equivalent to sklearn's HashingVectorizer).
    """
    try:
        from sentence_transformers import SentenceTransformer
        embedder = SentenceTransformer("all-MiniLM-L6-v2")
        vec = embedder.encode(text)
        return np.array(vec, dtype=np.float32).reshape(1, -1)
    except Exception:
        return _hashing_vectorize(text, n_features=384).reshape(1, -1)

def is_prompt_safe(prompt: str) -> dict:
    """
    Evaluates prompt safety using the XGBoost security classifier model.
    Returns: {"safe": bool, "score": float, "reason": str}
    """
    if not prompt or not prompt.strip():
        return {"safe": True, "score": 0.0, "reason": "Empty prompt"}

    # 1. Quick heuristic keywords for prompt injection / system override
    malicious_patterns = [
        r"ignore previous instructions",
        r"bypass security firewall",
        r"drop all tables",
        r"exec\s*\(\s*['\"]import os",
        r"rm -rf /",
    ]
    for pattern in malicious_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            return {
                "safe": False,
                "score": 0.99,
                "reason": "Malicious pattern matched security policy rules.",
            }

    # 2. XGBoost Model Evaluation
    model = get_model()
    if model is not None:
        try:
            features = text_to_384_features(prompt)
            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(features)
                malicious_score = float(probs[0][1]) if probs.shape[1] > 1 else float(probs[0][0])
            else:
                preds = model.predict(features)
                malicious_score = float(preds[0])

            is_safe = malicious_score < 0.5
            return {
                "safe": is_safe,
                "score": malicious_score,
                "reason": "Passed XGBoost prompt security model" if is_safe else "Blocked by XGBoost prompt security model",
            }
        except Exception as e:
            logger.warning(f"XGBoost evaluation error: {e}")

    return {"safe": True, "score": 0.0, "reason": "Passed default security checks"}
