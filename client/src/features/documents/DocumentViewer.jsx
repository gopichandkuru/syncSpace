import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { TbChevronLeft, TbChevronRight } from 'react-icons/tb';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function DocumentViewer({ doc }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div className="h-full flex flex-col bg-surface-800">
      <div className="h-12 bg-surface-900 border-b border-surface-700 flex items-center justify-between px-4">
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
        <div className="flex items-center gap-2">
           <button onClick={() => setScale(s => s - 0.2)} className="text-sm text-surface-300 hover:text-white">-</button>
           <span className="text-sm text-surface-300">{Math.round(scale * 100)}%</span>
           <button onClick={() => setScale(s => s + 0.2)} className="text-sm text-surface-300 hover:text-white">+</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex justify-center p-6 bg-surface-950">
        <Document
          file={doc.url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-surface-400">Loading PDF...</div>}
          className="shadow-xl"
        >
          <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={true} />
        </Document>
      </div>
    </div>
  );
}
