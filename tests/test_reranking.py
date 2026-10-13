"""Tests for reranking module."""
import pytest
from src.reranking.cross_encoder_reranker import CrossEncoderReranker
from src.retrieval.vector_retriever import RetrievalResult


class TestCrossEncoderReranker:
    """Test cross-encoder reranker."""
    
    @pytest.fixture
    def reranker(self):
        return CrossEncoderReranker("cross-encoder/ms-marco-MiniLM-L-6-v2")
    
    @pytest.fixture
    def sample_results(self):
        return [
            RetrievalResult(
                content="Machine learning is a subset of AI",
                score=0.8,
                metadata={},
                chunk_id="1"
            ),
            RetrievalResult(
                content="Deep learning uses neural networks",
                score=0.7,
                metadata={},
                chunk_id="2"
            ),
            RetrievalResult(
                content="Natural language processing handles text",
                score=0.6,
                metadata={},
                chunk_id="3"
            )
        ]
    
    def test_rerank(self, reranker, sample_results):
        query = "What is machine learning?"
        reranked = reranker.rerank(query, sample_results, top_k=2)
        
        assert len(reranked) == 2
        # First result should be most relevant to ML
        assert "machine learning" in reranked[0].content.lower()
        # Scores should be updated
        assert all(r.score > 0 for r in reranked)
        # Should be sorted by score descending
        assert reranked[0].score >= reranked[1].score
    
    def test_rerank_no_top_k(self, reranker, sample_results):
        query = "What is AI?"
        reranked = reranker.rerank(query, sample_results)
        
        assert len(reranked) == 3
        assert reranked[0].score >= reranked[1].score >= reranked[2].score