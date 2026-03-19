from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import engine, Base
from app.api import upload, kpi, chat, report, scenario, auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="AI Business Intelligence Copilot",
    description="GenAI SaaS platform for SMB analytics",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/auth",     tags=["auth"])
app.include_router(upload.router,   prefix="/api/upload",   tags=["upload"])
app.include_router(kpi.router,      prefix="/api/kpi",      tags=["kpi"])
app.include_router(chat.router,     prefix="/api/chat",     tags=["chat"])
app.include_router(report.router,   prefix="/api/report",   tags=["report"])
app.include_router(scenario.router, prefix="/api/scenario", tags=["scenario"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "AI Biz Copilot"}
