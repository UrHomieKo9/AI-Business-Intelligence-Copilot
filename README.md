# 🏆 AI Business Intelligence Copilot
### Cloud-Native GenAI SaaS Platform | FastAPI + React + Llama 3 + K8s

> Turn raw CSV business data into executive-level AI insights — zero BI tools required.

---

## 🚀 Quick Start (Local — Zero Cost)

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM (for Llama 3 model)

```bash
# 1. Clone and enter project
cd ai-biz-copilot

# 2. Start everything (first run pulls Llama 3 — takes ~5 mins)
docker-compose up -d

# 3. Open the app
open http://localhost:3000

# 4. API docs
open http://localhost:8000/api/docs
```

**First run note:** Ollama will automatically pull `llama3` (~4.7GB). Wait ~5 minutes on first start.

---

## 🏗 Architecture

```
Browser → React (3000) → FastAPI (8000) → PostgreSQL
                                        → ChromaDB Vector Store
                                        → Ollama/Llama3 (11434) [can be subjective with different models]
```

### Tech Stack
| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React + Vite | Fast SPA, streaming responses |
| Backend | FastAPI | Async Python, auto API docs |
| KPI Engine | Pandas | Deterministic, fast analytics |
| Vector Store | FAISS + sentence-transformers | Local, no API key needed |
| LLM | Llama 3 via Ollama | Free local inference |
| DB | PostgreSQL | Structured metrics storage |
| Cloud | AKS (Azure) | Free student credits |

---

## 📊 Features

### 1. CSV Upload & KPI Engine
Upload CSV with columns: `Product, Date, Revenue, Cost, Quantity, Inventory`

Auto-computed KPIs:
- Total revenue, cost, profit
- Average profit margin
- Top performing products
- Slow-moving inventory detection
- Risk product identification
- Monthly trend analysis

### 2. AI Chat (RAG)
Ask natural language questions about your data:
- *"Why did profits drop in March?"*
- *"Which product is hurting margins?"*
- *"What inventory is at risk?"*

Uses Retrieval-Augmented Generation — grounded in your actual data, no hallucinations.

### 3. Executive Report
One-click AI-generated report with:
- Executive summary
- Revenue & profitability analysis
- Risk areas
- Strategic recommendations

### 4. Scenario Simulation
*"What if I increase Product A's price by 10%?"*

System recalculates margins deterministically, then uses AI to explain business impact.

---

## 📁 Project Structure

```
ai-biz-copilot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── api/                 # Route handlers
│   │   │   ├── auth.py          # JWT auth
│   │   │   ├── upload.py        # CSV upload
│   │   │   ├── kpi.py           # KPI retrieval
│   │   │   ├── chat.py          # RAG streaming chat
│   │   │   ├── report.py        # Report generation
│   │   │   └── scenario.py      # Price simulation
│   │   ├── core/
│   │   │   ├── database.py      # SQLAlchemy setup
│   │   │   └── security.py      # JWT + password hashing
│   │   ├── models/              # SQLAlchemy models
│   │   └── services/
│   │       ├── kpi_engine.py    # Pandas KPI computation
│   │       ├── vector_store.py  # FAISS embeddings
│   │       └── llm_service.py   # Ollama client + prompts
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Full SaaS UI
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── k8s/
│   ├── 00-namespace-secrets.yaml
│   ├── 01-pvcs.yaml
│   ├── 02-postgres.yaml
│   ├── 03-ollama.yaml
│   ├── 04-app-deployments.yaml
│   └── 05-ingress.yaml
├── docker-compose.yml           # Local dev
├── deploy-azure.sh              # One-command AKS deploy
└── sample_data.csv              # Test data
```

---

## ☁️ Azure Deployment (Free with Student Credits)

```bash
# Install Azure CLI first: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
chmod +x deploy-azure.sh
./deploy-azure.sh
```

**Cost breakdown with Azure for Students ($100 credit):**
- AKS control plane: **FREE**
- 2x Standard_D2s_v3 nodes: ~$140/mo (covered by credit)
- Azure Container Registry Basic: ~$5/mo
- Storage: ~$2/mo
- **Total: ~$147/mo → $0 with student credits**

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| POST | `/api/upload/csv` | Upload CSV + compute KPIs |
| GET | `/api/kpi/{dataset_id}` | Get KPI data |
| POST | `/api/chat/stream` | Streaming RAG chat |
| POST | `/api/report/{dataset_id}` | Generate executive report |
| POST | `/api/scenario/simulate` | Price scenario simulation |

Full interactive docs: `http://localhost:8000/api/docs`

---

## 🧠 What This Demonstrates

- ✅ **GenAI application design** — RAG architecture end-to-end
- ✅ **Retrieval-Augmented Generation** — FAISS + sentence-transformers
- ✅ **Structured + unstructured data integration** — Postgres + vector store
- ✅ **SaaS system design** — Multi-user, JWT auth, dataset isolation
- ✅ **REST API architecture** — FastAPI with proper schemas
- ✅ **Containerization** — Multi-stage Docker builds
- ✅ **Kubernetes orchestration** — Deployments, Services, Ingress, PVCs
- ✅ **Azure cloud deployment** — AKS with ACR
- ✅ **LLM prompt engineering** — RAG, report, and scenario prompts
- ✅ **Business problem solving** — Real SMB analytics use case
