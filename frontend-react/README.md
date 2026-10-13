# RAG Pipeline - React Frontend

Modern React frontend for the RAG Pipeline with TypeScript-ready components, Tailwind CSS, and real-time streaming support.

## Features

- **Query Page**: Ask questions with streaming responses, batch queries, and history
- **Documents Page**: Add documents (text, file upload, JSON), browse, and delete
- **Analytics Page**: System stats, health monitoring, and configuration overview
- **Settings Page**: Runtime configuration of retrieval and reranking parameters
- **Dark Mode**: Full dark mode support
- **Responsive**: Works on desktop and mobile

## Tech Stack

- React 18 + Vite
- React Router 6
- Tailwind CSS
- Axios for API calls
- Lucide React for icons
- Server-Sent Events (SSE) for streaming

## Development

```bash
cd frontend-react
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Build for Production

```bash
npm run build
```

Output in `dist/` folder.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:8000 | Backend API URL |

## API Integration

The frontend expects the FastAPI backend running on port 8000 with these endpoints:

- `POST /query` - Regular query
- `POST /query/stream` - Streaming query (SSE)
- `POST /query/batch` - Batch queries
- `GET/POST/DELETE /documents` - Document CRUD
- `GET /stats` - System statistics
- `GET/PATCH /config` - Configuration
- `GET /health` - Health check

## Project Structure

```
frontend-react/
├── src/
│   ├── components/     # Reusable components (Layout)
│   ├── pages/          # Page components
│   │   ├── QueryPage.jsx
│   │   ├── DocumentsPage.jsx
│   │   ├── AnalyticsPage.jsx
│   │   └── SettingsPage.jsx
│   ├── services/       # API layer
│   │   └── api.js
│   ├── utils/          # Helper functions
│   │   └── helpers.js
│   ├── App.jsx         # Routes
│   ├── main.jsx        # Entry point
│   └── index.css       # Tailwind imports
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── .env
```