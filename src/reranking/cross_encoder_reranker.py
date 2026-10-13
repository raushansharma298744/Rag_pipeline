"""Cross-encoder based re-ranking."""
from typing import List, Optional
import numpy as np
from src.retrieval.vector_retriever import RetrievalResult


class CrossEncoderReranker:
    """Re-rank using cross-encoder model."""
    
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self._model = None
    
    @property
    def model(self):
        """Lazy load CrossEncoder model on first call to save memory at startup."""
        if self._model is None:
            import torch
            torch.set_num_threads(1)
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(self.model_name, device="cpu")
        return self._model
    
    def rerank(
        self,
        query: str,
        results: List[RetrievalResult],
        top_k: Optional[int] = None
    ) -> List[RetrievalResult]:
        """Re-rank results using cross-encoder."""
        pairs = [(query, result.content) for result in results]
        scores = self.model.predict(pairs)
        
        for result, score in zip(results, scores):
            result.score = float(score)
        
        results.sort(key=lambda x: x.score, reverse=True)
        
        if top_k:
            return results[:top_k]
        return results


class MonoT5Reranker:
    """MonoT5 re-ranker."""
    
    def __init__(self, model_name: str = "castorini/monot5-base-msmarco"):
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        import torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
    
    def rerank(
        self,
        query: str,
        results: List[RetrievalResult],
        top_k: Optional[int] = None
    ) -> List[RetrievalResult]:
        """Re-rank using MonoT5."""
        import torch
        
        scores = []
        for result in results:
            input_text = f"Query: {query} Document: {result.content} Relevant:"
            inputs = self.tokenizer(
                input_text,
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(self.device)
            
            with torch.no_grad():
                outputs = self.model.generate(**inputs, max_length=2)
            
            prob = torch.softmax(outputs.logits, dim=-1)[0, 1].item()
            scores.append(prob)
        
        for result, score in zip(results, scores):
            result.score = score
        
        results.sort(key=lambda x: x.score, reverse=True)
        
        if top_k:
            return results[:top_k]
        return results