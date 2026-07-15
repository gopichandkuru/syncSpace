import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { useSocket } from '../../context/SocketContext';
import { useRoomStore } from '../../store/roomStore';
import { useDocumentStore } from '../../store/documentStore';

export default function DocumentEditor({ doc }) {
  const { currentRoom } = useRoomStore();
  const { socket } = useSocket();
  const { saveVersion } = useDocumentStore();
  
  const textareaRef = useRef(null);
  const [content, setContent] = useState(doc.content || '');
  
  // Real-time text sync using socket (Simple fallback without Yjs logic for now, 
  // or we can use the same Y.Doc from roomDocs in a separate namespace.
  // Given time constraints, we'll do simple value sync on blur or debounced,
  // or basic socket broadcasting for document updates)
  // Let's implement a simplified sync for Document editing:
  useEffect(() => {
    if (!socket || !currentRoom) return;
    
    const handleUpdate = ({ docId, newContent }) => {
      if (docId === doc._id) {
        setContent(newContent);
      }
    };
    
    socket.on('document:update', handleUpdate);
    return () => socket.off('document:update', handleUpdate);
  }, [socket, currentRoom, doc._id]);

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    socket?.emit('user:activity_change', { roomId: currentRoom._id, activity: 'editing_doc' });
    socket?.emit('document:update', { roomId: currentRoom._id, docId: doc._id, content: val });
  };

  const handleSave = () => {
    saveVersion(doc._id, content);
  };

  // We should also register the 'document:update' event on the backend, 
  // but for a quick hack we can just broadcast it inside the frontend via a new backend handler,
  // or we can quickly add it to the backend `socket/index.js`.
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-10 bg-surface-100 border-b flex items-center justify-end px-4 gap-2">
        <button onClick={handleSave} className="btn-primary btn-sm">Save Version</button>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        className="flex-1 w-full p-6 bg-transparent text-gray-800 focus:outline-none resize-none font-mono text-sm leading-relaxed"
        placeholder="Start typing..."
      />
    </div>
  );
}
