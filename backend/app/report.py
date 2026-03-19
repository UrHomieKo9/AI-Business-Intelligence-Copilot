from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import Dataset, KPI
from app.services.llm_service import complete_llm, build_report_prompt

router = APIRouter()

@router.post("/{dataset_id}")
async def generate_report(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.user_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    kpi = db.query(KPI).filter(KPI.dataset_id == dataset_id).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPIs not found")

    kpi_dict = {
        "total_revenue":     kpi.total_revenue,
        "total_cost":        kpi.total_cost,
        "total_profit":      kpi.total_profit,
        "avg_profit_margin": kpi.avg_profit_margin,
        "total_quantity":    kpi.total_quantity,
        "top_products":      kpi.top_products or [],
        "slow_moving":       kpi.slow_moving or [],
        "risk_products":     kpi.risk_products or [],
        "monthly_summary":   kpi.monthly_summary or [],
    }

    prompt = build_report_prompt(kpi_dict)
    report_text = await complete_llm(prompt, max_tokens=2048)

    return {
        "dataset_id": dataset_id,
        "filename": dataset.filename,
        "report": report_text,
        "kpis": kpi_dict,
    }
