import io
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import Dataset, KPI
from app.services.kpi_engine import validate_and_clean, compute_kpis
from app.services.vector_store import build_vector_store

router = APIRouter()

@router.post("/csv")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    content = await file.read()
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")

    try:
        df = validate_and_clean(df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Save dataset record
    dataset = Dataset(user_id=current_user.id, filename=file.filename, row_count=len(df))
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Compute KPIs
    kpi_data = compute_kpis(df)

    # Store KPIs in DB
    kpi_record = KPI(dataset_id=dataset.id, **kpi_data)
    db.add(kpi_record)
    db.commit()

    # Build vector store for RAG
    try:
        build_vector_store(dataset.id, kpi_data)
    except Exception as e:
        # Non-fatal: RAG will fall back to structured data
        pass

    return {
        "dataset_id": dataset.id,
        "filename": file.filename,
        "row_count": len(df),
        "kpis": kpi_data,
        "message": "Data uploaded and KPIs computed successfully",
    }


@router.get("/datasets")
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "upload_timestamp": d.upload_timestamp,
            "row_count": d.row_count,
        }
        for d in datasets
    ]
