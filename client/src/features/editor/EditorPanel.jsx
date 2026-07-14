import { useCallback, useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as Y from 'yjs';
import { useSocket } from '../../context/SocketContext';
import { useRoomStore } from '../../store/roomStore';
import { useEditorStore } from '../../store/editorStore';
import { TbCopy, TbDownload, TbCheck, TbWand } from 'react-icons/tb';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
];

const EXT = { javascript: 'js', typescript: 'ts', python: 'py', java: 'java', cpp: 'cpp', html: 'html', css: 'css', json: 'json', markdown: 'md', rust: 'rs', go: 'go' };

export default function EditorPanel() {
  const { currentRoom, currentSession } = useRoomStore();
  const { language, setLanguage, theme: editorTheme, setTheme: setEditorTheme, fontSize, setFontSize } = useEditorStore();
  const { emitYjsSync, emitYjsUpdate, emitLanguageChange, onYjsSync, onYjsUpdate, onLanguageChange, isConnected, emitTypingStart, emitTypingStop } = useSocket();

  const [editorValue, setEditorValue] = useState('// Start coding here...\n');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved'
  const [copied, setCopied] = useState(false);

  const ydocRef = useRef(null);
  const editorRef = useRef(null);
  const isApplyingUpdate = useRef(false);
  const saveTimer = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!currentRoom) return;

    const doc = new Y.Doc();
    ydocRef.current = doc;
    const ytext = doc.getText('codestate');

    // Send state vector to server to get full state
    const stateVector = Y.encodeStateVector(doc);
    emitYjsSync(currentRoom._id, 'sv', Array.from(stateVector));

    const handleLocalUpdate = (update, origin) => {
      if (origin !== 'socket' && isConnected) {
        setSaveStatus('saving');
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSaveStatus('saved'), 1500);
        emitYjsUpdate(currentRoom._id, Array.from(update));
      }
    };
    doc.on('update', handleLocalUpdate);

    const cleanSync = onYjsSync(({ type, data }) => {
      if (type === 'update' && data?.length) {
        isApplyingUpdate.current = true;
        try {
          Y.applyUpdate(doc, new Uint8Array(data), 'socket');
          setEditorValue(ytext.toString() || '// Start coding here...\n');
        } catch (e) { console.warn('Yjs sync error:', e); }
        isApplyingUpdate.current = false;
      }
    });

    const cleanUpdate = onYjsUpdate(({ update }) => {
      isApplyingUpdate.current = true;
      try {
        Y.applyUpdate(doc, new Uint8Array(update), 'socket');
        setEditorValue(ytext.toString() || '// Start coding here...\n');
      } catch (e) { console.warn('Yjs update error:', e); }
      isApplyingUpdate.current = false;
    });

    const cleanLang = onLanguageChange(({ language: newLang, name }) => {
      setLanguage(newLang);
      toast(`${name} changed language to ${newLang}`, { icon: '📝', duration: 2000 });
    });

    return () => {
      doc.off('update', handleLocalUpdate);
      cleanSync(); cleanUpdate(); cleanLang();
      doc.destroy();
      clearTimeout(saveTimer.current);
    };
  }, [currentRoom?._id, isConnected]);

  const yjsUpdateTimer = useRef(null);

  const handleEditorChange = useCallback((value) => {
    if (isApplyingUpdate.current) return;
    setEditorValue(value || '');

    // Debounce the heavy Yjs replace-all transaction to reduce CRDT conflicts
    // during concurrent typing — batches rapid keystrokes into a single op
    clearTimeout(yjsUpdateTimer.current);
    yjsUpdateTimer.current = setTimeout(() => {
      const doc = ydocRef.current;
      if (!doc) return;
      const ytext = doc.getText('codestate');
      doc.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, value || '');
      }, 'local');
    }, 80);

    emitTypingStart(currentRoom?._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(currentRoom?._id);
    }, 2000);
  }, []);

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    emitLanguageChange(currentRoom._id, lang);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const handleDownload = () => {
    const ext = EXT[language] || 'txt';
    const blob = new Blob([editorValue], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex flex-col h-full bg-surface-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 h-12 bg-surface-900 border-b border-surface-800 px-3 flex items-center gap-2">
        {/* Language selector */}
        <select
          value={language}
          onChange={handleLanguageChange}
          className="bg-surface-800 border border-surface-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        {/* Theme selector */}
        <select
          value={editorTheme}
          onChange={(e) => setEditorTheme(e.target.value)}
          className="bg-surface-800 border border-surface-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="vs-dark">Dark</option>
          <option value="light">Light</option>
        </select>

        {/* Font size */}
        <select
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="bg-surface-800 border border-surface-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {[12, 13, 14, 15, 16, 18, 20, 22].map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {/* Save indicator */}
          <span className={`text-xs transition-colors ${saveStatus === 'saving' ? 'text-yellow-400' : 'text-green-400'}`}>
            {saveStatus === 'saving' ? '● Saving…' : '✓ Saved'}
          </span>

          <button onClick={handleFormat} title="Format Document" className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors">
            <TbWand size={15} />
          </button>
          <button onClick={handleCopy} title="Copy code" className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors">
            {copied ? <TbCheck size={15} className="text-green-400" /> : <TbCopy size={15} />}
          </button>
          <button onClick={handleDownload} title="Download file" className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors">
            <TbDownload size={15} />
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={language}
          theme={editorTheme}
          value={editorValue}
          onChange={handleEditorChange}
          onMount={(editor) => { editorRef.current = editor; }}
          options={{
            fontSize,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 },
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
          }}
        />
      </div>
    </div>
  );
}
