import axios from 'axios';

export const getAPIBase = () => {
  return (
    localStorage.getItem('CUSTOM_API_URL') ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000'
  ).replace(/\/+$/, '');
};

const api = axios.create({
  baseURL: getAPIBase(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getAPIBase();
  return config;
});

export const queryAPI = async (query, options = {}) => {
  const { top_k = 5, use_reranker = true, filters = null } = options;
  const response = await api.post('/query', {
    query,
    top_k,
    use_reranker,
    filters,
  });
  return response.data;
};

export const queryStreamAPI = async (query, options = {}, onToken) => {
  const { top_k = 5, use_reranker = true, filters = null } = options;
  const apiBase = getAPIBase();
  
  const response = await fetch(`${apiBase}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k, use_reranker, filters }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.token) onToken(data.token);
          if (data.done) return;
          if (data.error) throw new Error(data.error);
        } catch (e) {
          console.warn('Failed to parse SSE:', line);
        }
      }
    }
  }
};

export const batchQueryAPI = async (queries, options = {}) => {
  const { top_k = 5, use_reranker = true } = options;
  const response = await api.post('/query/batch', {
    queries,
    top_k,
    use_reranker,
  });
  return response.data;
};

export const rerankAPI = async (query, candidateIds, top_k = 5) => {
  const response = await api.post('/rerank', {
    query,
    candidate_ids: candidateIds,
    top_k,
  });
  return response.data;
};

export const addDocumentsAPI = async (documents) => {
  const response = await api.post('/documents', { documents });
  return response.data;
};

export const uploadDocumentsAPI = async (files) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const listDocumentsAPI = async (limit = 50, offset = 0) => {
  const response = await api.get('/documents', { params: { limit, offset } });
  return response.data;
};

export const deleteDocumentsAPI = async (ids) => {
  const response = await api.delete('/documents', { data: { ids } });
  return response.data;
};

export const getStatsAPI = async () => {
  const response = await api.get('/stats');
  return response.data;
};

export const getConfigAPI = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const updateConfigAPI = async (config) => {
  const response = await api.patch('/config', config);
  return response.data;
};

export const healthCheckAPI = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;