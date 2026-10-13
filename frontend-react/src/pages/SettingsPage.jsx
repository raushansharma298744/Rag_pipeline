import { useState, useEffect } from 'react';
import { cn } from '../utils/helpers';
import { 
  Loader2, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Sliders, 
  Cpu, 
  Layers,
} from 'lucide-react';
import { getConfigAPI, updateConfigAPI } from '../services/api';

export default function SettingsPage() {
  const [config, setConfig] = useState({
    top_k_retrieval: 10,
    top_k_rerank: 5,
    score_threshold: 0,
    use_hybrid: true,
    use_reranker: true,
    embedding_model: '',
    reranker_model: '',
    chunk_size: 512,
    chunk_overlap: 50,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchConfig = async () => {
    try {
      const result = await getConfigAPI();
      if (result.error) throw new Error(result.error);
      setConfig(prev => ({ ...prev, ...result }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await updateConfigAPI(config);
      if (result.error) throw new Error(result.error);
      setMessage({ type: 'success', text: 'IntelliRAG configuration updated successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Loading configuration settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-['Plus_Jakarta_Sans']">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-['Outfit']">
            Pipeline Configuration
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tune runtime retrieval parameters, reranking thresholds, and chunking strategy.
          </p>
        </div>
      </div>

      {/* Toast Alert */}
      {message && (
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center gap-3 text-xs shadow-xs transition-all',
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          )}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Retrieval Parameters Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 space-y-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-['Outfit']">
              Retrieval & Re-ranking Settings
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Top-K Retrieval Candidates
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.top_k_retrieval ?? 10}
                onChange={(e) => handleChange('top_k_retrieval', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Number of chunks fetched in the initial vector search.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Top-K Re-rank Chunks
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.top_k_rerank ?? 5}
                onChange={(e) => handleChange('top_k_rerank', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Final top chunks passed to Groq LLM after Cross-Encoder evaluation.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Similarity Score Threshold
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={config.score_threshold ?? 0}
                onChange={(e) => handleChange('score_threshold', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Minimum similarity score required to keep a chunk.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Hybrid Search (Dense + BM25)</span>
                  <span className="text-[11px] text-slate-500">Combines keyword and semantic vectors</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(config.use_hybrid)}
                  onChange={(e) => handleChange('use_hybrid', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Cross-Encoder Re-ranker</span>
                  <span className="text-[11px] text-slate-500">Re-scores candidates for precision</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(config.use_reranker)}
                  onChange={(e) => handleChange('use_reranker', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Text Chunking Strategy Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 space-y-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-['Outfit']">
              Text Chunking Strategy
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Chunk Size (Tokens / Characters)
              </label>
              <input
                type="number"
                value={config.chunk_size ?? 512}
                onChange={(e) => handleChange('chunk_size', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Default 512 characters per chunk.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Chunk Overlap
              </label>
              <input
                type="number"
                value={config.chunk_overlap ?? 50}
                onChange={(e) => handleChange('chunk_overlap', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Sliding window overlap between consecutive chunks.</p>
            </div>
          </div>
        </div>

        {/* Model Infrastructure Info */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Cpu className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-['Outfit']">
              Model Checkpoints
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">Embedding Model</span>
              <p className="text-xs font-mono font-bold text-blue-700 truncate">
                {config.embedding_model || 'sentence-transformers/all-MiniLM-L6-v2'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">Re-ranker Model</span>
              <p className="text-xs font-mono font-bold text-purple-700 truncate">
                {config.reranker_model || 'cross-encoder/ms-marco-MiniLM-L-6-v2'}
              </p>
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Applying Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}