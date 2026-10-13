import { useState, useEffect } from 'react';
import { cn } from '../utils/helpers';
import { 
  Loader2, 
  RefreshCw, 
  Database, 
  Server, 
  BrainCircuit, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle,
  Cpu,
  Layers,
} from 'lucide-react';
import { getStatsAPI, healthCheckAPI } from '../services/api';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsResult, healthResult] = await Promise.all([
        getStatsAPI(),
        healthCheckAPI(),
      ]);
      
      if (statsResult.error) throw new Error(statsResult.error);
      if (healthResult.error) throw new Error(healthResult.error);
      
      setStats(statsResult);
      setHealth(healthResult);
    } catch (err) {
      setError(err.message || 'Failed to load telemetry stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Gathering pipeline analytics...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const config = stats?.config || {};
  const isHealthy = health?.status === 'healthy';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-['Plus_Jakarta_Sans']">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-['Outfit']">
            IntelliRAG Telemetry & Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time status of vector indices, hybrid retrievers, and LLM orchestration.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all shadow-xs cursor-pointer"
          title="Refresh Analytics"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">DOCUMENTS</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{stats?.total_documents ?? 0}</p>
          <p className="text-xs text-slate-500">Files ingested into pipeline</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">TOTAL CHUNKS</span>
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BrainCircuit className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{stats?.total_chunks ?? 0}</p>
          <p className="text-xs text-slate-500">Indexed vector embeddings</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">EMBEDDING DIM</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{stats?.embedding_dimension ?? 384}</p>
          <p className="text-xs text-slate-500">all-MiniLM-L6-v2 vector size</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">VECTOR STORE</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HardDrive className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">{stats?.index_type || 'FAISS IVF'}</p>
          <p className="text-xs text-slate-500">Inverted file with quantizer</p>
        </div>
      </div>

      {/* Visual Pipeline Architecture Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-['Outfit']">
            <Cpu className="h-4 w-4 text-blue-600" />
            End-To-End IntelliRAG Architecture
          </h3>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            Active Workflow
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Step 1</span>
            <p className="text-xs font-bold text-slate-800">User Query Input</p>
            <p className="text-xs text-slate-500">Natural language prompt tokenization</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Step 2</span>
            <p className="text-xs font-bold text-slate-800">Hybrid Search (RRF)</p>
            <p className="text-xs text-slate-500">Dense Vector (70%) + Sparse BM25 (30%)</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Step 3</span>
            <p className="text-xs font-bold text-slate-800">Cross-Encoder Re-rank</p>
            <p className="text-xs text-slate-500">ms-marco-MiniLM contextual sorting</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Step 4</span>
            <p className="text-xs font-bold text-slate-800">Groq LLM Generation</p>
            <p className="text-xs text-slate-500">Synthesizes context with citations</p>
          </div>
        </div>
      </div>

      {/* System Health Overview Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            'h-11 w-11 rounded-xl flex items-center justify-center',
            isHealthy ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
          )}>
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 flex items-center gap-2 font-['Outfit']">
              System Core Health:
              <span className={isHealthy ? 'text-emerald-600' : 'text-rose-600'}>
                {health?.status ? health.status.toUpperCase() : 'UNKNOWN'}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Pipeline Status: {health?.pipeline_ready ? 'Initialized & Ready' : 'Initializing...'}
            </p>
          </div>
        </div>

        <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
          FastAPI + Uvicorn
        </span>
      </div>

      {/* Configuration Grid */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-['Outfit']">
          <Layers className="h-4 w-4 text-blue-600" />
          Active Configuration Parameters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {Object.entries(config).map(([key, value]) => (
            <div key={key} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-['Outfit']">
                {key.replace(/_/g, ' ')}
              </span>
              <p className="text-xs font-mono font-bold text-blue-700 truncate">
                {typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : String(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}