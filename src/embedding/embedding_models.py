"""Embedding models for RAG pipeline."""
from abc import ABC, abstractmethod
from typing import List
import numpy as np


class EmbeddingModel(ABC):
    """Abstract base class for embedding models."""
    
    @abstractmethod
    def embed(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for a list of texts."""
        pass
    
    @abstractmethod
    def embed_query(self, query: str) -> np.ndarray:
        """Generate embedding for a single query."""
        pass


class SentenceTransformerEmbedding(EmbeddingModel):
    """SentenceTransformer-based embedding model with instant startup and lazy loading."""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None
    
    @property
    def model(self):
        """Lazy load SentenceTransformer weights on first use to ensure instant startup within 512MB RAM."""
        if self._model is None:
            import torch
            torch.set_num_threads(1)
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name, device="cpu")
        return self._model
    
    def embed(self, texts: List[str]) -> np.ndarray:
        return self.model.encode(texts, batch_size=8, convert_to_numpy=True, show_progress_bar=False)
    
    def embed_query(self, query: str) -> np.ndarray:
        return self.model.encode([query], convert_to_numpy=True)[0]


class OpenAIEmbedding(EmbeddingModel):
    """OpenAI embedding model."""
    
    def __init__(self, model_name: str = "text-embedding-3-small", api_key: str = None):
        import openai
        self.client = openai.OpenAI(api_key=api_key)
        self.model_name = model_name
    
    def embed(self, texts: List[str]) -> np.ndarray:
        response = self.client.embeddings.create(input=texts, model=self.model_name)
        return np.array([d.embedding for d in response.data])
    
    def embed_query(self, query: str) -> np.ndarray:
        return self.embed([query])[0]


class HuggingFaceEmbedding(EmbeddingModel):
    """HuggingFace transformer embedding model."""
    
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        from transformers import AutoTokenizer, AutoModel
        import torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
    
    def embed(self, texts: List[str]) -> np.ndarray:
        import torch
        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs)
        embeddings = outputs.last_hidden_state[:, 0].cpu().numpy()
        return embeddings
    
    def embed_query(self, query: str) -> np.ndarray:
        return self.embed([query])[0]