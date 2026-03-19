from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import Dataset, KPI
from app.services.vector_store import retrieve_relevant_chunks
from app.services.llm_service import stream_llm_response, build_rag_prompt

router = APIRouter()

class ChatRequest(BaseModel):
    dataset_id: int
    question: str

@router.post("/stream")
async def chat_stream(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == req.dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    kpi = db.query(KPI).filter(KPI.dataset_id == req.dataset_id).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPIs not found")

    kpi_summary = {
        "total_revenue": kpi.total_revenue,
        "total_profit": kpi.total_profit,
        "avg_profit_margin": kpi.avg_profit_margin,
    }

    # Retrieve relevant chunks from vector store
    context_chunks = retrieve_relevant_chunks(req.dataset_id, req.question, top_k=6)

    # Fallback context from DB if no vector store
    if not context_chunks:
        context_chunks = [
            f"Total revenue: ${kpi.total_revenue:,.0f}",
            f"Total profit: ${kpi.total_profit:,.0f}",
            f"Average margin: {kpi.avg_profit_margin:.1f}%",
        ]
        for p in (kpi.top_products or []):
            context_chunks.append(f"Product {p['product']}: ${p['revenue']:,.0f} revenue, {p['margin']:.1f}% margin")

    prompt = build_rag_prompt(req.question, context_chunks, kpi_summary)

    async def generate():
        async for token in stream_llm_response(prompt):
            yield token

    return StreamingResponse(generate(), media_type="text/plain")
