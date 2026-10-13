"""BM25 sparse retrieval."""
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import numpy as np
from rank_bm25 import BM25Okapi


@dataclass
class RetrievalResult:
    """Result from retrieval."""
    content: str
    score: float
    metadata: Dict[str, Any]
    chunk_id: str


class BM25Retriever:
    """BM25-based sparse retrieval."""
    
    def __init__(self, documents: List[Dict[str, Any]]):
        self.documents = documents
        self.corpus = [doc["content"] for doc in documents]
        self.tokenized_corpus = [doc.split() for doc in self.corpus]
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        self.doc_metadata = [doc.get("metadata", {}) for doc in documents]
        self.doc_ids = [doc.get("id", str(i)) for i, doc in enumerate(documents)]
    
    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.0
    ) -> List[RetrievalResult]:
        """Retrieve top-k documents using BM25."""
        tokenized_query = query.split()
        scores = self.bm25.get_scores(tokenized_query)
        
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if scores[idx] >= score_threshold:
                results.append(RetrievalResult(
                    content=self.corpus[idx],
                    score=float(scores[idx]),
                    metadata=self.doc_metadata[idx],
                    chunk_id=self.doc_ids[idx]
                ))
        
        return results
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        """Add new documents to the index."""
        start_idx = len(self.corpus)
        for i, doc in enumerate(documents):
            self.corpus.append(doc["content"])
            self.tokenized_corpus.append(doc["content"].split())
            self.doc_metadata.append(doc.get("metadata", {}))
            self.doc_ids.append(doc.get("id", str(start_idx + i)))
        
        self.bm25 = BM25Okapi(self.tokenized_corpus)