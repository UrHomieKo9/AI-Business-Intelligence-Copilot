from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Dataset(Base):
    __tablename__ = "datasets"
    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename         = Column(String, nullable=False)
    upload_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    row_count        = Column(Integer)
    owner            = relationship("User", back_populates="datasets")
    kpis             = relationship("KPI", back_populates="dataset", uselist=False)


class KPI(Base):
    __tablename__ = "kpis"
    id                    = Column(Integer, primary_key=True, index=True)
    dataset_id            = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    total_revenue         = Column(Float)
    total_cost            = Column(Float)
    total_profit          = Column(Float)
    avg_profit_margin     = Column(Float)
    total_quantity        = Column(Integer)
    top_products          = Column(JSON)   # [{name, revenue, margin}]
    slow_moving           = Column(JSON)   # [{name, inventory, qty_sold}]
    risk_products         = Column(JSON)   # [{name, reason}]
    monthly_summary       = Column(JSON)   # [{month, revenue, profit}]
    computed_at           = Column(DateTime(timezone=True), server_default=func.now())
    dataset               = relationship("Dataset", back_populates="kpis")


class Scenario(Base):
    __tablename__ = "scenarios"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id      = Column(Integer, ForeignKey("datasets.id"))
    simulation_input= Column(JSON)   # {product, price_change_pct, ...}
    result_metrics  = Column(JSON)   # computed results
    ai_explanation  = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    owner           = relationship("User", back_populates="scenarios")
