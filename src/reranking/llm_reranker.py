"""LLM-based re-ranking."""
from typing import List, Optional
from src.retrieval.vector_retriever import RetrievalResult


class LLMReranker:
    """Re-rank using LLM as judge."""
    
    def __init__(self, llm_client, prompt_template: str = None):
        self.llm_client = llm_client
        self.prompt_template = prompt_template or """
        Query: {query}
        Document: {document}
        
        Rate the relevance of this document to the query on a scale of 0-10.
        Return only the score.
        """
    
    def rerank(
        self,
        query: str,
        results: List[RetrievalResult],
        top_k: Optional[int] = None,
        batch_size: int = 5
    ) -> List[RetrievalResult]:
        """Re-rank using LLM scoring."""
        scores = []
        
        for i in range(0, len(results), batch_size):
            batch = results[i:i + batch_size]
            batch_scores = self._score_batch(query, batch)
            scores.extend(batch_scores)
        
        for result, score in zip(results, scores):
            result.score = score
        
        results.sort(key=lambda x: x.score, reverse=True)
        
        if top_k:
            return results[:top_k]
        return results
    
    def _score_batch(self, query: str, results: List[RetrievalResult]) -> List[float]:
        """Score a batch of results."""
        prompts = [
            self.prompt_template.format(query=query, document=r.content)
            for r in results
        ]
        
        responses = self.llm_client.batch_generate(prompts)
        scores = []
        for resp in responses:
            try:
                score = float(resp.strip())
                scores.append(min(max(score / 10.0, 0.0), 1.0))
            except:
                scores.append(0.0)
        
        return scores