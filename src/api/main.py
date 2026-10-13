"""FastAPI application for RAG pipeline."""
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, AsyncGenerator
import uvicorn
import json
import asyncio
import os

from src.rag_pipeline import RAGPipeline, RAGConfig
from src.embedding.embedding_models import SentenceTransformerEmbedding
from src.vectorstore.faiss_store import FAISSVectorStore
from src.generation.generator import Generator
from src.generation.llm_client import get_llm_client
from src.reranking.cross_encoder_reranker import CrossEncoderReranker
from src.utils.ingest import load_documents_from_dir, extract_text_from_pdf


app = FastAPI(title="RAG Pipeline API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint verifying API is alive."""
    return {
        "status": "online",
        "service": "IntelliRAG API",
        "version": "1.0.2",
        "pipeline_ready": pipeline is not None,
        "is_initializing": is_pipeline_initializing,
        "init_error": pipeline_init_error,
        "docs": "/docs",
        "health": "/health"
    }

# Global pipeline instance
pipeline: RAGPipeline = None


class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    use_reranker: Optional[bool] = True
    filters: Optional[Dict[str, Any]] = None


class DocumentRequest(BaseModel):
    documents: List[Dict[str, Any]]


class DocumentDeleteRequest(BaseModel):
    ids: List[str]


class BatchQueryRequest(BaseModel):
    queries: List[str]
    top_k: Optional[int] = 5
    use_reranker: Optional[bool] = True


class ConfigUpdateRequest(BaseModel):
    top_k_retrieval: Optional[int] = None
    top_k_rerank: Optional[int] = None
    score_threshold: Optional[float] = None
    use_hybrid: Optional[bool] = None
    use_reranker: Optional[bool] = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    confidence: float
    metadata: Dict[str, Any]


class BatchQueryResponse(BaseModel):
    results: List[QueryResponse]


class StatsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    embedding_dimension: int
    index_type: str
    config: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    pipeline_ready: bool
    stats: Optional[StatsResponse] = None
    error: Optional[str] = None


# Global pipeline state
pipeline: Optional[RAGPipeline] = None
is_pipeline_initializing: bool = False
pipeline_init_error: Optional[str] = None


def _initialize_pipeline_sync():
    """Worker function executed in a background thread to download/load ML models."""
    global pipeline, pipeline_init_error
    try:
        print("[Startup] Background ML model initialization started...")
        import gc

        config = RAGConfig()
        # On 512MB RAM instances, disable heavy cross-encoder reranker unless explicitly enabled
        config.use_reranker = os.getenv("ENABLE_RERANKER", "false").lower() == "true"

        try:
            from src.embedding.embedding_models import FastEmbedding
            embedding_model = FastEmbedding()
            print("[Startup] Pre-warming FastEmbed ONNX model in background...")
            _ = embedding_model.embed_query("warmup")
            print("[Startup] Using ultra-low memory FastEmbed engine (<230MB RAM) - ready!")
        except Exception as embed_err:
            print(f"[Startup Warning] FastEmbed failed ({embed_err}), falling back to SentenceTransformer...")
            embedding_model = SentenceTransformerEmbedding(config.embedding_model)
            print("[Startup] Using SentenceTransformer embedding engine")

        vector_store = FAISSVectorStore(dimension=384)

        # Real LLM client from environment
        llm_client = get_llm_client()
        generator = Generator(llm_client)
        reranker = CrossEncoderReranker(config.reranker_model)

        pipe = RAGPipeline(
            config=config,
            embedding_model=embedding_model,
            vector_store=vector_store,
            generator=generator,
            reranker=reranker
        )

        # Auto-ingest documents from data/raw only if explicitly requested
        auto_ingest = os.getenv("AUTO_INGEST_ON_STARTUP", "false").lower() == "true"
        data_dir = os.getenv("RAG_DATA_DIR", "./data/raw")
        if auto_ingest and os.path.exists(data_dir):
            docs = load_documents_from_dir(data_dir)
            if docs:
                pipe.add_documents(docs)
                print(f"[Startup] Auto-ingested {len(docs)} documents from {data_dir}")
        else:
            print("[Startup] Fast ready mode: pipeline ready for manual upload via UI")

        gc.collect()
        pipeline = pipe
        print("[Startup] RAG Pipeline initialized successfully and ready for queries!")
    except Exception as e:
        import traceback
        pipeline_init_error = f"{str(e)}\n{traceback.format_exc()}"
        print(f"[Startup ERROR] Pipeline initialization failed: {pipeline_init_error}")


async def init_pipeline_task():
    global is_pipeline_initializing
    if is_pipeline_initializing or pipeline is not None:
        return
    is_pipeline_initializing = True
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _initialize_pipeline_sync)
    is_pipeline_initializing = False


@app.on_event("startup")
async def startup():
    """Fast non-blocking startup so Uvicorn binds port immediately for Render."""
    print("[Startup] FastAPI started. Launching pipeline initialization in background thread...")
    asyncio.create_task(init_pipeline_task())
    print("[Startup] Fast startup complete. HTTP port binding is active immediately.")


async def get_ready_pipeline(timeout: float = 45.0) -> RAGPipeline:
    """Ensure pipeline is ready before serving requests that require it."""
    global pipeline, pipeline_init_error
    if pipeline is not None:
        return pipeline
    if pipeline_init_error:
        raise HTTPException(status_code=500, detail=f"Pipeline initialization error: {pipeline_init_error}")

    start_time = asyncio.get_event_loop().time()
    while pipeline is None and is_pipeline_initializing:
        if asyncio.get_event_loop().time() - start_time > timeout:
            raise HTTPException(status_code=503, detail="Pipeline is still downloading/loading models. Please retry in a few seconds.")
        await asyncio.sleep(0.5)

    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline is initializing. Please retry in a few seconds.")
    return pipeline


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Query the RAG pipeline."""
    pipe = await get_ready_pipeline()
    try:
        result = pipe.query(
            query=request.query,
            top_k=request.top_k,
            use_reranker=request.use_reranker,
            filters=request.filters
        )
        
        return QueryResponse(
            answer=result.answer,
            sources=[
                {
                    "content": s.content,
                    "score": s.score,
                    "metadata": s.metadata,
                    "chunk_id": s.chunk_id
                }
                for s in result.sources
            ],
            confidence=result.confidence,
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query/stream")
async def query_stream(request: QueryRequest):
    """Stream query response token by token."""
    pipe = await get_ready_pipeline()
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            top_k = request.top_k or pipe.config.top_k_retrieval
            use_reranker = request.use_reranker if request.use_reranker is not None else pipe.config.use_reranker
            
            if pipe.config.use_hybrid and pipe.hybrid_retriever:
                retrieved = pipe.hybrid_retriever.retrieve(request.query, top_k, pipe.config.score_threshold)
            else:
                retrieved = pipe.vector_retriever.retrieve(request.query, top_k, pipe.config.score_threshold, request.filters)
            
            if use_reranker and pipe.reranker and retrieved:
                retrieved = pipe.reranker.rerank(request.query, retrieved, pipe.config.top_k_rerank)
            
            for token in pipe.generator.generate_stream(request.query, retrieved):
                yield f"data: {json.dumps({'token': token})}\n\n"
            
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(generate_stream(), media_type="text/event-stream")


@app.post("/query/batch", response_model=BatchQueryResponse)
async def query_batch(request: BatchQueryRequest):
    """Process multiple queries at once."""
    pipe = await get_ready_pipeline()
    
    try:
        results = []
        for query_text in request.queries:
            result = pipe.query(
                query=query_text,
                top_k=request.top_k,
                use_reranker=request.use_reranker
            )
            results.append(QueryResponse(
                answer=result.answer,
                sources=[
                    {
                        "content": s.content,
                        "score": s.score,
                        "metadata": s.metadata,
                        "chunk_id": s.chunk_id
                    }
                    for s in result.sources
                ],
                confidence=result.confidence,
                metadata=result.metadata
            ))
        
        return BatchQueryResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/documents")
async def add_documents(request: DocumentRequest):
    """Add documents to the pipeline."""
    pipe = await get_ready_pipeline()
    
    try:
        pipe.add_documents(request.documents)
        return {"status": "success", "count": len(request.documents)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/documents/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload and ingest documents (PDF, TXT, MD, JSON, JSONL)."""
    pipe = await get_ready_pipeline()
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    data_dir = os.getenv("RAG_DATA_DIR", "./data/raw")
    os.makedirs(data_dir, exist_ok=True)

    extracted_docs: List[Dict[str, Any]] = []
    processed_files: List[str] = []

    for upload in files:
        filename = upload.filename or "uploaded_file"
        suffix = os.path.splitext(filename)[1].lower()
        contents = await upload.read()

        save_path = os.path.join(data_dir, filename)
        try:
            with open(save_path, "wb") as f:
                f.write(contents)
        except Exception as save_err:
            print(f"Warning: could not save file copy to {save_path}: {save_err}")

        if suffix == ".pdf":
            pdf_docs = extract_text_from_pdf(contents, source_name=filename)
            extracted_docs.extend(pdf_docs)
            processed_files.append(filename)
        elif suffix in {".txt", ".md"}:
            text = contents.decode("utf-8", errors="ignore").strip()
            if text:
                extracted_docs.append({
                    "content": text,
                    "metadata": {"source": filename, "type": suffix.lstrip(".")}
                })
            processed_files.append(filename)
        elif suffix == ".json":
            text = contents.decode("utf-8", errors="ignore").strip()
            if text:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    extracted_docs.extend(parsed)
                else:
                    extracted_docs.append(parsed)
            processed_files.append(filename)
        elif suffix == ".jsonl":
            text = contents.decode("utf-8", errors="ignore").strip()
            for line in text.splitlines():
                if line.strip():
                    extracted_docs.append(json.loads(line))
            processed_files.append(filename)
        else:
            text = contents.decode("utf-8", errors="ignore").strip()
            if text:
                extracted_docs.append({
                    "content": text,
                    "metadata": {"source": filename, "type": "unknown"}
                })
            processed_files.append(filename)

    if not extracted_docs:
        raise HTTPException(status_code=400, detail="No valid text could be extracted from uploaded files")

    pipe.add_documents(extracted_docs)
    return {
        "status": "success",
        "count": len(extracted_docs),
        "files": processed_files,
        "message": f"Successfully ingested {len(processed_files)} file(s) into pipeline"
    }


@app.get("/documents")
async def list_documents(limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0)):
    """List indexed documents with pagination."""
    if pipeline is None:
        return {"documents": [], "total": 0, "limit": limit, "offset": offset}
    
    try:
        docs = pipeline.vector_store.documents
        total = len(docs)
        paginated = docs[offset:offset + limit]
        
        return {
            "documents": [
                {
                    "id": pipeline.vector_store.ids[i] if i < len(pipeline.vector_store.ids) else str(i),
                    "content": doc[:200] + "..." if len(doc) > 200 else doc,
                    "metadata": pipeline.vector_store.metadata[i] if i < len(pipeline.vector_store.metadata) else {}
                }
                for i, doc in enumerate(paginated)
            ],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents")
async def delete_documents(request: DocumentDeleteRequest):
    """Delete documents by IDs."""
    pipe = await get_ready_pipeline()
    
    try:
        if hasattr(pipe.vector_store, 'delete'):
            pipe.vector_store.delete(request.ids)
            return {"status": "success", "deleted": len(request.ids)}
        else:
            raise HTTPException(status_code=501, detail="Delete not supported by this vector store")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get pipeline statistics."""
    if pipeline is None:
        return StatsResponse(
            total_documents=0,
            total_chunks=0,
            embedding_dimension=384,
            index_type="FAISS",
            config={"status": "initializing"}
        )
    
    try:
        return StatsResponse(
            total_documents=len(pipeline.documents),
            total_chunks=len(pipeline.vector_store.documents) if pipeline.vector_store.documents else 0,
            embedding_dimension=pipeline.vector_store.dimension,
            index_type=pipeline.vector_store.index_type if hasattr(pipeline.vector_store, 'index_type') else "unknown",
            config={
                "top_k_retrieval": pipeline.config.top_k_retrieval,
                "top_k_rerank": pipeline.config.top_k_rerank,
                "score_threshold": pipeline.config.score_threshold,
                "use_hybrid": pipeline.config.use_hybrid,
                "use_reranker": pipeline.config.use_reranker,
                "embedding_model": pipeline.config.embedding_model,
                "reranker_model": pipeline.config.reranker_model
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/config")
async def get_config():
    """Get current pipeline configuration."""
    if pipeline is None:
        return {"status": "initializing"}
    
    return {
        "top_k_retrieval": pipeline.config.top_k_retrieval,
        "top_k_rerank": pipeline.config.top_k_rerank,
        "score_threshold": pipeline.config.score_threshold,
        "use_hybrid": pipeline.config.use_hybrid,
        "use_reranker": pipeline.config.use_reranker,
        "embedding_model": pipeline.config.embedding_model,
        "reranker_model": pipeline.config.reranker_model,
        "chunk_size": pipeline.config.chunk_size,
        "chunk_overlap": pipeline.config.chunk_overlap
    }


@app.patch("/config")
async def update_config(request: ConfigUpdateRequest):
    """Update pipeline configuration at runtime."""
    pipe = await get_ready_pipeline()
    
    try:
        if request.top_k_retrieval is not None:
            pipe.config.top_k_retrieval = request.top_k_retrieval
        if request.top_k_rerank is not None:
            pipe.config.top_k_rerank = request.top_k_rerank
        if request.score_threshold is not None:
            pipe.config.score_threshold = request.score_threshold
        if request.use_hybrid is not None:
            pipe.config.use_hybrid = request.use_hybrid
        if request.use_reranker is not None:
            pipe.config.use_reranker = request.use_reranker
        
        return {"status": "success", "config": await get_config()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rerank")
async def rerank_only(
    query: str,
    candidate_ids: List[str],
    top_k: int = 5
):
    """Re-rank pre-retrieved candidates by IDs."""
    pipe = await get_ready_pipeline()
    if pipe.reranker is None:
        raise HTTPException(status_code=503, detail="Reranker not initialized")
    
    try:
        candidates = []
        for cid in candidate_ids:
            doc_idx = pipe.vector_store.ids.index(cid) if cid in pipe.vector_store.ids else -1
            if doc_idx >= 0:
                from src.retrieval.vector_retriever import RetrievalResult
                candidates.append(RetrievalResult(
                    content=pipe.vector_store.documents[doc_idx],
                    score=0.0,
                    metadata=pipe.vector_store.metadata[doc_idx],
                    chunk_id=cid
                ))
        
        reranked = pipe.reranker.rerank(query, candidates, top_k)
        
        return {
            "reranked": [
                {
                    "chunk_id": r.chunk_id,
                    "content": r.content,
                    "score": r.score,
                    "metadata": r.metadata
                }
                for r in reranked
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check with optional stats."""
    if pipeline_init_error:
        return HealthResponse(status="error", pipeline_ready=False, error=pipeline_init_error)
    if pipeline is None:
        return HealthResponse(status="initializing", pipeline_ready=False)
    
    try:
        stats = await get_stats()
        return HealthResponse(status="healthy", pipeline_ready=True, stats=stats)
    except Exception as e:
        return HealthResponse(status="healthy", pipeline_ready=True, error=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=port)