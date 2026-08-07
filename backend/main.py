from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
from pydantic import BaseModel

from database import init_db, get_connection
from supervisor import SupervisorAgent
from plagiarism import check_plagiarism

app = FastAPI(title="Intelibot Scribe Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

class ExecuteRequest(BaseModel):
    project_id: str
    user_id: str
    code: str
    config: dict
    label: str = "baseline"
    architecture_change: bool = False

class PlagiarismRequest(BaseModel):
    text: str

@app.post("/api/execute")
async def execute_code(req: ExecuteRequest):
    agent = SupervisorAgent(req.project_id, req.user_id)
    result = agent.execute_and_evaluate(
        code=req.code,
        config=req.config,
        label=req.label,
        architecture_change=req.architecture_change
    )
    return {"status": "success", "data": result}

@app.post("/api/plagiarism")
async def plagiarism_check(req: PlagiarismRequest):
    """Run plagiarism detection via GoWinston AI."""
    result = check_plagiarism(req.text)
    return {"status": "success" if result["success"] else "error", "data": result}

@app.post("/api/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """Extract representative writing style lines from an uploaded PDF."""
    import fitz  # PyMuPDF
    
    contents = await file.read()
    try:
        import fitz
        doc = fitz.open(stream=contents, filetype="pdf")
        all_lines = []
        for page in doc:
            text = page.get_text()
            lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 40]
            all_lines.extend(lines)
        doc.close()
    except Exception:
        import io
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(contents))
        all_lines = []
        for page in reader.pages:
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 40]
            all_lines.extend(lines)
    
    # Sample ~30-40 representative lines evenly from the document
    total = len(all_lines)
    if total <= 40:
        sample = all_lines
    else:
        step = total / 40
        sample = [all_lines[int(i * step)] for i in range(40)]
    
    return {
        "status": "success",
        "data": {
            "filename": file.filename,
            "total_lines": total,
            "sample_lines": sample,
            "style_text": "\n".join(sample),
        }
    }

@app.websocket("/api/ws/trace/{project_id}")
async def trace_websocket(websocket: WebSocket, project_id: str):
    await websocket.accept()
    conn = get_connection()
    c = conn.cursor()
    last_id = 0
    
    try:
        while True:
            # Poll for new audit logs
            c.execute("SELECT id, stage, event, actor, severity, detail FROM audit_logs WHERE project_id = ? AND id > ? ORDER BY id ASC", (project_id, last_id))
            rows = c.fetchall()
            
            for row in rows:
                last_id = row['id']
                await websocket.send_json({
                    "id": row['id'],
                    "stage": row['stage'],
                    "event": row['event'],
                    "actor": row['actor'],
                    "severity": row['severity'],
                    "detail": row['detail']
                })
                
            await asyncio.sleep(1) # Simple polling loop for demonstration
    except Exception as e:
        print(f"WebSocket closed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

