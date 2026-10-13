"""Hybrid retrieval combining dense and sparse search."""
from typing import List, Optional, Dict, Any
import numpy as np
from .vector_retriever import VectorRetriever, RetrievalResult
from .bm25_retriever import BM25Retriever


class HybridRetriever:
    """Combine dense and sparse retrieval with reciprocal rank fusion."""
    
    def __init__(
        self,
        vector_retriever: VectorRetriever,
        bm25_retriever: BM25Retriever,
        dense_weight: float = 0.7,
        sparse_weight: float = 0.3,
        k: int = 60  # RRF parameter
    ):
        self.vector_retriever = vector_retriever
        self.bm25_retriever = bm25_retriever
        self.dense_weight = dense_weight
        self.sparse_weight = sparse_weight
        self.k = k
    
    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.0
    ) -> List[RetrievalResult]:
        """Hybrid retrieval with RRF."""
        dense_results = self.vector_retriever.retrieve(query, top_k * 2, 0.0)
        sparse_results = self.bm25_retriever.retrieve(query, top_k * 2, 0.0)
        
        # Reciprocal Rank Fusion
        fused_scores = {}
        
        for rank, result in enumerate(dense_results):
            key = result.chunk_id
            if key not in fused_scores:
                fused_scores[key] = {"score": 0.0, "result": result}
            fused_scores[key]["score"] += self.dense_weight / (self.k + rank + 1)
        
        for rank, result in enumerate(sparse_results):
            key = result.chunk_id
            if key not in fused_scores:
                fused_scores[key] = {"score": 0.0, "result": result}
            fused_scores[key]["score"] += self.sparse_weight / (self.k + rank + 1)
        
        # Sort by fused score
        sorted_results = sorted(
            fused_scores.values(),
            key=lambda x: x["score"],
            reverse=True
        )
        
        final_results = []
        for item in sorted_results[:top_k]:
            if item["score"] >= score_threshold:
                result = item["result"]
                result.score = item["score"]
                final_results.append(result)
        
        return final_results