import { useCallback, useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as Y from 'yjs';
import { useSocket } from '../../context/SocketContext';
import { useRoomStore } from '../../store/roomStore';
import { useEditorStore } from '../../store/editorStore';
import { TbCopy, TbDownload, TbCheck, TbWand, TbPlayerPlay } from 'react-icons/tb';
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
  const { emitEditorSync, emitEditorUpdate, emitLanguageChange, onYjsSync, onYjsUpdate, onLanguageChange, isConnected, emitTypingStart, emitTypingStop } = useSocket();

  const [editorValue, setEditorValue] = useState('// Start coding here...\n');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved'
  const [copied, setCopied] = useState(false);

  // Code Execution States
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState([]);
  const [showConsole, setShowConsole] = useState(false);

  const ydocRef = useRef(null);
  const editorRef = useRef(null);
  const isApplyingUpdate = useRef(false);
  const saveTimer = useRef(null);
  const typingTimeoutRef = useRef(null);
  const yjsUpdateTimer = useRef(null);
  const runCodeRef = useRef(null);

  useEffect(() => {
    if (!currentRoom) return;

    const doc = new Y.Doc();
    ydocRef.current = doc;
    const ytext = doc.getText('codestate');

    // Send state vector to server to get full state
    const stateVector = Y.encodeStateVector(doc);
    emitEditorSync(currentRoom._id, 'sv', Array.from(stateVector));

    const handleLocalUpdate = (update, origin) => {
      if (origin !== 'socket' && isConnected) {
        setSaveStatus('saving');
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSaveStatus('saved'), 1500);
        emitEditorUpdate(currentRoom._id, Array.from(update));
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

  // JS Code execution engine in browser
  const handleRunCode = useCallback(() => {
    if (language !== 'javascript') {
      toast.error('Code execution is currently supported for JavaScript only.');
      return;
    }
    setIsRunning(true);
    setShowConsole(true);
    setOutput(['Executing code...']);

    setTimeout(() => {
      try {
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;

        console.log = (...args) => {
          logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
        };
        console.error = (...args) => {
          logs.push('[ERROR] ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
        };
        console.warn = (...args) => {
          logs.push('[WARN] ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
        };
        console.info = (...args) => {
          logs.push('[INFO] ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
        };

        try {
          // Standard JS execution in browser
          const result = eval(editorValue);
          if (result !== undefined) {
            logs.push(`=> ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
          }
          setOutput(logs.length > 0 ? logs : ['Code executed successfully with no output.']);
        } catch (err) {
          setOutput([...logs, `Runtime Error: ${err.message}`]);
        } finally {
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
          console.info = originalInfo;
        }
      } catch (globalErr) {
        setOutput([`Execution Failed: ${globalErr.message}`]);
      } finally {
        setIsRunning(false);
      }
    }, 150); // slight timeout to show loading spinner
  }, [editorValue, language]);

  useEffect(() => {
    runCodeRef.current = handleRunCode;
  }, [handleRunCode]);

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

        {/* Run code button */}
        {language === 'javascript' && (
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-glow-sm"
          >
            <TbPlayerPlay size={13} />
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>
        )}

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

      {/* Editor + Output split container */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            language={language}
            theme={editorTheme}
            value={editorValue}
            onChange={handleEditorChange}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              // Add command to bind Ctrl+Enter shortcut within Monaco
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                runCodeRef.current?.();
              });
            }}
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

        {/* OUTPUT PANEL */}
        {showConsole && (
          <div className="h-44 border-t border-slate-800 bg-[#070b13] flex flex-col flex-shrink-0 text-white font-mono text-[11px]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Console Output</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOutput([])}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded text-[10px] text-slate-450 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowConsole(false)}
                  className="px-2 py-0.5 bg-red-950/20 hover:bg-red-900/30 hover:text-red-300 rounded text-[10px] text-red-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-1 select-text selection:bg-indigo-500/30">
              {output.length === 0 ? (
                <div className="text-slate-500 italic">No output. Click "Run" to execute the code.</div>
              ) : (
                output.map((line, idx) => {
                  let textClass = "text-slate-300";
                  if (line.startsWith('[ERROR]')) {
                    textClass = "text-red-400";
                  } else if (line.startsWith('[WARN]')) {
                    textClass = "text-yellow-400";
                  } else if (line.startsWith('[INFO]')) {
                    textClass = "text-blue-400";
                  } else if (line.startsWith('=>')) {
                    textClass = "text-green-400 font-semibold";
                  } else if (line.startsWith('Runtime Error:')) {
                    textClass = "text-red-500 font-semibold border-l-2 border-red-500 pl-2 py-0.5 bg-red-950/10";
                  }
                  return (
                    <div key={idx} className={`${textClass} whitespace-pre-wrap leading-relaxed`}>
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
