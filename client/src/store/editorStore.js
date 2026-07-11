import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEditorStore = create(
  persist(
    (set) => ({
      language: 'javascript',
      theme: 'vs-dark',
      fontSize: 14,
      wordWrap: 'on',
      minimap: false,
      lineNumbers: 'on',
      autoSave: true,
      lastSaved: null,
      isDirty: false,

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setWordWrap: (wordWrap) => set({ wordWrap }),
      setMinimap: (minimap) => set({ minimap }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setLastSaved: () => set({ lastSaved: new Date().toISOString(), isDirty: false }),
      markDirty: () => set({ isDirty: true }),
    }),
    { name: 'syncspace-editor' }
  )
);
