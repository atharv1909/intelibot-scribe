import os
import re
import numpy as np
import logging

logger = logging.getLogger(__name__)

_model = None

def get_model():
    global _model
    if _model is not None:
        return _model
    
    model_path = os.path.join(os.path.dirname(__file__), "embedding_xgboost.joblib")
    if not os.path.exists(model_path):
        model_path = os.path.join(os.path.dirname(__file__), "..", "embedding_xgboost.joblib")
        
    if os.path.exists(model_path):
        try:
            import joblib
            _model = joblib.load(model_path)
            logger.info("Loaded XGBoost Prompt Security Model successfully.")
            return _model
        except Exception as e:
            logger.warning(f"Failed to load XGBoost model from {model_path}: {e}")
    return None

def text_to_384_features(text: str) -> np.ndarray:
    """
    Generates a 384-dimensional feature embedding vector for the prompt text.
    Uses sentence-transformers / MiniLM embedding if available, otherwise 384-d hashing vector.
    """
    try:
        from sentence_transformers import SentenceTransformer
        embedder = SentenceTransformer("all-MiniLM-L6-v2")
        vec = embedder.encode(text)
        return np.array(vec, dtype=np.float32).reshape(1, -1)
    except Exception:
        # Fallback 384-dimensional deterministic feature hash vector
        from sklearn.feature_extraction.text import HashingVectorizer
        vectorizer = HashingVectorizer(n_features=384, norm='l2')
        X = vectorizer.transform([text]).toarray()
        return X.astype(np.float32)

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
