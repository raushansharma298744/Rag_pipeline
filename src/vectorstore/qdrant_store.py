"""Qdrant vector store implementation."""
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue


class QdrantVectorStore:
    """Qdrant-based vector store."""
    
    def __init__(
        self,
        collection_name: str = "rag_collection",
        host: str = "localhost",
        port: int = 6333,
        dimension: int = 384
    ):
        self.client = QdrantClient(host=host, port=port)
        self.collection_name = collection_name
        self.dimension = dimension
        self._ensure_collection()
    
    def _ensure_collection(self):
        """Create collection if not exists."""
        collections = self.client.get_collections().collections
        if not any(c.name == self.collection_name for c in collections):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.dimension, distance=Distance.COSINE)
            )
    
    def add(
        self,
        embeddings: List[List[float]],
        documents: List[str],
        metadata: List[Dict[str, Any]],
        ids: List[str]
    ):
        """Add points to collection."""
        points = [
            PointStruct(
                id=id_,
                vector=emb,
                payload={"content": doc, **meta}
            )
            for id_, emb, doc, meta in zip(ids, embeddings, documents, metadata)
        ]
        self.client.upsert(collection_name=self.collection_name, points=points)
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filters: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors."""
        query_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filters.items()
            ]
            query_filter = Filter(must=conditions)
        
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=top_k,
            query_filter=query_filter
        )
        
        return [
            {
                "id": str(r.id),
                "content": r.payload.get("content", ""),
                "score": r.score,
                "metadata": {k: v for k, v in r.payload.items() if k != "content"}
            }
            for r in results
        ]
    
    def delete(self, ids: List[str]):
        """Delete points by IDs."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=ids
        )