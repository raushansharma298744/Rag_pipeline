"""FAISS vector store implementation."""
from typing import List, Dict, Any, Optional
import numpy as np
import faiss
import pickle
import os


class FAISSVectorStore:
    """FAISS-based vector store."""
    
    def __init__(self, dimension: int, index_type: str = "IVF"):
        self.dimension = dimension
        self.index_type = index_type
        self.index = None
        self.documents = []
        self.metadata = []
        self.ids = []
    
    def _create_index(self, n_vectors: int):
        """Create appropriate FAISS index."""
        if self.index_type == "FLAT":
            self.index = faiss.IndexFlatIP(self.dimension)
        elif self.index_type == "IVF":
            nlist = min(100, max(1, n_vectors // 10))
            quantizer = faiss.IndexFlatIP(self.dimension)
            self.index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
        elif self.index_type == "HNSW":
            self.index = faiss.IndexHNSWFlat(self.dimension, 32)
        else:
            raise ValueError(f"Unknown index type: {self.index_type}")
    
    def add(
        self,
        embeddings: np.ndarray,
        documents: List[str],
        metadata: List[Dict[str, Any]],
        ids: List[str] = None
    ):
        """Add vectors to the index."""
        if self.index is None:
            self._create_index(len(embeddings))
            if self.index_type == "IVF":
                self.index.train(embeddings.astype(np.float32))
        
        if ids is None:
            ids = [str(len(self.documents) + i) for i in range(len(embeddings))]
        
        self.index.add(embeddings.astype(np.float32))
        self.documents.extend(documents)
        self.metadata.extend(metadata)
        self.ids.extend(ids)
    
    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        filters: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors."""
        if self.index is None or len(self.documents) == 0:
            return []
        
        query_embedding = query_embedding.astype(np.float32).reshape(1, -1)
        scores, indices = self.index.search(query_embedding, top_k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.documents):
                if filters:
                    meta = self.metadata[idx]
                    if not all(meta.get(k) == v for k, v in filters.items()):
                        continue
                
                results.append({
                    "id": self.ids[idx],
                    "content": self.documents[idx],
                    "score": float(score),
                    "metadata": self.metadata[idx]
                })
        
        return results
    
    def save(self, path: str):
        """Save index to disk."""
        os.makedirs(path, exist_ok=True)
        faiss.write_index(self.index, os.path.join(path, "index.faiss"))
        with open(os.path.join(path, "metadata.pkl"), "wb") as f:
            pickle.dump({
                "documents": self.documents,
                "metadata": self.metadata,
                "ids": self.ids
            }, f)
    
    def load(self, path: str):
        """Load index from disk."""
        self.index = faiss.read_index(os.path.join(path, "index.faiss"))
        with open(os.path.join(path, "metadata.pkl"), "rb") as f:
            data = pickle.load(f)
            self.documents = data["documents"]
            self.metadata = data["metadata"]
            self.ids = data["ids"]