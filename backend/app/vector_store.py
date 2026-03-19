"""
Vector store service using ChromaDB + sentence-transformers for local embeddings.
No API keys needed — fully local. ChromaDB persists automatically to disk.
"""
import os
from pathlib import Path
from typing import List

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

VECTOR_STORE_DIR = Path(os.getenv("VECTOR_STORE_DIR", "/data/vectors"))
VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)

_model: SentenceTransformer = None
_chroma_client: chromadb.Client = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")  # ~22MB, fast local model
    return _model


def get_chroma_client() -> chromadb.Client:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=str(VECTOR_STORE_DIR),
            settings=Settings(anonymized_telemetry=False),
        )
    return _chroma_client


def _collection_name(dataset_id: int) -> str:
    return f"dataset_{dataset_id}"


def kpi_to_text_chunks(kpis: dict, dataset_id: int) -> List[str]:
    """Convert KPI dict into natural language chunks for embedding."""
    chunks = []
    chunks.append(
        f"Dataset {dataset_id} overall performance: "
        f"Total revenue ${kpis['total_revenue']:,.0f}, "
        f"total profit ${kpis['total_profit']:,.0f}, "
        f"average profit margin {kpis['avg_profit_margin']:.1f}%, "
        f"total units sold {kpis['total_quantity']:,}."
    )
    for p in kpis.get("top_products", []):
        chunks.append(
            f"Product '{p['product']}' generated ${p['revenue']:,.0f} revenue "
            f"with {p['margin']:.1f}% margin and {p['quantity']:,} units sold."
        )
    for p in kpis.get("slow_moving", []):
        chunks.append(
            f"Slow-moving inventory alert: '{p['product']}' has {p['inventory']:,} units in stock "
            f"but only sold {p['qty_sold']:,} units."
        )
    for p in kpis.get("risk_products", []):
        chunks.append(
            f"Risk alert for product '{p['product']}': {p['reason']}."
        )
    for m in kpis.get("monthly_summary", []):
        chunks.append(
            f"Month {m['month']}: revenue ${m['revenue']:,.0f}, profit ${m['profit']:,.0f}."
        )
    return chunks


def build_vector_store(dataset_id: int, kpis: dict) -> None:
    model  = get_embedding_model()
    client = get_chroma_client()
    chunks = kpi_to_text_chunks(kpis, dataset_id)

    # Delete existing collection for this dataset (re-upload case)
    try:
        client.delete_collection(_collection_name(dataset_id))
    except Exception:
        pass

    collection = client.create_collection(
        name=_collection_name(dataset_id),
        metadata={"hnsw:space": "cosine"},
    )

    embeddings = model.encode(chunks, normalize_embeddings=True).tolist()

    collection.add(
        ids=[f"chunk_{i}" for i in range(len(chunks))],
        embeddings=embeddings,
        documents=chunks,
    )


def retrieve_relevant_chunks(dataset_id: int, query: str, top_k: int = 5) -> List[str]:
    client = get_chroma_client()

    try:
        collection = client.get_collection(_collection_name(dataset_id))
    except Exception:
        return []  # Collection doesn't exist yet

    model     = get_embedding_model()
    query_vec = model.encode([query], normalize_embeddings=True).tolist()

    results = collection.query(
        query_embeddings=query_vec,
        n_results=min(top_k, collection.count()),
    )

    return results["documents"][0] if results["documents"] else []
