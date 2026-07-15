import { useEffect, useState } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { useAuthStore } from '../../store/authStore';
import { TbFileText, TbUpload, TbTrash, TbPlus, TbFileCode, TbPdf } from 'react-icons/tb';
import { useNavigate } from 'react-router-dom';

export default function DocumentList({ roomId, isOwner, slug }) {
  const { documents, fetchDocuments, deleteDocument, uploadDocument, loading } = useDocumentStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments(roomId);
  }, [roomId, fetchDocuments]);

  const handleCreateNew = async (type) => {
    // We can directly jump to collaborate page with a new doc mode, but it's easier to create it here first
    const title = type === 'markdown' ? 'New Markdown Document' : 'New Text Document';
    const formData = new FormData();
    formData.append('title', title);
    formData.append('type', type);
    formData.append('content', ''); // empty
    try {
      setUploading(true);
      const doc = await uploadDocument(roomId, formData);
      navigate(`/room/${slug}/collaborate?doc=${doc._id}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      try {
        setUploading(true);
        const doc = await uploadDocument(roomId, formData);
        navigate(`/room/${slug}/collaborate?doc=${doc._id}`);
      } catch (err) {
        console.error(err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm('Delete this document permanently?')) {
      await deleteDocument(docId);
    }
  };

  const getIcon = (type) => {
    if (type === 'pdf') return <TbPdf size={20} className="text-red-400" />;
    if (type === 'markdown') return <TbFileCode size={20} className="text-blue-400" />;
    return <TbFileText size={20} className="text-primary-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => handleCreateNew('text')} disabled={uploading} className="btn-primary">
          <TbPlus size={16} /> New Text Doc
        </button>
        <button onClick={() => handleCreateNew('markdown')} disabled={uploading} className="btn-secondary">
          <TbPlus size={16} /> New Markdown
        </button>
        <label className="btn-secondary cursor-pointer">
          <TbUpload size={16} /> {uploading ? 'Uploading...' : 'Upload PDF / Doc'}
          <input type="file" className="hidden" accept=".pdf,.txt,.md,.docx" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4">Workspace Documents</h3>
        {loading && documents.length === 0 ? (
          <p className="text-surface-400 text-sm">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="card p-8 text-center text-surface-400">
            <TbFileText size={48} className="mx-auto mb-3 opacity-20" />
            <p>No documents created yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map(doc => (
              <div key={doc._id} className="card p-4 flex items-center justify-between group hover:border-primary-500/50 transition-colors cursor-pointer" onClick={() => navigate(`/room/${slug}/collaborate?doc=${doc._id}`)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
                    {getIcon(doc.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
                    <p className="text-xs text-surface-450 mt-0.5 capitalize">{doc.type} • By {doc.creator?.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  {(isOwner || doc.creator?._id === user._id) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }} 
                      className="p-2 text-surface-500 hover:text-red-400 hover:bg-surface-800 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete"
                    >
                      <TbTrash size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
