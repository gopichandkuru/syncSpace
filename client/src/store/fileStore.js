import { create } from 'zustand';
import api from '../services/api';

export const useFileStore = create((set, get) => ({
  files: [],
  loading: false,
  error: null,

  fetchFiles: async (roomId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/files/room/${roomId}`);
      set({ files: res.data.data.files, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch files', loading: false });
    }
  },

  uploadFile: async (roomId, formData) => {
    set({ loading: true, error: null });
    try {
      formData.append('roomId', roomId);
      const res = await api.post('/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set((state) => ({ 
        files: [res.data.data.file, ...state.files],
        loading: false 
      }));
      return res.data.data.file;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to upload file', loading: false });
      throw err;
    }
  },

  renameFile: async (fileId, newName) => {
    try {
      const res = await api.patch(`/files/${fileId}`, { name: newName });
      set((state) => ({
        files: state.files.map(f => f._id === fileId ? res.data.data.file : f)
      }));
    } catch (err) {
      throw err;
    }
  },

  deleteFile: async (fileId) => {
    try {
      await api.delete(`/files/${fileId}`);
      set((state) => ({
        files: state.files.filter(f => f._id !== fileId)
      }));
    } catch (err) {
      throw err;
    }
  },
}));
