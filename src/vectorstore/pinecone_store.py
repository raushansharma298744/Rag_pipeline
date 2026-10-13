"""Pinecone vector store implementation."""
from typing import List, Dict, Any, Optional

try:
    from pinecone import Pinecone, ServerlessSpec
    PINECONE_AVAILABLE = True
except Exception:
    PINECONE_AVAILABLE = False
    Pinecone = None
    ServerlessSpec = None


class PineconeVectorStore:
    """Pinecone-based vector store."""
    
    def __init__(
        self,
        index_name: str = "rag-index",
        api_key: str = None,
        dimension: int = 384,
        metric: str = "cosine",
        cloud: str = "aws",
        region: str = "us-east-1"
    ):
        if not PINECONE_AVAILABLE:
            raise ImportError("Pinecone not installed. Run: pip install pinecone")
        
        self.pc = Pinecone(api_key=api_key)
        self.index_name = index_name
        self.dimension = dimension
        self._ensure_index(cloud, region, metric)
        self.index = self.pc.Index(index_name)
    
    def _ensure_index(self, cloud: str, region: str, metric: str):
        """Create index if not exists."""
        if self.index_name not in self.pc.list_indexes().names():
            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric=metric,
                spec=ServerlessSpec(cloud=cloud, region=region)
            )
    
    def add(
        self,
        embeddings: List[List[float]],
        documents: List[str],
        metadata: List[Dict[str, Any]],
        ids: List[str]
    ):
        """Add vectors to index."""
        vectors = [
            {
                "id": id_,
                "values": emb,
                "metadata": {"content": doc, **meta}
            }
            for id_, emb, doc, meta in zip(ids, embeddings, documents, metadata)
        ]
        self.index.upsert(vectors=vectors)
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filters: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors."""
        query_filter = filters if filters else None
        
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            filter=query_filter,
            include_metadata=True
        )
        
        return [
            {
                "id": match.id,
                "content": match.metadata.get("content", ""),
                "score": match.score,
                "metadata": {k: v for k, v in match.metadata.items() if k != "content"}
            }
            for match in results.matches
        ]
    
    def delete(self, ids: List[str]):
        """Delete vectors by IDs."""
        self.index.delete(ids=ids)