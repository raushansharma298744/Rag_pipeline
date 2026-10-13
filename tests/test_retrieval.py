"""Tests for retrieval module."""
import pytest
import numpy as np
from src.retrieval.vector_retriever import VectorRetriever, RetrievalResult
from src.retrieval.bm25_retriever import BM25Retriever
from src.retrieval.hybrid_retriever import HybridRetriever
from src.vectorstore.faiss_store import FAISSVectorStore
from src.embedding.embedding_models import SentenceTransformerEmbedding


class MockEmbeddingModel:
    """Mock embedding model for testing."""
    def embed(self, texts):
        return np.random.rand(len(texts), 384).astype(np.float32)
    
    def embed_query(self, query):
        return np.random.rand(384).astype(np.float32)


class TestVectorRetriever:
    """Test vector retriever."""
    
    @pytest.fixture
    def setup(self):
        vector_store = FAISSVectorStore(dimension=384)
        embedding_model = MockEmbeddingModel()
        
        # Add test documents
        docs = ["Document 1 content", "Document 2 content", "Document 3 content"]
        embeddings = embedding_model.embed(docs)
        vector_store.add(embeddings, docs, [{} for _ in docs], ["1", "2", "3"])
        
        retriever = VectorRetriever(vector_store, embedding_model)
        return retriever
    
    def test_retrieve(self, setup):
        results = setup.retrieve("test query", top_k=2)
        
        assert len(results) <= 2
        assert all(isinstance(r, RetrievalResult) for r in results)
        assert all(hasattr(r, 'score') for r in results)
    
    def test_retrieve_with_threshold(self, setup):
        results = setup.retrieve("test query", top_k=3, score_threshold=0.5)
        
        assert all(r.score >= 0.5 for r in results)


class TestBM25Retriever:
    """Test BM25 retriever."""
    
    @pytest.fixture
    def bm25_retriever(self):
        docs = [
            {"id": "1", "content": "machine learning algorithms", "metadata": {}},
            {"id": "2", "content": "deep learning neural networks", "metadata": {}},
            {"id": "3", "content": "natural language processing", "metadata": {}}
        ]
        return BM25Retriever(docs)
    
    def test_retrieve(self, bm25_retriever):
        results = bm25_retriever.retrieve("machine learning", top_k=2)
        
        assert len(results) <= 2
        assert all(hasattr(r, 'score') for r in results)
        # First result should be about machine learning
        assert "machine" in results[0].content.lower()


class TestHybridRetriever:
    """Test hybrid retriever."""
    
    @pytest.fixture
    def hybrid_retriever(self):
        vector_store = FAISSVectorStore(dimension=384)
        embedding_model = MockEmbeddingModel()
        
        docs = ["Document 1 content", "Document 2 content"]
        embeddings = embedding_model.embed(docs)
        vector_store.add(embeddings, docs, [{}, {}], ["1", "2"])
        
        vector_retriever = VectorRetriever(vector_store, embedding_model)
        
        bm25_docs = [
            {"id": "1", "content": "Document 1 content", "metadata": {}},
            {"id": "2", "content": "Document 2 content", "metadata": {}}
        ]
        bm25_retriever = BM25Retriever(bm25_docs)
        
        return HybridRetriever(vector_retriever, bm25_retriever)
    
    def test_retrieve(self, hybrid_retriever):
        results = hybrid_retriever.retrieve("test query", top_k=2)
        
        assert len(results) <= 2
        assert all(hasattr(r, 'score') for r in results)