# DevPilot

Local-first AI developer assistant. Analyze your codebase, chat with an LLM that understands your project, search with vector (RAG) indexing, and get AI code reviews — all running on your machine.

## Features

- **Project Analysis** — drag & drop or browse a folder. Instant stats (files, lines, functions, classes) with per-language breakdown.
- **AI Chat with RAG** — ask questions about your code. ChromaDB indexes your project and retrieves relevant snippets as context for the LLM, with inline source citations.
- **Tool-calling** — the LLM can read files, search code, and explore your project structure automatically during conversations.
- **File Viewer & Editor** — syntax highlighting (18 languages), inline editing with Ctrl+E, Ctrl+F search, Ctrl+S save. Auto-reindexes RAG on save.
- **Code Review** — AI reviews your entire project for bugs, security issues, performance problems, and maintainability concerns.
- **Documentation Generator** — generate project documentation and README files with AI.
- **Project Sharing** — create a shareable link with analysis + file tree for code reviews.
- **Multi-session Chat** — create, rename, and switch between chat sessions per project. History persists in SQLite.
- **Health Dashboard** — monitor Ollama/Groq connectivity, ChromaDB status, storage, uptime. Prometheus metrics at `/metrics`.
- **Keyboard Shortcuts** — press `?` anywhere for the full list (Ctrl+K, Ctrl+F, Ctrl+E, Ctrl+S...).

## Architecture

```
frontend (React + Vite + Tailwind)
       │  /api/v1/*  (JWT auth)
       ▼
   nginx (SPA + reverse proxy)
       │
backend (FastAPI + Python 3.12)
   ├── LLM Providers: Ollama (local) / Groq (cloud)
   ├── RAG: ChromaDB (vector search)
   ├── DB: SQLite (users, shares, settings, messages)
   └── Auth: JWT (pyjwt + bcrypt)
```

## Quick Start

### Prerequisites
- [Ollama](https://ollama.com) installed and running (`ollama serve`)
- At least one model pulled: `ollama pull qwen2.5-coder:7b`
- Python 3.11+ and Node.js 22+

### Option 1 — Docker (recommended)

```bash
# Optional: set Groq API key for cloud LLM
cp .env.example backend/.env
# Edit backend/.env with your keys

docker compose up
# First run: Ollama auto-pulls qwen2.5-coder:7b (~4.7 GB, takes a few minutes)
# Open http://localhost:3000
# Login: admin / admin
```

With NVIDIA GPU (optional, much faster inference):
```yaml
# Uncomment the deploy.resources block in docker-compose.yml
# Then:
docker compose up
```

### Option 2 — Local dev

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Unix
pip install -r requirements.txt
uvicorn app.main:app --reload

# In another terminal:
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

## API

All endpoints under `/api/v1` (JWT required except `/health`, `/health/detailed`, `/metrics`, `/shared/{token}`).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Get JWT token |
| GET | `/api/v1/settings` | Current settings |
| PUT | `/api/v1/settings` | Update settings |
| POST | `/api/v1/project/analyze` | Analyze project stats |
| POST | `/api/v1/project/question-stream` | Streaming Q&A (RAG) |
| POST | `/api/v1/chat/tool-stream` | Chat with tool-calling |
| POST | `/api/v1/project/code-review` | AI code review |
| POST | `/api/v1/project/share` | Create share link |
| GET | `/health/detailed` | Full service health |
| GET | `/metrics` | Prometheus metrics |

Full Swagger docs: `http://localhost:8000/docs`

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `OLLAMA_MODEL` | `qwen2.5-coder:7b` | Ollama model name |
| `GROQ_API_KEY` | — | Groq API key (cloud LLM) |
| `GROQ_MODEL` | `fast` | Groq model tier |
| `JWT_SECRET` | `devpilot-local-secret` | JWT signing key |
| `DATABASE_URL` | `sqlite:///.memory/devpilot.db` | DB connection |
| `CORS_ORIGINS` | `localhost:3000,5173` | Allowed origins |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.12, SQLAlchemy, SQLite |
| LLM | Ollama, Groq |
| Vector DB | ChromaDB |
| Auth | JWT (pyjwt), bcrypt (passlib) |
| Rate limiting | slowapi |
| Metrics | prometheus-client |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Deploy | Docker Compose, nginx, GitHub Actions CI |

## License

MIT
