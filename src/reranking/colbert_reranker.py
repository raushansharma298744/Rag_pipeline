"""ColBERT-based re-ranking."""
from typing import List, Optional
import numpy as np
from src.retrieval.vector_retriever import RetrievalResult


class ColBERTReranker:
    """ColBERT late interaction re-ranking."""
    
    def __init__(self, model_name: str = "colbert-ir/colbertv2.0"):
        try:
            from colbert import Indexer, Searcher
            from colbert.infra import Run, RunConfig, ColBERTConfig
            self.Run = Run
            self.RunConfig = RunConfig
            self.ColBERTConfig = ColBERTConfig
            self.Searcher = Searcher
        except ImportError:
            raise ImportError("Install colbert-ai: pip install colbert-ai")
        
        self.model_name = model_name
        self.searcher = None
    
    def index(self, documents: List[str], index_path: str = "./colbert_index"):
        """Build ColBERT index."""
        with self.Run().context(self.RunConfig(experiment="rag")):
            config = self.ColBERTConfig(
                nbits=2,
                root=index_path
            )
            indexer = Indexer(checkpoint=self.model_name, config=config)
            indexer.index(name="rag_index", collection=documents)
    
    def load_index(self, index_path: str = "./colbert_index"):
        """Load existing ColBERT index."""
        with self.Run().context(self.RunConfig(experiment="rag")):
            self.searcher = self.Searcher(index=index_path)
    
    def rerank(
        self,
        query: str,
        results: List[RetrievalResult],
        top_k: Optional[int] = None
    ) -> List[RetrievalResult]:
        """Re-rank using ColBERT late interaction."""
        if self.searcher is None:
            raise ValueError("Index not loaded. Call load_index() first.")
        
        contents = [r.content for r in results]
        pids = [r.chunk_id for r in results]
        
        # Search with ColBERT
        ranking = self.searcher.search(query, k=len(contents))
        
        # Map back to original results
        pid_to_result = {r.chunk_id: r for r in results}
        reranked = []
        
        for pid, score in zip(ranking.pids, ranking.scores):
            if pid in pid_to_result:
                result = pid_to_result[pid]
                result.score = float(score)
                reranked.append(result)
        
        if top_k:
            return reranked[:top_k]
        return reranked