import { useState, useEffect, useCallback } from 'react';
import { cn } from '../utils/helpers';
import { 
  Plus, 
  FileText, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Eye, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Search,
  Database,
  FileCode,
  Folder,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { addDocumentsAPI, uploadDocumentsAPI, listDocumentsAPI, deleteDocumentsAPI } from '../services/api';

const CHUNK_COLORS = [
  'bg-blue-50 text-blue-600 border-blue-200/80',
  'bg-purple-50 text-purple-600 border-purple-200/80',
  'bg-emerald-50 text-emerald-600 border-emerald-200/80',
  'bg-rose-50 text-rose-600 border-rose-200/80',
  'bg-amber-50 text-amber-600 border-amber-200/80',
  'bg-cyan-50 text-cyan-600 border-cyan-200/80',
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add document modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMethod, setAddMethod] = useState('file'); // 'file', 'text', 'json'
  const [docContent, setDocContent] = useState('');
  const [docMetadata, setDocMetadata] = useState('{"source": "manual"}');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Detail preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIds, setDeleteIds] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listDocumentsAPI(limit, offset);
      if (result.error) throw new Error(result.error);
      setDocuments(result.documents || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAddDocument = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (addMethod === 'file') {
        if (selectedFiles.length === 0) {
          throw new Error('Please select at least one file or PDF to upload.');
        }

        setIsLoading(true);
        const result = await uploadDocumentsAPI(selectedFiles);
        if (result.error) throw new Error(result.error);

        setSuccess(`Successfully uploaded ${selectedFiles.length} file(s) (${result.count} chunks indexed)`);
        setShowAddModal(false);
        setSelectedFiles([]);
        fetchDocuments();
        return;
      }

      let documentsToAdd = [];

      if (addMethod === 'text') {
        let metadata;
        try {
          metadata = JSON.parse(docMetadata);
        } catch {
          metadata = { source: 'manual' };
        }
        if (!docContent.trim()) {
          throw new Error('Document content cannot be empty.');
        }
        documentsToAdd = [{ content: docContent, metadata }];
      } else if (addMethod === 'json') {
        try {
          documentsToAdd = JSON.parse(docContent);
          if (!Array.isArray(documentsToAdd)) {
            throw new Error('JSON must be an array of documents');
          }
        } catch {
          throw new Error('Invalid JSON format');
        }
      }

      if (documentsToAdd.length === 0) {
        throw new Error('No documents to add');
      }

      setIsLoading(true);
      const result = await addDocumentsAPI(documentsToAdd);
      if (result.error) throw new Error(result.error);

      setSuccess(`Added ${result.count} document(s)`);
      setShowAddModal(false);
      setDocContent('');
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!window.confirm(`Are you sure you want to delete chunk ${id}?`)) return;
    try {
      setIsLoading(true);
      await deleteDocumentsAPI([id]);
      setSuccess(`Deleted chunk ${id}`);
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocuments = async () => {
    if (!confirmDelete) return;
    const ids = deleteIds.split('\n').map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) return;

    setError(null);
    try {
      const result = await deleteDocumentsAPI(ids);
      if (result.error) throw new Error(result.error);
      setSuccess(`Deleted ${result.deleted} document(s)`);
      setShowDeleteModal(false);
      setDeleteIds('');
      setConfirmDelete(false);
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (doc.id && String(doc.id).toLowerCase().includes(q)) ||
      (doc.content && doc.content.toLowerCase().includes(q)) ||
      (doc.metadata?.source && String(doc.metadata.source).toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-['Plus_Jakarta_Sans']">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <Folder className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-['Outfit']">
              Document Knowledge Base
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your vector store indices, upload PDFs, and inspect chunks in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete by ID</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Add / Upload Documents</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Chunks Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">TOTAL CHUNKS</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-0.5">{total}</p>
            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <span>↑ 12% from last upload</span>
            </p>
          </div>
        </div>

        {/* Supported Formats Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileCode className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">SUPPORTED FORMATS</p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100 font-bold text-[10px]">
                PDF
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[10px]">
                TXT
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 font-bold text-[10px]">
                MD
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px]">
                JSON
              </span>
            </div>
          </div>
        </div>

        {/* Vector Index Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Database className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-['Outfit']">VECTOR INDEX</p>
              <button
                onClick={fetchDocuments}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                title="Refresh Documents"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold text-slate-900">Live FAISS Index</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chunks by content, ID, or source name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="text-slate-800 font-bold">{filteredDocuments.length}</span> of {total} chunks
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {isLoading && documents.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs font-semibold text-slate-600">Loading indexed documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="h-7 w-7 text-slate-500" />
            </div>
            <p className="text-base font-bold text-slate-800 font-['Outfit']">No documents indexed yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload a PDF file or paste text to build your retrieval database.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5 mt-2 shadow-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload PDF Now</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold font-['Outfit'] text-[11px]">
                <tr>
                  <th className="py-3.5 px-6">CHUNK ID</th>
                  <th className="py-3.5 px-6">CONTENT PREVIEW</th>
                  <th className="py-3.5 px-6">SOURCE & METADATA</th>
                  <th className="py-3.5 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredDocuments.map((doc, idx) => {
                  const source = doc.metadata?.source || 'Document';
                  const page = doc.metadata?.page || doc.metadata?.page_number;
                  const colorClass = CHUNK_COLORS[idx % CHUNK_COLORS.length];

                  return (
                    <tr key={doc.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      {/* Chunk ID Pill */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={cn('px-3 py-1 rounded-lg font-mono text-xs font-bold border', colorClass)}>
                          {doc.id}
                        </span>
                      </td>

                      {/* Content Preview */}
                      <td className="py-4 px-6 max-w-md">
                        <p className="text-slate-700 leading-relaxed font-normal line-clamp-2">
                          {doc.content}
                        </p>
                      </td>

                      {/* Source & Metadata */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* Red PDF Icon */}
                          <span className="h-5 w-5 rounded bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            PDF
                          </span>
                          <span className="text-slate-700 font-medium truncate max-w-[200px]" title={source}>
                            {source}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({doc.content?.length || 0} chars)
                          </span>
                          {page && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold border border-emerald-200">
                              p-{page}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 transition-colors"
                            title="Preview Content"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(doc.id)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
                            title="Delete Chunk"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-700">1-10</span> of {total} chunks
          </span>

          <div className="flex items-center gap-1">
            <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button className="h-8 w-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              1
            </button>
            <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-semibold">
              2
            </button>
            <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-semibold">
              3
            </button>
            <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-semibold">
              4
            </button>
            <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 text-xs">
              ...
            </button>
            <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-xs">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add Document */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-['Outfit']">
                <Plus className="h-4 w-4 text-blue-600" />
                Add Documents to IntelliRAG
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Method Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddMethod('file')}
                className={cn(
                  'py-2 rounded-lg transition-all',
                  addMethod === 'file' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                File Upload (PDF)
              </button>
              <button
                type="button"
                onClick={() => setAddMethod('text')}
                className={cn(
                  'py-2 rounded-lg transition-all',
                  addMethod === 'text' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Raw Text
              </button>
              <button
                type="button"
                onClick={() => setAddMethod('json')}
                className={cn(
                  'py-2 rounded-lg transition-all',
                  addMethod === 'json' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                JSON Array
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-4">
              {addMethod === 'file' ? (
                <div>
                  <label
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files) {
                        setSelectedFiles(Array.from(e.dataTransfer.files));
                      }
                    }}
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all',
                      isDragging
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
                    )}
                  >
                    <Upload className="h-8 w-8 text-blue-600" />
                    <p className="text-xs font-bold text-slate-800">
                      Click to choose or Drag & Drop PDF files here
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Supported: .pdf, .txt, .md, .json (Max 50MB)
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt,.md,.json,.jsonl"
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                      className="hidden"
                    />
                  </label>

                  {selectedFiles.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-[11px] font-bold text-blue-700">
                        Selected Files ({selectedFiles.length}):
                      </p>
                      {selectedFiles.map((f, i) => (
                        <p key={i} className="text-xs text-slate-700 truncate font-mono">
                          📄 {f.name} ({(f.size / 1024).toFixed(1)} KB)
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      {addMethod === 'text' ? 'Document Content' : 'JSON Documents Array'}
                    </label>
                    <textarea
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      rows={6}
                      placeholder={
                        addMethod === 'text'
                          ? 'Paste document text here...'
                          : '[{"content": "Doc text", "metadata": {"source": "demo"}}]'
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {addMethod === 'text' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Metadata (JSON format)
                      </label>
                      <input
                        type="text"
                        value={docMetadata}
                        onChange={(e) => setDocMetadata(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Index Documents</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview Document */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-['Outfit']">
                <Eye className="h-4 w-4 text-blue-600" />
                Chunk Details ({previewDoc.id})
              </h3>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-['Outfit']">Content</p>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {previewDoc.content}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-['Outfit']">Metadata</p>
                <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-blue-700 text-[11px] font-mono overflow-x-auto">
                  {JSON.stringify(previewDoc.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Documents */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2 font-['Outfit']">
                <Trash2 className="h-4 w-4" />
                Delete Documents by IDs
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter Chunk IDs to delete (one ID per line). This will permanently delete them from the vector index.
            </p>

            <textarea
              value={deleteIds}
              onChange={(e) => setDeleteIds(e.target.value)}
              rows={4}
              placeholder="chunk_0&#10;chunk_1"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 border-slate-300 bg-white"
              />
              <span>I confirm I want to permanently delete these chunks</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDocuments}
                disabled={!confirmDelete || !deleteIds.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}