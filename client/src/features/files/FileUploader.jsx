import { useState, useRef } from 'react';
import { useFileStore } from '../../store/fileStore';
import { TbUpload, TbX, TbFile } from 'react-icons/tb';

export default function FileUploader({ roomId, onUploadComplete }) {
  const { uploadFile, loading } = useFileStore();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadFile(roomId, formData);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
        dragActive ? 'border-primary-500 bg-primary-900/20' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
      />
      <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center mb-4">
        <TbUpload size={24} className="text-surface-400" />
      </div>
      <p className="text-white font-medium mb-1">Drag and drop your file here</p>
      <p className="text-surface-400 text-sm mb-4">Or click to browse your files</p>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Uploading...' : 'Browse Files'}
      </button>
    </div>
  );
}
