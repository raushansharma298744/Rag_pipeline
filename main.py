"""Main entry point for RAG pipeline."""
import argparse
import yaml
from pathlib import Path

from src.rag_pipeline import RAGPipeline, RAGConfig
from src.embedding.embedding_models import SentenceTransformerEmbedding
from src.vectorstore.faiss_store import FAISSVectorStore
from src.generation.generator import Generator
from src.reranking.cross_encoder_reranker import CrossEncoderReranker


class DummyLLM:
    """Dummy LLM for testing."""
    def generate(self, prompt: str) -> str:
        return f"[Generated] Answer for: {prompt[:50]}..."
    
    def generate_stream(self, prompt: str):
        yield "[Generated] "
        yield "Answer "
        yield "for "
        yield "query."


def load_config(config_path: str) -> dict:
    """Load YAML configuration."""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)


def create_pipeline(config: dict) -> RAGPipeline:
    """Create RAG pipeline from config."""
    rag_config = RAGConfig(
        embedding_model=config['embedding']['model'],
        chunk_size=config['chunking']['chunk_size'],
        chunk_overlap=config['chunking']['chunk_overlap'],
        top_k_retrieval=config['retrieval']['top_k'],
        top_k_rerank=config['reranking']['top_k'],
        score_threshold=config['retrieval']['score_threshold'],
        use_hybrid=config['retrieval']['use_hybrid'],
        use_reranker=config['reranking']['enabled'],
        reranker_model=config['reranking']['model']
    )
    
    embedding_model = SentenceTransformerEmbedding(rag_config.embedding_model)
    vector_store = FAISSVectorStore(dimension=384)
    generator = Generator(DummyLLM())
    reranker = CrossEncoderReranker(rag_config.reranker_model)
    
    return RAGPipeline(
        config=rag_config,
        embedding_model=embedding_model,
        vector_store=vector_store,
        generator=generator,
        reranker=reranker
    )


def main():
    parser = argparse.ArgumentParser(description="RAG Pipeline")
    parser.add_argument("--config", default="configs/config.yaml", help="Config file path")
    parser.add_argument("--query", help="Query to run")
    parser.add_argument("--add-docs", help="Path to documents JSONL file")
    parser.add_argument("--interactive", action="store_true", help="Interactive mode")
    args = parser.parse_args()
    
    config = load_config(args.config)
    pipeline = create_pipeline(config)
    
    if args.add_docs:
        import json
        with open(args.add_docs, 'r') as f:
            documents = [json.loads(line) for line in f]
        pipeline.add_documents(documents)
        print(f"Added {len(documents)} documents")
    
    if args.query:
        result = pipeline.query(args.query)
        print(f"\nAnswer: {result.answer}")
        print(f"Confidence: {result.confidence:.2f}")
        print(f"Sources: {len(result.sources)}")
    
    if args.interactive:
        print("\nInteractive mode (type 'exit' to quit)")
        while True:
            query = input("\nQuery: ").strip()
            if query.lower() in ('exit', 'quit'):
                break
            if query:
                result = pipeline.query(query)
                print(f"\nAnswer: {result.answer}")
                print(f"Confidence: {result.confidence:.2f}")


if __name__ == "__main__":
    main()