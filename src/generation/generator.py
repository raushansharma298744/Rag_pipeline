"""Answer generation for RAG pipeline."""
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from src.retrieval.vector_retriever import RetrievalResult
from src.generation.prompt_templates import PromptTemplates


@dataclass
class GenerationResult:
    """Result from generation."""
    answer: str
    sources: List[RetrievalResult]
    confidence: float
    metadata: Dict[str, Any]


class Generator:
    """Generate answers using retrieved context."""
    
    def __init__(
        self,
        llm_client,
        prompt_template: str = None,
        max_context_length: int = 4000
    ):
        self.llm_client = llm_client
        self.prompt_template = prompt_template or PromptTemplates.DEFAULT_RAG
        self.max_context_length = max_context_length
    
    def generate(
        self,
        query: str,
        retrieved_docs: List[RetrievalResult],
        **kwargs
    ) -> GenerationResult:
        """Generate answer from retrieved documents."""
        context = self._build_context(retrieved_docs)
        prompt = self.prompt_template.format(query=query, context=context, **kwargs)
        
        answer = self.llm_client.generate(prompt)
        confidence = self._estimate_confidence(retrieved_docs)
        
        return GenerationResult(
            answer=answer,
            sources=retrieved_docs,
            confidence=confidence,
            metadata={"prompt_length": len(prompt), "num_sources": len(retrieved_docs)}
        )
    
    def generate_stream(
        self,
        query: str,
        retrieved_docs: List[RetrievalResult],
        **kwargs
    ):
        """Stream generation."""
        context = self._build_context(retrieved_docs)
        prompt = self.prompt_template.format(query=query, context=context, **kwargs)
        
        for token in self.llm_client.generate_stream(prompt):
            yield token
    
    def _build_context(self, docs: List[RetrievalResult]) -> str:
        """Build context string from retrieved documents."""
        context_parts = []
        current_length = 0
        
        for i, doc in enumerate(docs):
            doc_text = f"[Source {i+1}] {doc.content}"
            if current_length + len(doc_text) > self.max_context_length:
                break
            context_parts.append(doc_text)
            current_length += len(doc_text)
        
        return "\n\n".join(context_parts)
    
    def _estimate_confidence(self, docs: List[RetrievalResult]) -> float:
        """Estimate confidence based on retrieval scores."""
        if not docs:
            return 0.0
        avg_score = sum(d.score for d in docs) / len(docs)
        return min(avg_score, 1.0)