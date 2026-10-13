import { useState, useCallback, useRef, useEffect } from 'react';
import { cn, formatConfidence, formatMatchScore } from '../utils/helpers';
import { 
  Send, 
  Loader2, 
  Copy, 
  Check, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Zap,
  Sliders,
  History,
  Layers,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Trash2,
  Bot,
} from 'lucide-react';
import { queryAPI, queryStreamAPI, batchQueryAPI } from '../services/api';

const SAMPLE_QUESTIONS = [
  "What is light and its primary properties?",
  "Difference between real image and virtual image?",
  "State Snell's law of refraction and formula",
  "Why is AMBULANCE written in reverse?",
  "What is the refractive index of diamond?",
];

const CHUNK_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
];

export default function QueryPage() {
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [metadata, setMetadata] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [topK, setTopK] = useState(5);
  const [useReranker, setUseReranker] = useState(true);
  const [history, setHistory] = useState([]);
  const [showBatch, setShowBatch] = useState(false);
  const [batchQueries, setBatchQueries] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [copied, setCopied] = useState(false);
  const [expandedSource, setExpandedSource] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [answer, isStreaming, scrollToBottom]);

  const handleQuery = async (stream = isStreaming, queryText = query) => {
    const textToQuery = (queryText || '').trim();
    if (!textToQuery) return;
    
    setIsLoading(true);
    setError(null);
    setAnswer('');
    setSources([]);
    setConfidence(0);
    setMetadata({});

    try {
      if (stream) {
        setIsStreaming(true);
        let accumulated = '';
        await queryStreamAPI(textToQuery, { top_k: topK, use_reranker: useReranker }, (token) => {
          accumulated += token;
          setAnswer(accumulated);
        });
        setIsStreaming(false);
        setHistory(prev => [
          { query: textToQuery, answer: accumulated, timestamp: new Date().toISOString() },
          ...prev.slice(0, 9)
        ]);
      } else {
        const result = await queryAPI(textToQuery, { top_k: topK, use_reranker: useReranker });
        setAnswer(result.answer);
        setSources(result.sources || []);
        setConfidence(result.confidence || 0);
        setMetadata(result.metadata || {});
        setHistory(prev => [
          { query: textToQuery, answer: result.answer, timestamp: new Date().toISOString() },
          ...prev.slice(0, 9)
        ]);
      }
    } catch (err) {
      setError(err.message || 'Failed to execute query');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleBatchQuery = async () => {
    const queries = batchQueries.split('\n').map(q => q.trim()).filter(Boolean);
    if (queries.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await batchQueryAPI(queries, { top_k: topK, use_reranker: useReranker });
      setBatchResults(result.results || []);
    } catch (err) {
      setError(err.message || 'Batch query failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-['Plus_Jakarta_Sans']">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Hybrid Dense + Sparse & Cross-Encoder</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-['Outfit']">
            Ask Your Documents
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Ground your answers directly in your uploaded knowledge base with high-precision citations.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center self-start md:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setShowBatch(false)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
              !showBatch
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Single Query
          </button>
          <button
            onClick={() => setShowBatch(true)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              showBatch
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Batch Mode</span>
          </button>
        </div>
      </div>

      {/* Main Query Card */}
      {!showBatch ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex flex-col gap-4">
            {/* Query Input */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleQuery();
                  }
                }}
                placeholder="Ask any question from your uploaded documents... (Press Enter to send)"
                rows={3}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-sm leading-relaxed transition-all"
                disabled={isLoading}
              />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-bold whitespace-nowrap flex items-center gap-1 font-['Outfit']">
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                Examples:
              </span>
              {SAMPLE_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(q);
                    handleQuery(isStreaming, q);
                  }}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <span>{q}</span>
                  <ArrowRight className="h-2.5 w-2.5 opacity-50" />
                </button>
              ))}
            </div>

            {/* Toolbar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                {/* Streaming Toggle */}
                <button
                  type="button"
                  onClick={() => setIsStreaming(!isStreaming)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                    isStreaming
                      ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  <Zap className={cn('h-3.5 w-3.5', isStreaming ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
                  <span>Stream</span>
                </button>

                {/* Reranker Toggle */}
                <button
                  type="button"
                  onClick={() => setUseReranker(!useReranker)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                    useReranker
                      ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  <Sparkles className={cn('h-3.5 w-3.5', useReranker ? 'text-blue-600' : 'text-slate-400')} />
                  <span>Re-ranker</span>
                </button>

                {/* Top K Selector */}
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500 font-semibold">Top K:</span>
                  <div className="flex items-center gap-1">
                    {[3, 5, 10].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setTopK(k)}
                        className={cn(
                          'px-2 py-0.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer',
                          topK === k
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Ask Button */}
              <button
                onClick={() => handleQuery()}
                disabled={isLoading || !query.trim()}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm',
                  isLoading || !query.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 cursor-pointer scale-100 hover:scale-[1.02]'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isStreaming ? 'Streaming...' : 'Retrieving...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Ask IntelliRAG</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Batch Query Form */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-['Outfit']">
            <Layers className="h-4 w-4 text-blue-600" />
            Batch Queries Execution
          </h3>
          <p className="text-xs text-slate-500">
            Type one query per line. The pipeline will process and return answers for all questions simultaneously.
          </p>
          <textarea
            value={batchQueries}
            onChange={(e) => setBatchQueries(e.target.value)}
            rows={5}
            placeholder="What is reflection?&#10;What is refraction?&#10;What is mirror formula?"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <div className="flex justify-end">
            <button
              onClick={handleBatchQuery}
              disabled={isLoading || !batchQueries.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Process Batch
            </button>
          </div>

          {/* Batch Results */}
          {batchResults.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-800 font-['Outfit']">Results ({batchResults.length})</h4>
              {batchResults.map((res, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-blue-700">Q: {res.query}</p>
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{res.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-800 text-sm shadow-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Query Execution Error</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Answer Presentation Card */}
      {(answer || isStreaming) && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          {/* Answer Header */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Bot className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 font-['Outfit']">
                  Grounded Intelligence Response
                </h3>
                <span className="text-xs text-slate-500">Validated against vector knowledge chunks</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Confidence Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Confidence:</span>
                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', formatConfidence(confidence).class)}>
                  {formatConfidence(confidence).label} ({formatConfidence(confidence).percent}%)
                </span>
              </div>

              {/* Copy Button */}
              <button
                onClick={() => copyToClipboard(answer)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Copy response"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Answer Content */}
          <div className="text-slate-800 text-[15px] leading-relaxed whitespace-pre-wrap font-normal selection:bg-blue-100">
            {answer}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse rounded-xs align-middle" />
            )}
          </div>

          <div ref={messagesEndRef} />

          {/* Sources Section */}
          {sources.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-['Outfit']">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  Retrieved Sources & Citations ({sources.length})
                </span>
                <span className="text-[11px] text-blue-600 font-bold">Ranked by Cross-Encoder</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sources.map((source, idx) => {
                  const isExpanded = expandedSource === idx;
                  const scoreDisplay = formatMatchScore(source.score);
                  const pageNumber = source.metadata?.page || source.metadata?.page_number;
                  const sourceName = source.metadata?.source || 'Document';
                  const colorClass = CHUNK_COLORS[idx % CHUNK_COLORS.length];

                  return (
                    <div
                      key={source.chunk_id || idx}
                      className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-blue-300 transition-all space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 truncate flex items-center gap-2">
                          <span className={cn('px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border', colorClass)}>
                            #{idx + 1}
                          </span>
                          <span className="truncate max-w-[150px]">{sourceName}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {pageNumber && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                              Page {pageNumber}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                            {scoreDisplay}% match
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-3 bg-white p-3 rounded-lg border border-slate-200 font-sans">
                        {source.content}
                      </p>

                      <button
                        type="button"
                        onClick={() => setExpandedSource(isExpanded ? null : idx)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <><span>Show less</span><ChevronUp className="h-3 w-3" /></>
                        ) : (
                          <><span>Expand full chunk</span><ChevronDown className="h-3 w-3" /></>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 bg-white rounded-lg text-slate-800 text-xs whitespace-pre-wrap border border-slate-200 font-sans">
                          {source.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Query History Drawer */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 font-['Outfit']">
              <History className="h-4 w-4 text-blue-600" />
              Recent Questions History
            </h4>
            <button
              onClick={clearHistory}
              className="text-xs text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>

          <div className="space-y-2">
            {history.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4 hover:border-blue-200 transition-all"
              >
                <div className="truncate flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.query}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.answer}</p>
                </div>
                <button
                  onClick={() => {
                    setQuery(item.query);
                    handleQuery(isStreaming, item.query);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Ask Again
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}