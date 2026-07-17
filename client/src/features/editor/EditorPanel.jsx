import { useCallback, useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as Y from 'yjs';
import { useSocket } from '../../context/SocketContext';
import { useRoomStore } from '../../store/roomStore';
import { useEditorStore } from '../../store/editorStore';
import { TbCopy, TbDownload, TbCheck, TbWand, TbPlayerPlay, TbRefresh, TbExternalLink } from 'react-icons/tb';
import toast from 'react-hot-toast';
import { MonacoBinding } from 'y-monaco';
import { Awareness } from 'y-protocols/awareness';
import * as awarenessProtocol from 'y-protocols/awareness';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
];

const EXT = {
  javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
  cpp: 'cpp', c: 'c', csharp: 'cs', php: 'php', html: 'html', css: 'css', json: 'json', markdown: 'md',
  rust: 'rs', go: 'go',
};

const TEMPLATES = {
  javascript: 'console.log("Hello World");\n',
  typescript: 'console.log("Hello TypeScript");\n',
  python: 'print("Hello World")\n',
  java: 'class Main{\n  public static void main(String args[]){\n    System.out.println("Hello World");\n  }\n}\n',
  cpp: '#include<bits/stdc++.h>\nusing namespace std;\n\nint main(){\n  cout << "Hello World";\n  return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello World\\n");\n  return 0;\n}\n',
  csharp: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello World");\n  }\n}\n',
  php: '<?php\n\necho "Hello World\\n";\n',
  html: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>Live Preview</title>\n  <style>\n    body {\n      font-family: system-ui, sans-serif;\n      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n      min-height: 100vh;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      margin: 0;\n    }\n    .card {\n      background: white;\n      border-radius: 16px;\n      padding: 40px;\n      text-align: center;\n      box-shadow: 0 20px 60px rgba(0,0,0,0.3);\n    }\n    h1 { color: #764ba2; margin: 0 0 8px; }\n    p { color: #666; margin: 0; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>Hello, SyncSpace! 🚀</h1>\n    <p>Start editing to see changes live.</p>\n  </div>\n\n  <script>\n    console.log("Preview loaded!");\n  </script>\n</body>\n</html>\n',
  css: 'body {\n  margin: 0;\n  padding: 0;\n}\n',
  json: '{\n  "key": "value"\n}\n',
  markdown: '# Hello World\n',
  rust: 'fn main() {\n    println!("Hello World");\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}\n',
};

/**
 * Wraps raw code in a full HTML document with runtime error catching.
 * For proper HTML documents (<html> tag present), injects error handler into <head>.
 */
function buildPreviewDocument(code) {
  if (!code || code.trim() === '') return '';

  const errorCatcher = `<script>
(function() {
  window.onerror = function(msg, src, line, col, err) {
    var d = document.createElement('div');
    d.style.cssText = [
      'position:fixed;bottom:0;left:0;right:0;z-index:9999',
      'background:#1a0000;color:#f87171;border-top:2px solid #dc2626',
      'padding:10px 16px;font:13px/1.5 monospace;white-space:pre-wrap',
    ].join(';');
    d.textContent = '\u26A0\uFE0F JS Error: ' + msg + (line ? ' (line ' + line + ')' : '');
    document.body.appendChild(d);
    return false;
  };
  var _origError = console.error;
  console.error = function() {
    var d = document.createElement('div');
    d.style.cssText = [
      'position:fixed;bottom:0;left:0;right:0;z-index:9999',
      'background:#1a0000;color:#f87171;border-top:2px solid #dc2626',
      'padding:10px 16px;font:13px/1.5 monospace;white-space:pre-wrap',
    ].join(';');
    d.textContent = '\u26A0\uFE0F Console Error: ' + Array.from(arguments).join(' ');
    document.body.appendChild(d);
    _origError.apply(console, arguments);
  };
})();
<\/script>`;

  const lc = code.toLowerCase();
  if (lc.includes('<html')) {
    // Full HTML doc — inject error catcher into <head> or prepend to <body>
    if (lc.includes('<head>')) {
      return code.replace(/<head>/i, '<head>\n' + errorCatcher);
    }
    if (lc.includes('<head')) {
      return code.replace(/<head[^>]*>/i, (m) => m + '\n' + errorCatcher);
    }
    return errorCatcher + code;
  }

  // Partial HTML snippet — wrap in a full document
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${errorCatcher}
  <style>body { font-family: system-ui, sans-serif; }</style>
</head>
<body>
${code}
</body>
</html>`;
}

export default function EditorPanel() {
  const { currentRoom, currentSession } = useRoomStore();
  const {
    language, setLanguage,
    theme: editorTheme, setTheme: setEditorTheme,
    fontSize, setFontSize,
  } = useEditorStore();
  const {
    emitEditorSync, emitEditorUpdate, emitEditorAwareness,
    emitLanguageChange, onYjsSync, onYjsUpdate, onYjsAwareness,
    onLanguageChange, isConnected, emitTypingStart, emitTypingStop,
    emitPreviewSync, onPreviewSync,
    emitCodeRun, emitCodeOutput, onCodeRun, onCodeOutput,
  } = useSocket();

  const [editorValue, setEditorValue] = useState('// Start coding here...\n');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [copied, setCopied] = useState(false);

  // Console output state (JavaScript runner)
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState([]);
  const [showConsole, setShowConsole] = useState(false);

  // HTML Preview state
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLastUser, setPreviewLastUser] = useState(null); // {name, timestamp}
  const isReceivingRemotePreview = useRef(false); // prevent echo loop

  // Yjs + Editor refs
  const ydocRef = useRef(null);
  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const awarenessRef = useRef(null);
  const isApplyingUpdate = useRef(false);
  const saveTimer = useRef(null);
  const typingTimeoutRef = useRef(null);
  const runCodeRef = useRef(null);
  const previewDebounceRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);

  // ── HTML Preview: auto-update on code change (500ms debounce) ──────────
  useEffect(() => {
    if (language !== 'html') {
      setPreviewHtml(''); // clear when switching away from HTML
      return;
    }
    clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => {
      if (isReceivingRemotePreview.current) return; // don't echo back
      const html = buildPreviewDocument(editorValue);
      setPreviewHtml(html);
      // Broadcast to all room participants
      if (currentRoom?._id && isConnected && html) {
        emitPreviewSync(currentRoom._id, html);
      }
    }, 500);
    return () => clearTimeout(previewDebounceRef.current);
  }, [editorValue, language, isConnected, currentRoom?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Receive remote preview sync from other participants ────────────────
  useEffect(() => {
    if (!onPreviewSync) return;
    const cleanup = onPreviewSync(({ html, userName, timestamp }) => {
      if (!html) return;
      isReceivingRemotePreview.current = true;
      setPreviewHtml(html);
      setPreviewLastUser({ name: userName, timestamp });
      // reset the flag after a tick so local changes still work
      setTimeout(() => { isReceivingRemotePreview.current = false; }, 100);
    });
    return cleanup;
  }, [onPreviewSync]);

  // ── Receive remote code execution sync ─────────────────────────────────
  useEffect(() => {
    if (!onCodeRun || !onCodeOutput) return;
    
    const cleanRun = onCodeRun(({ language: runLang, userName }) => {
      if (language === runLang) {
        setShowConsole(true);
        setIsRunning(true);
        setOutput([`Executing code... (started by ${userName})`]);
      }
    });

    const cleanOutput = onCodeOutput(({ output: newOutput, language: runLang, userName, executionTime }) => {
      if (language === runLang) {
        setShowConsole(true);
        setIsRunning(false);
        const finalOutput = [...newOutput];
        if (executionTime) {
          finalOutput.push(`\n[Execution time: ${executionTime}ms]`);
        }
        setOutput(finalOutput);
      }
    });

    return () => {
      cleanRun();
      cleanOutput();
    };
  }, [onCodeRun, onCodeOutput, language]);

  // ── Run HTML manually (Run button) ─────────────────────────────────────
  const handleRunHtml = useCallback(() => {
    const code = editorRef.current?.getValue() || '';
    const html = buildPreviewDocument(code);
    setPreviewHtml(html);
    if (currentRoom?._id && isConnected && html) {
      emitPreviewSync(currentRoom._id, html);
      toast.success('Preview synced to all participants!', { duration: 1500 });
    }
  }, [currentRoom?._id, isConnected, emitPreviewSync]);

  // ── Yjs setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentRoom || !editorReady || !editorRef.current) return;

    const doc = new Y.Doc();
    ydocRef.current = doc;
    const ytext = doc.getText('codestate');

    const awareness = new Awareness(doc);
    awarenessRef.current = awareness;

    // Bind Monaco ↔ Yjs
    bindingRef.current = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      awareness
    );

    // Send state vector to get current document state
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

    const handleAwarenessUpdate = ({ added, updated, removed }, origin) => {
      if (origin !== 'socket' && isConnected) {
        const changedClients = added.concat(updated).concat(removed);
        const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
        emitEditorAwareness(currentRoom._id, Array.from(update));
      }
    };
    awareness.on('update', handleAwarenessUpdate);

    const cleanSync = onYjsSync(({ type, data }) => {
      if (type === 'update' && data?.length) {
        try {
          Y.applyUpdate(doc, new Uint8Array(data), 'socket');
          if (ytext.toString() === '') {
            const defaultTemplate = TEMPLATES[language] || '';
            if (defaultTemplate) {
              doc.transact(() => { ytext.insert(0, defaultTemplate); }, 'local');
            }
          }
        } catch (e) { console.warn('Yjs sync error:', e); }
      }
    });

    const cleanUpdate = onYjsUpdate(({ update }) => {
      try { Y.applyUpdate(doc, new Uint8Array(update), 'socket'); }
      catch (e) { console.warn('Yjs update error:', e); }
    });

    const cleanAwareness = onYjsAwareness(({ update }) => {
      try { awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(update), 'socket'); }
      catch (e) { console.warn('Yjs awareness error:', e); }
    });

    const cleanLang = onLanguageChange(({ language: newLang, name }) => {
      setLanguage(newLang);
      toast(`${name} changed language to ${newLang}`, { icon: '📝', duration: 2000 });
    });

    return () => {
      doc.off('update', handleLocalUpdate);
      awareness.off('update', handleAwarenessUpdate);
      cleanSync(); cleanUpdate(); cleanAwareness(); cleanLang();
      bindingRef.current?.destroy();
      doc.destroy();
      clearTimeout(saveTimer.current);
    };
  }, [currentRoom?._id, isConnected, editorReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Editor change handler (typing indicators) ──────────────────────────
  const handleEditorChange = useCallback((value) => {
    setEditorValue(value ?? '');
    emitTypingStart(currentRoom?._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(currentRoom?._id);
    }, 2000);
  }, [currentRoom?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Format document ─────────────────────────────────────────────────────
  const handleFormat = () => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
  };

  // ── Language change ─────────────────────────────────────────────────────
  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    emitLanguageChange(currentRoom._id, lang);

    if (ydocRef.current) {
      const ytext = ydocRef.current.getText('codestate');
      if (ytext.toString().trim() === '') {
        const tpl = TEMPLATES[lang] || '';
        if (tpl) {
          ydocRef.current.transact(() => { ytext.insert(0, tpl); }, 'local');
        }
      }
    }
  };

  // ── Copy ────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    const val = editorRef.current ? editorRef.current.getValue() : '';
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  // ── Download ────────────────────────────────────────────────────────────
  const handleDownload = () => {
    const ext = EXT[language] || 'txt';
    const val = editorRef.current ? editorRef.current.getValue() : '';
    const blob = new Blob([val], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Open preview in new tab ─────────────────────────────────────────────
  const handleOpenPreviewTab = () => {
    const html = previewHtml || buildPreviewDocument(editorRef.current?.getValue() || '');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // ── Code Runner (Piston API & Local JS fallback) ────────────────────────
  const handleRunCode = useCallback(async () => {
    if (language === 'html' || language === 'css' || language === 'markdown' || language === 'json') {
      toast.error(`Code execution is not supported for ${language}.`);
      return;
    }

    const val = editorRef.current ? editorRef.current.getValue() : '';
    if (!val.trim()) {
      toast.error('Editor is empty.');
      return;
    }

    setIsRunning(true);
    setShowConsole(true);
    setOutput(['Executing code...']);
    
    // Broadcast execution start
    if (currentRoom?._id && isConnected) {
      emitCodeRun(currentRoom._id, language);
    }

    const startTime = Date.now();
    try {
      // Call our backend execution API
      const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://syncspace-backend-44cl.onrender.com/api/v1' : 'http://localhost:5005/api/v1');
      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language: language,
          code: val
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute code on server.');
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;
      
      const newOutput = [];
      if (data.compile && data.compile.output) {
        newOutput.push('[COMPILE OUTPUT]');
        newOutput.push(...data.compile.output.split('\n'));
      }
      if (data.run && data.run.stderr) {
        newOutput.push(`Runtime Error:\n${data.run.stderr}`);
      }
      if (data.run && data.run.stdout) {
        newOutput.push(...data.run.stdout.split('\n'));
      }
      
      if (newOutput.length === 0) {
        newOutput.push('Code executed successfully with no output.');
      }

      setOutput(newOutput);

      // Broadcast execution output
      if (currentRoom?._id && isConnected) {
        emitCodeOutput(currentRoom._id, newOutput, language, executionTime);
      }
    } catch (err) {
      const errOutput = [`Execution Failed: ${err.message}`];
      setOutput(errOutput);
      if (currentRoom?._id && isConnected) {
        emitCodeOutput(currentRoom._id, errOutput, language, Date.now() - startTime);
      }
    } finally {
      setIsRunning(false);
    }
  }, [language, currentRoom?._id, isConnected, emitCodeRun, emitCodeOutput]);

  useEffect(() => { runCodeRef.current = handleRunCode; }, [handleRunCode]);

  // ── Render ─────────────────────────────────────────────────────────────
  const isHtml = language === 'html';
  const isExecutable = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'php', 'go', 'rust'].includes(language);

  return (
    <div className="flex flex-col h-full bg-surface-950 overflow-hidden">

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-12 bg-surface-900 border-b border-surface-800 px-3 flex items-center gap-2">
        {/* Language */}
        <select
          value={language}
          onChange={handleLanguageChange}
          className="bg-surface-800 border border-surface-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        {/* Theme */}
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

        {/* Run button */}
        {(isExecutable || isHtml) && (
          <button
            onClick={isHtml ? handleRunHtml : handleRunCode}
            disabled={isRunning && !isHtml}
            className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <TbPlayerPlay size={13} />
            <span>{isRunning && !isHtml ? 'Running...' : 'Run'}</span>
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

      {/* ── Main editor + preview area ──────────────────────────── */}
      <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">

        {/* Left: Monaco Editor + Console */}
        <div className={`flex flex-col overflow-hidden ${isHtml ? 'w-full md:w-1/2 border-b md:border-b-0 md:border-r border-surface-800' : 'flex-1'}`}>
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language={language}
              theme={editorTheme}
              onChange={handleEditorChange}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                setEditorReady(true);
                setEditorValue(editor.getValue());
                editor.onDidChangeModelContent(() => {
                  setEditorValue(editor.getValue());
                });
                // Ctrl+Enter shortcut
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  const currentLang = useEditorStore.getState().language;
                  const isExecutableLang = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'php', 'go', 'rust'].includes(currentLang);
                  if (isExecutableLang) {
                    runCodeRef.current?.();
                  } else if (currentLang === 'html') {
                    handleRunHtml();
                  }
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

          {/* Console output (JS runner) */}
          {showConsole && (
            <div className="h-44 border-t border-slate-800 bg-[#070b13] flex flex-col flex-shrink-0 text-white font-mono text-[11px]">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Console Output</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOutput([])} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded text-[10px] text-slate-450 transition-colors">Clear</button>
                  <button onClick={() => setShowConsole(false)} className="px-2 py-0.5 bg-red-950/20 hover:bg-red-900/30 hover:text-red-300 rounded text-[10px] text-red-400 transition-colors">Close</button>
                </div>
              </div>
              <div className="flex-1 p-3 overflow-y-auto space-y-1 select-text selection:bg-indigo-500/30">
                {output.length === 0 ? (
                  <div className="text-slate-500 italic">No output. Click "Run" to execute the code.</div>
                ) : (
                  output.map((line, idx) => {
                    let cls = 'text-slate-300';
                    if (line.startsWith('[ERROR]')) cls = 'text-red-400';
                    else if (line.startsWith('[WARN]')) cls = 'text-yellow-400';
                    else if (line.startsWith('[INFO]')) cls = 'text-blue-400';
                    else if (line.startsWith('=>')) cls = 'text-green-400 font-semibold';
                    else if (line.startsWith('Runtime Error:')) cls = 'text-red-500 font-semibold border-l-2 border-red-500 pl-2 py-0.5 bg-red-950/10';
                    return (
                      <div key={idx} className={`${cls} whitespace-pre-wrap leading-relaxed`}>{line}</div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live HTML/CSS/JS Preview */}
        {isHtml && (
          <div className="w-full md:w-1/2 flex flex-col h-full bg-white relative">
            {/* Preview header */}
            <div className="flex-shrink-0 h-9 bg-surface-100 border-b border-surface-200 px-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Live Preview</span>
                {previewLastUser && (
                  <span className="text-[10px] text-surface-400 ml-1">
                    — synced by <span className="text-primary-500 font-medium">{previewLastUser.name}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRunHtml}
                  title="Refresh preview & sync to all"
                  className="p-1 text-surface-500 hover:text-surface-800 hover:bg-surface-200 rounded transition-colors"
                >
                  <TbRefresh size={14} />
                </button>
                <button
                  onClick={handleOpenPreviewTab}
                  title="Open in new tab"
                  className="p-1 text-surface-500 hover:text-surface-800 hover:bg-surface-200 rounded transition-colors"
                >
                  <TbExternalLink size={14} />
                </button>
              </div>
            </div>

            {/* iframe preview */}
            <div className="flex-1 overflow-hidden relative bg-white">
              {previewHtml ? (
                <iframe
                  key={previewHtml.length} // force re-mount on significant changes
                  title="live-preview"
                  srcDoc={previewHtml}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-surface-400 text-sm p-6 text-center bg-surface-50">
                  <div className="w-16 h-16 mb-4 rounded-2xl bg-surface-100 flex items-center justify-center">
                    <TbPlayerPlay size={28} className="text-surface-300" />
                  </div>
                  <p className="font-medium text-surface-500 mb-1">Live Preview</p>
                  <p className="text-xs text-surface-400">Start typing HTML to see the output here.</p>
                  <p className="text-xs text-surface-400 mt-1">Preview syncs automatically to all participants.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
