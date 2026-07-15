import { useEffect, useState } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { useSearchParams } from 'react-router-dom';
import DocumentEditor from './DocumentEditor';
import DocumentViewer from './DocumentViewer';
import { TbFileText, TbX } from 'react-icons/tb';

export default function DocumentPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const docId = searchParams.get('doc');
  const { currentDocument, fetchDocument, loading } = useDocumentStore();

  useEffect(() => {
    if (docId) {
      fetchDocument(docId);
    }
  }, [docId, fetchDocument]);

  const handleClose = () => {
    searchParams.delete('doc');
    setSearchParams(searchParams);
  };

  if (!docId) {
    return (
      <div className="flex-1 h-full bg-surface-900 flex flex-col items-center justify-center text-surface-500">
        <TbFileText size={48} className="opacity-20 mb-4" />
        <p>No document selected</p>
      </div>
    );
  }

  if (loading || !currentDocument) {
    return (
      <div className="flex-1 h-full bg-surface-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-900">
      <div className="h-10 border-b border-surface-800 bg-surface-950 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 text-sm font-medium text-surface-200">
          <TbFileText className="text-primary-400" />
          <span className="truncate max-w-[200px]">{currentDocument.title}</span>
        </div>
        <button onClick={handleClose} className="p-1 hover:bg-surface-800 rounded text-surface-400 hover:text-white transition-colors">
          <TbX size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {currentDocument.type === 'pdf' ? (
          <DocumentViewer doc={currentDocument} />
        ) : (
          <DocumentEditor doc={currentDocument} />
        )}
      </div>
    </div>
  );
}
