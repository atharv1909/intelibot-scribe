import sys
import os

# Add backend directory to sys.path for Vercel serverless environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from backend.main import app
