# Intelibot Scribe — Autonomous AI Research Agent 🎓🤖

**Intelibot Scribe** is a state-of-the-art governed, 16-stage autonomous AI research agent. It drives the complete scientific lifecycle—from initial hypothesis formulation and firewalled literature retrieval to sandboxed model training, iterative hyperparameter retuning, publication-grade LaTeX paper drafting, and live plagiarism verification.

---

## 🌟 Key Features

- **🛡️ Firewalled Literature Retrieval**: Queries Crossref & open academic APIs without untrusted instruction injection.
- **⚡ E2B Sandboxed Execution**: Runs machine learning code in isolated container environments with PyTorch CPU-only support (~200MB lightweight wheels).
- **📊 2-Step Data-Driven Model Selection**: Automatically queries Kaggle's search engine for the hottest relevant dataset, cleans & normalizes features via a 10-step preprocessor, and selects optimal ML models (`RandomForest`, `GradientBoosting`, `PyTorch`, `MLP`) based on dataset characteristics.
- **📄 PDF Writing Style Learning**: Upload 1–2 research PDFs to extract representative style samples; the writing agent mirrors your cadence, vocabulary, and paper tone.
- **🔍 GoWinston AI Plagiarism Verification**: Scans drafted LaTeX papers against 400B+ web and journal sources, rendering an interactive SVG originality gauge and source link breakdown.
- **📝 Publication-Grade LaTeX Engine**: Generates comprehensive 6-page research papers complete with mathematical formalizations, equations (`\begin{equation}`), and formatted empirical benchmark tables (`\begin{table}`).
- **🔄 Multi-Tier AI Model Fallback**: Features an automated 3-tier fallback matrix (`llama-3.3-70b-versatile` → `llama-3.1-8b-instant` → `gemini-2.5-flash`) ensuring 100% immunity to rate limits.

---

## 🏗️ Project Architecture

```
intelibot-scribe/
├── backend/
│   ├── main.py          # FastAPI application server
│   ├── sandbox.py       # E2B Sandbox interpreter & PyTorch installer
│   ├── plagiarism.py    # GoWinston AI plagiarism client
│   ├── database.py      # Local SQLite & state management
│   ├── supervisor.py    # Multi-step audit & evaluation supervisor
│   └── llm_engine.py    # Multi-tier Groq & Gemini LLM engine
├── src/
│   ├── routes/          # TanStack Router page components & stages
│   ├── lib/             # Pipeline server functions & AI orchestration
│   └── components/      # UI primitives & design system
├── public/              # Static assets & favicon
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ & npm / bun
- Python 3.10+
- E2B API Key ([e2b.dev](https://e2b.dev))
- Groq API Key ([groq.com](https://groq.com))
- GoWinston AI API Key ([gowinston.ai](https://gowinston.ai))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/atharv1909/intelibot-scribe.git
   cd intelibot-scribe
   ```

2. **Frontend Setup**:
   ```bash
   npm install
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1   # On Windows
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your API credentials:
   ```env
   GROQ_API_KEY=gsk_...
   E2B_API_KEY=e2b_...
   GOWINSTON_API_KEY=...
   SUPABASE_URL=...
   SUPABASE_PUBLISHABLE_KEY=...
   ```

### Running Locally

- **Start Backend**:
  ```bash
  cd backend
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```

- **Start Frontend**:
  ```bash
  npm run dev
  ```
  Open **[http://localhost:8080](http://localhost:8080)** in your browser!

---

## 📜 License

Licensed under the MIT License.
