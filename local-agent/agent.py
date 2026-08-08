from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import tempfile
import os
import sys

app = FastAPI(title="Intelibot Local Execution Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    code: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "python": sys.executable
    }


@app.post("/run")
@app.post("/")
def run_code(request: RunRequest):
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "main.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(request.code)

        try:
            result = subprocess.run(
                [sys.executable, file_path],
                capture_output=True,
                text=True,
                timeout=180,
                cwd=temp_dir
            )

            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": "Execution timed out after 180 seconds.",
                "exit_code": -1
            }


if __name__ == "__main__":
    import uvicorn
    print("Starting Intelibot Local Execution Agent on http://127.0.0.1:8765 ...")
    uvicorn.run(app, host="127.0.0.1", port=8765)
