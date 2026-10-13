# RAG Pipeline

A modular Retrieval-Augmented Generation (RAG) pipeline with support for:
- Multiple embedding models (SentenceTransformers, OpenAI, HuggingFace)
- Vector stores (FAISS, ChromaDB, Qdrant, Pinecone)
- Hybrid retrieval (dense + sparse/BM25)
- Re-ranking (Cross-encoder, MonoT5, LLM-based, ColBERT)
- Flexible generation with prompt templates
- **FastAPI backend + React frontend (Vite + Tailwind)**

## Project Structure

```
RAG_Project/
├── configs/           # Configuration files
├── data/              # Data directories
│   ├── raw/           # Raw documents
│   ├── processed/     # Processed documents
│   └── embeddings/    # Cached embeddings
├── frontend/          # Streamlit frontend (legacy)
│   ├── app.py
│   ├── pages/
│   └── requirements.txt
├── frontend-react/    # React frontend (NEW)
│   ├── src/
│   │   ├── components/    # Layout, shared components
│   │   ├── pages/         # Query, Documents, Analytics, Settings
│   │   ├── services/      # API layer (axios + SSE)
│   │   ├── utils/         # Helpers
│   │   ├── App.jsx        # Routes
│   │   └── main.jsx       # Entry point
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env
├── logs/              # Log files
├── models/            # Model checkpoints
├── notebooks/         # Jupyter notebooks
├── scripts/           # Utility scripts
├── src/               # Source code
│   ├── api/           # FastAPI application
│   ├── embedding/     # Embedding models & chunking
│   ├── generation/    # Answer generation
│   ├── rag_pipeline.py # Main pipeline
│   ├── retrieval/     # Retrieval methods
│   ├── reranking/     # Re-ranking methods
│   ├── utils/         # Utility functions
│   └── vectorstore/   # Vector store implementations
├── tests/             # Unit tests
├── main.py            # CLI entry point
├── requirements.txt   # Python dependencies
├── docker-compose.yml # Docker deployment
├── Dockerfile.api     # API Dockerfile
├── Dockerfile.frontend # Frontend Dockerfile
├── start.sh           # Linux/Mac startup script
├── start.bat          # Windows startup script
└── .env.example       # Environment variables template
```

## Quick Start (React Frontend)

### Prerequisites
- Node.js 18+
- Python 3.10+

### Option 1: Manual (Recommended for Development)

**Terminal 1 - Start API:**
```bash
cd RAG_Project
pip install -r requirements.txt
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Start React Frontend:**
```bash
cd RAG_Project/frontend-react
npm install
npm run dev
```

### Option 2: Docker
```bash
cd RAG_Project
docker-compose up --build
```

## Access Points

| Service | URL |
|---------|-----|
| **Frontend (React)** | http://localhost:5173 |
| **API (FastAPI)** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **API Health** | http://localhost:8000/health |

## React Frontend Features

| Page | Features |
|------|----------|
| **💬 Query** | Ask questions, streaming responses (SSE), batch queries, history |
| **📚 Documents** | Add (text/file/JSON), browse paginated, delete by IDs |
| **📊 Analytics** | System stats, health status, configuration overview |
| **⚙️ Settings** | Runtime config: top_k, hybrid, reranker, thresholds |

### Key Features
- **Real-time streaming** via Server-Sent Events (SSE)
- **Dark mode** support
- **Responsive design** (mobile-friendly)
- **TypeScript-ready** components
- **Modern UI** with Tailwind CSS + Lucide icons

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Single query (retrieve → rerank → generate) |
| `/query/stream` | POST | Streaming token-by-token response (SSE) |
| `/query/batch` | POST | Multiple queries at once |
| `/rerank` | POST | Standalone rerank by candidate IDs |
| `/documents` | POST | Add documents |
| `/documents` | GET | List documents (paginated) |
| `/documents` | DELETE | Delete documents by IDs |
| `/stats` | GET | Pipeline statistics |
| `/config` | GET | Current configuration |
| `/config` | PATCH | Update configuration at runtime |
| `/health` | GET | Health check + stats |

## CLI Usage

```bash
# Add documents
python main.py --add-docs data/raw/documents.jsonl

# Query
python main.py --query "What is RAG?"

# Interactive mode
python main.py --interactive
```

## Configuration

Edit `configs/config.yaml` or use `.env` file (copy from `.env.example`):

```yaml
embedding:
  model: "sentence-transformers/all-MiniLM-L6-v2"

chunking:
  chunk_size: 512
  chunk_overlap: 50

retrieval:
  top_k: 10
  use_hybrid: true
  dense_weight: 0.7
  sparse_weight: 0.3

reranking:
  enabled: true
  model: "cross-encoder/ms-marco-MiniLM-L-6-v2"
  top_k: 5

vectorstore:
  type: "faiss"  # faiss, chroma, qdrant, pinecone
```

## React Frontend Development

```bash
cd frontend-react

# Install dependencies
npm install

# Development server (port 5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Environment Variables
Create `.env` file:
```env
VITE_API_URL=http://localhost:8000
```

## Components

### Embedding (`src/embedding/`)
- `EmbeddingModel` - Abstract base class
- `SentenceTransformerEmbedding` - SentenceTransformers models
- `OpenAIEmbedding` - OpenAI embeddings
- `HuggingFaceEmbedding` - Custom HF models
- `TextChunker` - Overlapping text chunking

### Retrieval (`src/retrieval/`)
- `VectorRetriever` - Dense vector search
- `BM25Retriever` - Sparse BM25 search
- `HybridRetriever` - RRF fusion of dense + sparse

### Re-ranking (`src/reranking/`)
- `CrossEncoderReranker` - Cross-encoder models
- `MonoT5Reranker` - MonoT5 models
- `LLMReranker` - LLM-as-judge
- `ColBERTReranker` - ColBERT late interaction

### Vector Stores (`src/vectorstore/`)
- `FAISSVectorStore` - Local FAISS index
- `ChromaVectorStore` - ChromaDB
- `QdrantVectorStore` - Qdrant
- `PineconeVectorStore` - Pinecone

### Generation (`src/generation/`)
- `Generator` - Answer generation
- `PromptTemplates` - Pre-built templates

## Testing

```bash
# Python tests
pytest tests/

# React frontend
cd frontend-react && npm run test
```

## VS Code Setup

Open the `RAG_Project` folder in VS Code. Recommended extensions:
- Python
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Auto Rename Tag

## License

MIT