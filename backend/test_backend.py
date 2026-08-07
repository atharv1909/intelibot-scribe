import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.llm_engine import call_llm
from backend.sandbox import run_code_in_sandbox

def test_llm():
    print("Testing LLM...")
    res = call_llm("What is 2+2? Reply with just the number.", require_json=False)
    print(f"LLM Response: {res}")

def test_sandbox():
    print("Testing E2B Sandbox...")
    code = """
import sys
print('Hello from sandbox!')
print(f'Python version: {sys.version}')
"""
    res = run_code_in_sandbox(code)
    print("Sandbox output:")
    print(res['stdout'])

if __name__ == "__main__":
    test_llm()
    test_sandbox()
