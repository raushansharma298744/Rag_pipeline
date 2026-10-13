"""Tests for embedding module."""
import pytest
import numpy as np
from src.embedding.embedding_models import (
    SentenceTransformerEmbedding,
    HuggingFaceEmbedding
)
from src.embedding.text_chunker import TextChunker, Chunk


class TestTextChunker:
    """Test text chunking."""
    
    def test_chunk_text(self):
        chunker = TextChunker(chunk_size=100, chunk_overlap=20)
        text = "This is a test document. " * 10
        chunks = chunker.chunk_text(text)
        
        assert len(chunks) > 1
        assert all(isinstance(c, Chunk) for c in chunks)
        assert all(len(c.content) <= 120 for c in chunks)  # chunk_size + overlap
    
    def test_chunk_documents(self):
        chunker = TextChunker(chunk_size=50, chunk_overlap=10)
        docs = [
            {"content": "Doc 1 content. " * 5, "metadata": {"id": 1}},
            {"content": "Doc 2 content. " * 5, "metadata": {"id": 2}}
        ]
        chunks = chunker.chunk_documents(docs)
        
        assert len(chunks) > 2
        assert all(c.metadata.get("id") in [1, 2] for c in chunks)


class TestEmbeddingModels:
    """Test embedding models."""
    
    @pytest.fixture
    def st_model(self):
        return SentenceTransformerEmbedding("sentence-transformers/all-MiniLM-L6-v2")
    
    def test_embed(self, st_model):
        texts = ["Hello world", "Test document"]
        embeddings = st_model.embed(texts)
        
        assert isinstance(embeddings, np.ndarray)
        assert embeddings.shape == (2, 384)
    
    def test_embed_query(self, st_model):
        query = "What is RAG?"
        embedding = st_model.embed_query(query)
        
        assert isinstance(embedding, np.ndarray)
        assert embedding.shape == (384,)
    
    def test_embed_single(self, st_model):
        texts = ["Single document"]
        embeddings = st_model.embed(texts)
        
        assert embeddings.shape == (1, 384)