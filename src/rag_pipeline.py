"""Main RAG pipeline orchestrating all components."""
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from src.embedding.embedding_models import EmbeddingModel
from src.embedding.text_chunker import TextChunker
from src.retrieval.vector_retriever import VectorRetriever, RetrievalResult
from src.retrieval.hybrid_retriever import HybridRetriever
from src.retrieval.bm25_retriever import BM25Retriever
from src.reranking.cross_encoder_reranker import CrossEncoderReranker
from src.generation.generator import Generator, GenerationResult
from src.vectorstore.faiss_store import FAISSVectorStore


@dataclass
class RAGConfig:
    """RAG pipeline configuration."""
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_size: int = 512
    chunk_overlap: int = 50
    top_k_retrieval: int = 10
    top_k_rerank: int = 5
    score_threshold: float = 0.0
    use_hybrid: bool = True
    use_reranker: bool = True
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"


class RAGPipeline:
    """Complete RAG pipeline."""
    
    def __init__(
        self,
        config: RAGConfig,
        embedding_model: EmbeddingModel = None,
        vector_store: FAISSVectorStore = None,
        generator: Generator = None,
        reranker: CrossEncoderReranker = None
    ):
        self.config = config
        
        # Initialize components
        self.embedding_model = embedding_model
        self.text_chunker = TextChunker(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap
        )
        self.vector_store = vector_store
        self.generator = generator
        self.reranker = reranker
        
        # Initialize retrievers
        if vector_store and embedding_model:
            self.vector_retriever = VectorRetriever(vector_store, embedding_model)
            self.bm25_retriever = None  # Initialize after adding documents
            if config.use_hybrid:
                self.hybrid_retriever = None  # Initialize after adding documents
        
        self.documents = []
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        """Add documents to the pipeline."""
        self.documents.extend(documents)
        
        # Chunk documents
        chunks = self.text_chunker.chunk_documents(documents)
        
        # Generate embeddings
        chunk_texts = [c.content for c in chunks]
        embeddings = self.embedding_model.embed(chunk_texts)
        
        # Add to vector store
        ids = [f"chunk_{len(self.vector_store.documents) + i}" for i in range(len(chunks))]
        metadatas = [c.metadata for c in chunks]
        
        self.vector_store.add(embeddings, chunk_texts, metadatas, ids)
        
        # Initialize BM25 and hybrid retriever
        all_docs = []
        for i, c in enumerate(chunks):
            chunk_id = getattr(c, "chunk_id", None) or ids[i]
            c.chunk_id = chunk_id
            all_docs.append({"id": chunk_id, "content": c.content, "metadata": c.metadata})
        self.bm25_retriever = BM25Retriever(all_docs)
        
        if self.config.use_hybrid:
            self.hybrid_retriever = HybridRetriever(
                self.vector_retriever,
                self.bm25_retriever
            )
    
    def query(
        self,
        query: str,
        top_k: int = None,
        use_reranker: bool = None,
        filters: Dict = None
    ) -> GenerationResult:
        """Run full RAG query."""
        top_k = top_k or self.config.top_k_retrieval
        use_reranker = use_reranker if use_reranker is not None else self.config.use_reranker
        
        # Retrieve
        if self.config.use_hybrid and self.hybrid_retriever:
            retrieved = self.hybrid_retriever.retrieve(query, top_k, self.config.score_threshold)
        else:
            retrieved = self.vector_retriever.retrieve(query, top_k, self.config.score_threshold, filters)
        
        # Re-rank
        if use_reranker and self.reranker and retrieved:
            retrieved = self.reranker.rerank(query, retrieved, self.config.top_k_rerank)
        
        # Generate
        return self.generator.generate(query, retrieved)
    
    def query_stream(self, query: str, **kwargs):
        """Stream RAG query."""
        top_k = kwargs.get("top_k", self.config.top_k_retrieval)
        use_reranker = kwargs.get("use_reranker", self.config.use_reranker)
        
        if self.config.use_hybrid and self.hybrid_retriever:
            retrieved = self.hybrid_retriever.retrieve(query, top_k, self.config.score_threshold)
        else:
            retrieved = self.vector_retriever.retrieve(query, top_k, self.config.score_threshold)
        
        if use_reranker and self.reranker and retrieved:
            retrieved = self.reranker.rerank(query, retrieved, self.config.top_k_rerank)
        
        return self.generator.generate_stream(query, retrieved)