"""
KPI Engine - deterministic, no LLM involved.
Expected CSV columns: Product, Date, Revenue, Cost, Quantity, Inventory
"""
import pandas as pd
import numpy as np
from typing import Any, Dict


REQUIRED_COLUMNS = {"Product", "Date", "Revenue", "Cost", "Quantity", "Inventory"}


def validate_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    df = df.copy()
    df.columns = [c.strip().title() for c in df.columns]
    df["Date"] = pd.to_datetime(df["Date"], infer_datetime_format=True)
    for col in ["Revenue", "Cost", "Quantity", "Inventory"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    df["Profit"] = df["Revenue"] - df["Cost"]
    df["Margin"] = np.where(df["Revenue"] > 0, df["Profit"] / df["Revenue"] * 100, 0)
    return df


def compute_kpis(df: pd.DataFrame) -> Dict[str, Any]:
    total_revenue     = round(df["Revenue"].sum(), 2)
    total_cost        = round(df["Cost"].sum(), 2)
    total_profit      = round(df["Profit"].sum(), 2)
    avg_margin        = round(df["Margin"].mean(), 2)
    total_quantity    = int(df["Quantity"].sum())

    # Top products by revenue
    prod_grp = df.groupby("Product").agg(
        Revenue=("Revenue", "sum"),
        Profit=("Profit", "sum"),
        Quantity=("Quantity", "sum"),
        Inventory=("Inventory", "last"),
    ).reset_index()
    prod_grp["Margin"] = np.where(
        prod_grp["Revenue"] > 0,
        prod_grp["Profit"] / prod_grp["Revenue"] * 100, 0
    ).round(2)

    top_products = (
        prod_grp.sort_values("Revenue", ascending=False)
        .head(5)
        .rename(columns=str.lower)
        .to_dict(orient="records")
    )

    # Slow-moving: high inventory but low quantity sold
    slow_moving = (
        prod_grp[prod_grp["Inventory"] > prod_grp["Quantity"] * 2]
        .sort_values("Inventory", ascending=False)
        .head(5)
        [["Product", "Inventory", "Quantity"]]
        .rename(columns={"Product": "product", "Inventory": "inventory", "Quantity": "qty_sold"})
        .to_dict(orient="records")
    )

    # Risk products: margin < 10% or negative profit
    risk_products = []
    for _, row in prod_grp.iterrows():
        if row["Profit"] < 0:
            risk_products.append({"product": row["Product"], "reason": "Negative profit"})
        elif row["Margin"] < 10:
            risk_products.append({"product": row["Product"], "reason": f"Low margin ({row['Margin']:.1f}%)"})

    # Monthly summary
    df["Month"] = df["Date"].dt.to_period("M").astype(str)
    monthly = (
        df.groupby("Month")
        .agg(Revenue=("Revenue", "sum"), Profit=("Profit", "sum"))
        .reset_index()
        .sort_values("Month")
        .rename(columns=str.lower)
        .to_dict(orient="records")
    )
    for m in monthly:
        m["revenue"] = round(m["revenue"], 2)
        m["profit"]  = round(m["profit"], 2)

    return {
        "total_revenue":     total_revenue,
        "total_cost":        total_cost,
        "total_profit":      total_profit,
        "avg_profit_margin": avg_margin,
        "total_quantity":    total_quantity,
        "top_products":      top_products,
        "slow_moving":       slow_moving,
        "risk_products":     risk_products,
        "monthly_summary":   monthly,
    }


def simulate_price_change(df: pd.DataFrame, product: str, price_change_pct: float) -> Dict[str, Any]:
    """Recalculate margins if a product's price changes by price_change_pct%"""
    df_sim = df.copy()
    mask = df_sim["Product"].str.lower() == product.lower()
    if not mask.any():
        raise ValueError(f"Product '{product}' not found in dataset")

    df_sim.loc[mask, "Revenue"] = df_sim.loc[mask, "Revenue"] * (1 + price_change_pct / 100)
    df_sim["Profit"] = df_sim["Revenue"] - df_sim["Cost"]
    df_sim["Margin"] = np.where(df_sim["Revenue"] > 0, df_sim["Profit"] / df_sim["Revenue"] * 100, 0)

    original_product_stats = df[mask][["Revenue", "Profit", "Margin"]].agg(["sum", "mean"]).to_dict()
    simulated_product_stats = df_sim[mask][["Revenue", "Profit", "Margin"]].agg(["sum", "mean"]).to_dict()

    return {
        "product": product,
        "price_change_pct": price_change_pct,
        "original": {
            "total_revenue": round(df[mask]["Revenue"].sum(), 2),
            "total_profit":  round(df[mask]["Profit"].sum(), 2),
            "avg_margin":    round(df[mask]["Margin"].mean(), 2),
        },
        "simulated": {
            "total_revenue": round(df_sim[mask]["Revenue"].sum(), 2),
            "total_profit":  round(df_sim[mask]["Profit"].sum(), 2),
            "avg_margin":    round(df_sim[mask]["Margin"].mean(), 2),
        },
        "overall_original_profit":  round(df["Profit"].sum(), 2),
        "overall_simulated_profit": round(df_sim["Profit"].sum(), 2),
    }
