import { create } from 'zustand';
import api from '../services/api';

export const useDocumentStore = create((set, get) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,

  fetchDocuments: async (roomId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/documents/room/${roomId}`);
      set({ documents: res.data.data.documents, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch documents', loading: false });
    }
  },

  fetchDocument: async (docId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/documents/${docId}`);
      set({ currentDocument: res.data.data.document, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch document', loading: false });
    }
  },

  uploadDocument: async (roomId, formData) => {
    set({ loading: true, error: null });
    try {
      formData.append('roomId', roomId);
      const res = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set((state) => ({ 
        documents: [res.data.data.document, ...state.documents],
        loading: false 
      }));
      return res.data.data.document;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to upload document', loading: false });
      throw err;
    }
  },

  saveVersion: async (docId, content) => {
    try {
      const res = await api.post(`/documents/${docId}/versions`, { content });
      set({ currentDocument: res.data.data.document });
    } catch (err) {
      console.error('Failed to save document version:', err);
    }
  },

  deleteDocument: async (docId) => {
    try {
      await api.delete(`/documents/${docId}`);
      set((state) => ({
        documents: state.documents.filter(d => d._id !== docId),
        currentDocument: state.currentDocument?._id === docId ? null : state.currentDocument
      }));
    } catch (err) {
      throw err;
    }
  },

  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  
  addDocument: (doc) => set((state) => {
    // avoid duplicates
    if (state.documents.find(d => d._id === doc._id)) return state;
    return { documents: [doc, ...state.documents] };
  }),
}));
