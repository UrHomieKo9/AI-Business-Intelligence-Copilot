import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import Dataset, KPI, Scenario
from app.services.kpi_engine import validate_and_clean, simulate_price_change
from app.services.llm_service import complete_llm, build_scenario_prompt

router = APIRouter()

class ScenarioRequest(BaseModel):
    dataset_id: int
    product: str
    price_change_pct: float  # e.g. +10.0 or -5.0

@router.post("/simulate")
async def simulate(
    req: ScenarioRequest,
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

    # Reconstruct a minimal dataframe from stored KPI data for simulation
    # In a full implementation, you'd store raw CSV or re-fetch it
    # Here we reconstruct synthetic rows from top_products for demo purposes
    top_products = kpi.top_products or []
    if not top_products:
        raise HTTPException(status_code=400, detail="No product data available for simulation")

    rows = []
    for p in top_products:
        qty = max(p.get("quantity", 1), 1)
        rev_per_unit = p["revenue"] / qty
        cost_per_unit = rev_per_unit * (1 - p["margin"] / 100)
        rows.append({
            "Product": p["product"],
            "Date": "2024-01-01",
            "Revenue": p["revenue"],
            "Cost": p["revenue"] * (1 - p["margin"] / 100),
            "Quantity": qty,
            "Inventory": qty,
        })

    df = pd.DataFrame(rows)
    df = validate_and_clean(df)

    try:
        sim_result = simulate_price_change(df, req.product, req.price_change_pct)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Get LLM explanation
    prompt = build_scenario_prompt(sim_result)
    explanation = await complete_llm(prompt, max_tokens=512)

    # Save scenario
    scenario = Scenario(
        user_id=current_user.id,
        dataset_id=req.dataset_id,
        simulation_input={"product": req.product, "price_change_pct": req.price_change_pct},
        result_metrics=sim_result,
        ai_explanation=explanation,
    )
    db.add(scenario)
    db.commit()

    return {
        "simulation": sim_result,
        "ai_explanation": explanation,
    }


@router.get("/history")
def scenario_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenarios = db.query(Scenario).filter(Scenario.user_id == current_user.id).all()
    return [
        {
            "id": s.id,
            "input": s.simulation_input,
            "result": s.result_metrics,
            "explanation": s.ai_explanation,
            "created_at": s.created_at,
        }
        for s in scenarios
    ]
