"""Vector-based semantic search retriever."""
from typing import List, Optional, Dict, Any
import numpy as np
from dataclasses import dataclass


@dataclass
class RetrievalResult:
    """Result from retrieval."""
    content: str
    score: float
    metadata: Dict[str, Any]
    chunk_id: str


class VectorRetriever:
    """Semantic search using vector similarity."""
    
    def __init__(self, vector_store, embedding_model):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
    
    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.0,
        filters: Optional[Dict] = None
    ) -> List[RetrievalResult]:
        """Retrieve top-k similar documents."""
        query_embedding = self.embedding_model.embed_query(query)
        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            filters=filters
        )
        
        retrieval_results = []
        for result in results:
            if result["score"] >= score_threshold:
                retrieval_results.append(RetrievalResult(
                    content=result["content"],
                    score=result["score"],
                    metadata=result.get("metadata", {}),
                    chunk_id=result.get("id", "")
                ))
        
        return retrieval_results
    
    def retrieve_batch(
        self,
        queries: List[str],
        top_k: int = 5,
        score_threshold: float = 0.0
    ) -> List[List[RetrievalResult]]:
        """Batch retrieval for multiple queries."""
        query_embeddings = self.embedding_model.embed(queries)
        return [
            self.retrieve(query, top_k, score_threshold)
            for query in queries
        ]


class DenseRetriever(VectorRetriever):
    """Dense vector retriever (alias for VectorRetriever)."""
    pass