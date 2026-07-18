import { useState, useEffect, useRef } from 'react';
import { TbChevronLeft, TbChevronRight, TbDownload, TbPencil } from 'react-icons/tb';
import { Stage, Layer, Line } from 'react-konva';
import { useSocket } from '../../context/SocketContext';
import { useRoomStore } from '../../store/roomStore';

export default function DocumentViewer({ doc }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(null);
  const [PdfComponents, setPdfComponents] = useState(null);

  // Annotation state
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState({}); // { pageNum: [lines] }
  const [currentLine, setCurrentLine] = useState(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  
  const { currentRoom } = useRoomStore();
  const { socket, isConnected } = useSocket();
  const stageRef = useRef(null);
  const containerRef = useRef(null);

  // Lazy-load react-pdf so a pdfjs failure doesn't break the whole app
  useEffect(() => {
    let cancelled = false;
    import('react-pdf')
      .then((mod) => {
        if (cancelled) return;
        const { Document, Page, pdfjs } = mod;
        
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        
        // Also import the CSS layers
        import('react-pdf/dist/Page/AnnotationLayer.css').catch(() => {});
        import('react-pdf/dist/Page/TextLayer.css').catch(() => {});
        setPdfComponents({ Document, Page });
      })
      .catch((err) => {
        if (!cancelled) setPdfError('PDF viewer failed to load: ' + err.message);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!socket || !currentRoom) return;

    const handleSync = ({ docId, annotations: remoteAnnots }) => {
      if (docId === doc._id) setAnnotations(remoteAnnots);
    };
    
    const handleUpdate = ({ docId, pageNum, newAnnotations }) => {
      if (docId === doc._id) {
        setAnnotations((prev) => ({
          ...prev,
          [pageNum]: newAnnotations
        }));
      }
    };

    socket.on('document:annot:sync', handleSync);
    socket.on('document:annot:update', handleUpdate);

    // Request initial annotations
    socket.emit('document:annot:sync', { roomId: currentRoom._id, docId: doc._id });

    return () => {
      socket.off('document:annot:sync', handleSync);
      socket.off('document:annot:update', handleUpdate);
    };
  }, [socket, currentRoom, doc._id]);

  const handleMouseDown = (e) => {
    if (!annotationMode) return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setCurrentLine({ points: [pos.x / scale, pos.y / scale], color: '#ef4444' });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !annotationMode) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    setCurrentLine(prev => ({
      ...prev,
      points: [...prev.points, pos.x / scale, pos.y / scale]
    }));
  };

  const handleMouseUp = () => {
    if (!isDrawing || !annotationMode || !currentLine) return;
    setIsDrawing(false);
    
    const newAnnotations = [...(annotations[pageNumber] || []), currentLine];
    setAnnotations(prev => ({
      ...prev,
      [pageNumber]: newAnnotations
    }));
    
    if (socket && isConnected) {
      socket.emit('document:annot:update', {
        roomId: currentRoom._id,
        docId: doc._id,
        pageNum: pageNumber,
        annotations: newAnnotations
      });
    }
    setCurrentLine(null);
  };

  if (pdfError) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-950 text-surface-400 flex-col gap-4 p-8">
        <p className="text-lg font-semibold text-red-400">PDF Viewer Error</p>
        <p className="text-sm text-center">{pdfError}</p>
        {doc.url && (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors">
            <TbDownload size={16} /> Download PDF
          </a>
        )}
      </div>
    );
  }

  if (!PdfComponents) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-950">
        <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const { Document, Page } = PdfComponents;
  const pageAnns = annotations[pageNumber] || [];

  return (
    <div className="h-full flex flex-col bg-surface-800 relative">
      <div className="h-12 bg-surface-900 border-b border-surface-700 flex items-center justify-between px-4 z-10 relative">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 hover:bg-surface-800 rounded disabled:opacity-50 text-surface-200"
          >
            <TbChevronLeft />
          </button>
          <span className="text-sm text-surface-300">
            Page {pageNumber} of {numPages || '--'}
          </span>
          <button 
            onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
            disabled={pageNumber >= numPages}
            className="p-1.5 hover:bg-surface-800 rounded disabled:opacity-50 text-surface-200"
          >
            <TbChevronRight />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setAnnotationMode(!annotationMode)}
            className={`p-1.5 rounded transition-colors ${annotationMode ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-surface-800 text-surface-400'}`}
            title="Toggle Annotations"
          >
            <TbPencil size={18} />
          </button>

          <div className="flex items-center gap-1 border-l border-surface-700 pl-4">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="text-sm text-surface-300 hover:text-white px-2">-</button>
            <span className="text-sm text-surface-300 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="text-sm text-surface-300 hover:text-white px-2">+</button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex justify-center p-6 bg-surface-950 relative" ref={containerRef}>
        <Document
          file={doc.url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(err) => setPdfError(err.message)}
          loading={<div className="text-surface-400 pt-8">Loading PDF...</div>}
          className="shadow-xl relative"
        >
          <div className="relative">
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
            {/* Konva overlay strictly bounds to the Page size */}
            <div 
              className={`absolute inset-0 z-20 ${annotationMode ? 'cursor-crosshair' : 'pointer-events-none'}`} 
              style={{ width: '100%', height: '100%' }}
            >
              <Stage 
                width={containerRef.current ? Math.min(containerRef.current.clientWidth - 48, 800 * scale) : 800 * scale} 
                height={containerRef.current ? Math.min(containerRef.current.clientHeight - 48, 1200 * scale) : 1200 * scale}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={(e) => { e.evt.preventDefault(); handleMouseDown(e); }}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                ref={stageRef}
                style={{ width: '100%', height: '100%' }}
              >
                <Layer scaleX={scale} scaleY={scale}>
                  {pageAnns.map((line, i) => (
                    <Line
                      key={i}
                      points={line.points}
                      stroke={line.color}
                      strokeWidth={3}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  ))}
                  {currentLine && (
                    <Line
                      points={currentLine.points}
                      stroke={currentLine.color}
                      strokeWidth={3}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          </div>
        </Document>
      </div>
    </div>
  );
}
