"""
Ollama client for local Llama 3 inference.
Streams responses back for real-time chat UX.
"""
import os
import json
from typing import AsyncGenerator
import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "phi3:mini")


async def stream_llm_response(prompt: str) -> AsyncGenerator[str, None]:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": True,
        "options": {"temperature": 0.3, "top_p": 0.9}
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/generate", json=payload) as response:
            async for line in response.aiter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        token = data.get("response", "")
                        if token:
                            yield token
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue


async def complete_llm(prompt: str, max_tokens: int = 1024) -> str:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": max_tokens}
    }
    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
        data = response.json()
        return data.get("response", "")


def build_rag_prompt(question: str, context_chunks: list[str], kpi_summary: dict) -> str:
    context = "\n".join(f"- {c}" for c in context_chunks)
    return f"""You are an expert business intelligence analyst. Answer the user's business question based ONLY on the data provided below.
Be concise, specific, and actionable. Format numbers clearly. Do NOT make up data.

=== BUSINESS DATA CONTEXT ===
{context}

=== KEY METRICS ===
Total Revenue: ${kpi_summary.get('total_revenue', 0):,.0f}
Total Profit: ${kpi_summary.get('total_profit', 0):,.0f}
Avg Profit Margin: {kpi_summary.get('avg_profit_margin', 0):.1f}%

=== USER QUESTION ===
{question}

=== YOUR ANALYSIS ==="""


def build_report_prompt(kpis: dict) -> str:
    top = "\n".join(f"  - {p['product']}: ${p['revenue']:,.0f} revenue, {p['margin']:.1f}% margin"
                    for p in kpis.get("top_products", []))
    risks = "\n".join(f"  - {r['product']}: {r['reason']}" for r in kpis.get("risk_products", []))
    slow = "\n".join(f"  - {s['product']}: {s['inventory']:,} units stocked" for s in kpis.get("slow_moving", []))

    return f"""You are a senior business analyst. Generate a professional executive performance report based on the data below.

Structure your report with these sections:
1. Executive Summary (2-3 sentences)
2. Revenue & Profitability Analysis
3. Top Performing Products
4. Risk & Warning Areas
5. Inventory Concerns
6. Strategic Recommendations (3-5 actionable bullet points)
7. Outlook

=== BUSINESS METRICS ===
Total Revenue: ${kpis.get('total_revenue', 0):,.0f}
Total Cost: ${kpis.get('total_cost', 0):,.0f}
Total Profit: ${kpis.get('total_profit', 0):,.0f}
Average Margin: {kpis.get('avg_profit_margin', 0):.1f}%
Units Sold: {kpis.get('total_quantity', 0):,}

Top Products:
{top if top else "  No data"}

Risk Products:
{risks if risks else "  None identified"}

Slow-Moving Inventory:
{slow if slow else "  None identified"}

Write the report now in professional business language:"""


def build_scenario_prompt(simulation_result: dict) -> str:
    orig = simulation_result["original"]
    sim  = simulation_result["simulated"]
    delta_revenue = sim["total_revenue"] - orig["total_revenue"]
    delta_profit  = sim["total_profit"]  - orig["total_profit"]
    return f"""You are a pricing strategy consultant. A business wants to change the price of '{simulation_result["product"]}' by {simulation_result["price_change_pct"]:+.1f}%.

=== SIMULATION RESULTS ===
BEFORE:  Revenue ${orig['total_revenue']:,.0f} | Profit ${orig['total_profit']:,.0f} | Margin {orig['avg_margin']:.1f}%
AFTER:   Revenue ${sim['total_revenue']:,.0f} | Profit ${sim['total_profit']:,.0f} | Margin {sim['avg_margin']:.1f}%
CHANGE:  Revenue {delta_revenue:+,.0f} | Profit {delta_profit:+,.0f}

Overall business profit change: ${simulation_result['overall_simulated_profit'] - simulation_result['overall_original_profit']:+,.0f}

Provide a concise analysis (3-4 paragraphs):
1. Impact assessment
2. Risks of this price change
3. Opportunities
4. Recommendation (should they do it?)"""
