"""ChromaDB vector store implementation."""
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings


class ChromaVectorStore:
    """ChromaDB-based vector store."""
    
    def __init__(
        self,
        collection_name: str = "rag_collection",
        persist_directory: str = "./chroma_db",
        embedding_function=None
    ):
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=embedding_function
        )
    
    def add(
        self,
        embeddings: List[List[float]],
        documents: List[str],
        metadata: List[Dict[str, Any]],
        ids: List[str]
    ):
        """Add documents to collection."""
        self.collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadata,
            ids=ids
        )
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filters: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar documents."""
        where = filters if filters else None
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where
        )
        
        formatted_results = []
        for i in range(len(results["ids"][0])):
            formatted_results.append({
                "id": results["ids"][0][i],
                "content": results["documents"][0][i],
                "score": 1.0 - results["distances"][0][i],  # Convert distance to similarity
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {}
            })
        
        return formatted_results
    
    def delete(self, ids: List[str]):
        """Delete documents by IDs."""
        self.collection.delete(ids=ids)
    
    def get(self, ids: List[str]) -> List[Dict[str, Any]]:
        """Get documents by IDs."""
        results = self.collection.get(ids=ids)
        return [
            {
                "id": results["ids"][i],
                "content": results["documents"][i],
                "metadata": results["metadatas"][i] if results["metadatas"] else {}
            }
            for i in range(len(results["ids"]))
        ]