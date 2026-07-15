import { useEffect } from 'react';
import { useFileStore } from '../../store/fileStore';
import { useAuthStore } from '../../store/authStore';
import FileUploader from './FileUploader';
import { TbFile, TbDownload, TbTrash, TbEdit } from 'react-icons/tb';

export default function FileList({ roomId, isOwner }) {
  const { files, fetchFiles, deleteFile, loading } = useFileStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchFiles(roomId);
  }, [roomId, fetchFiles]);

  const handleDelete = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      await deleteFile(fileId);
    }
  };

  return (
    <div className="space-y-6">
      <FileUploader roomId={roomId} />

      <div>
        <h3 className="text-lg font-bold text-white mb-4">Workspace Files</h3>
        {loading && files.length === 0 ? (
          <p className="text-surface-400 text-sm">Loading files...</p>
        ) : files.length === 0 ? (
          <div className="card p-8 text-center text-surface-400">
            <TbFile size={48} className="mx-auto mb-3 opacity-20" />
            <p>No files uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map(file => (
              <div key={file._id} className="card p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-800 flex flex-shrink-0 items-center justify-center">
                  <TbFile size={20} className="text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-surface-450 mt-1">
                    {(file.size / 1024).toFixed(1)} KB • By {file.uploader?.name || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm flex-1 justify-center">
                      <TbDownload size={14} /> Download
                    </a>
                    {(isOwner || file.uploader?._id === user._id) && (
                      <button onClick={() => handleDelete(file._id)} className="btn-danger btn-sm p-1.5" title="Delete">
                        <TbTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
