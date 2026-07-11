import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import * as Y from 'yjs';
import { useSocket } from '../context/SocketContext';
import { useRoomStore } from '../store/roomStore';
import { useEditorStore } from '../store/editorStore';
import { useUIStore } from '../store/uiStore';
import ChatPanel from '../features/chat/ChatPanel';
import { TbChevronLeft, TbPlayerPlay, TbCopy, TbDownload, TbSettings } from 'react-icons/tb';
import toast from 'react-hot-toast';

export default function EditorPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentRoom, currentSession, members } = useRoomStore();
  const { isConnected, joinRoom, leaveRoom, emitYjsSync, emitYjsUpdate, emitLanguageChange, onYjsSync, onYjsUpdate, onLanguageChange } = useSocket();

  const { language, setLanguage, theme, setTheme, fontSize, setFontSize } = useEditorStore();
  const { chatOpen, setChatOpen } = useUIStore();

  const [editorValue, setEditorValue] = useState('// Write code here...');
  const [activeUsers, setActiveUsers] = useState([]);

  const ydocRef = useRef(null);
  const editorRef = useRef(null);
  const isApplyingUpdate = useRef(false);

  useEffect(() => {
    if (!currentRoom) {
      navigate(`/room/${slug}`);
      return;
    }

    // Initialize Y.Doc
    const doc = new Y.Doc();
    ydocRef.current = doc;
    const ytext = doc.getText('codestate');

    // Join socket room
    joinRoom(currentRoom._id, currentSession?._id);

    // Document update listener: send local updates to server
    const handleLocalUpdate = (update, origin) => {
      if (origin !== 'socket' && isConnected) {
        emitYjsUpdate(currentRoom._id, Array.from(update));
      }
    };
    doc.on('update', handleLocalUpdate);

    // Sync listener: apply remote updates
    const cleanSync = onYjsSync(({ type, data }) => {
      if (type === 'update') {
        isApplyingUpdate.current = true;
        try {
          Y.applyUpdate(doc, new Uint8Array(data), 'socket');
          setEditorValue(ytext.toString());
        } catch {}
        isApplyingUpdate.current = false;
      }
    });

    const cleanUpdate = onYjsUpdate(({ update }) => {
      isApplyingUpdate.current = true;
      try {
        Y.applyUpdate(doc, new Uint8Array(update), 'socket');
        setEditorValue(ytext.toString());
      } catch {}
      isApplyingUpdate.current = false;
    });

    const cleanLang = onLanguageChange(({ language: newLang, name }) => {
      setLanguage(newLang);
      toast(`${name} changed language to ${newLang}`, { icon: '📝' });
    });

    return () => {
      doc.off('update', handleLocalUpdate);
      cleanSync();
      cleanUpdate();
      cleanLang();
      doc.destroy();
      leaveRoom();
    };
  }, [currentRoom, slug, isConnected, joinRoom, leaveRoom, emitYjsUpdate, onYjsSync, onYjsUpdate, onLanguageChange]);

  const handleEditorChange = (value) => {
    if (isApplyingUpdate.current) return;
    const doc = ydocRef.current;
    if (doc) {
      const ytext = doc.getText('codestate');
      doc.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, value || '');
      }, 'local');
      setEditorValue(value || '');
    }
  };

  const handleLanguageChange = (e) => {
    const nextLang = e.target.value;
    setLanguage(nextLang);
    emitLanguageChange(currentRoom._id, nextLang);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(editorValue);
    toast.success('Code copied to clipboard!');
  };

  const handleDownloadCode = () => {
    const extensions = { javascript: 'js', typescript: 'ts', python: 'py', java: 'java', cpp: 'cpp', html: 'html', css: 'css' };
    const ext = extensions[language] || 'txt';
    const blob = new Blob([editorValue], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_${slug}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-surface-950 overflow-hidden">
      {/* Code Editor Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor Controls Bar */}
        <div className="h-14 border-b border-surface-850 bg-surface-900 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/room/${slug}`} className="p-2 hover:bg-surface-800 rounded-lg text-surface-450 hover:text-white transition-colors">
              <TbChevronLeft size={20} />
            </Link>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-surface-800 border border-surface-700 text-white rounded px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>

            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-surface-800 border border-surface-700 text-white rounded px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="vs-dark">Dark Theme</option>
              <option value="light">Light Theme</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleCopyCode} className="btn-secondary btn-sm" title="Copy Code">
              <TbCopy size={16} />
              <span className="hidden sm:inline">Copy</span>
            </button>
            <button onClick={handleDownloadCode} className="btn-secondary btn-sm" title="Download File">
              <TbDownload size={16} />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button onClick={() => setChatOpen(!chatOpen)} className="btn-primary btn-sm">
              Chat {chatOpen ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Monaco Editor Canvas */}
        <div className="flex-1 relative">
          <MonacoEditor
            height="100%"
            language={language}
            theme={theme}
            value={editorValue}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              fontSize,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
            }}
          />
        </div>
      </div>

      {/* Right Chat Sidebar */}
      {chatOpen && (
        <div className="w-80 border-l border-surface-850 flex-shrink-0 animate-slide-right">
          <ChatPanel />
        </div>
      )}
    </div>
  );
}
