import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useRoomStore } from '../../store/roomStore';
import { useSocket } from '../../context/SocketContext';
import { useAuthStore } from '../../store/authStore';
import { chatService } from '../../services';
import { TbSend, TbArrowBackUp, TbTrash, TbMoodSmile, TbCheck, TbChecks } from 'react-icons/tb';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';

export default function ChatPanel() {
  const { messages, setMessages, addMessage, removeMessage, typingUsers, reset } = useChatStore();
  const { currentRoom } = useRoomStore();
  const { emitChatMessage, emitChatSeen, emitTypingStart, emitTypingStop } = useSocket();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!currentRoom) return;

    const loadMessages = async () => {
      try {
        const res = await chatService.getMessages(currentRoom._id);
        setMessages(res.data.data.messages || []);
        emitChatSeen(currentRoom._id);
      } catch (err) {
        toast.error('Failed to load chat history.');
      }
    };

    loadMessages();

    return () => {
      reset();
    };
  }, [currentRoom?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    emitChatMessage(currentRoom._id, content, 'text', replyTo?._id);
    setContent('');
    setReplyTo(null);
    setEmojiOpen(false);
    emitTypingStop(currentRoom._id);
  };

  const handleInputChange = (e) => {
    setContent(e.target.value);
    emitTypingStart(currentRoom._id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(currentRoom._id);
    }, 2000);
  };

  const handleDelete = async (msgId) => {
    try {
      await chatService.deleteMessage(msgId);
      removeMessage(msgId);
    } catch (err) {
      toast.error('Failed to delete message.');
    }
  };

  const onEmojiClick = (emojiData) => {
    setContent((prev) => prev + emojiData.emoji);
    setEmojiOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-surface-900 border-l border-surface-800">
      {/* Head */}
      <div className="p-4 border-b border-surface-800 flex items-center justify-between">
        <span className="font-bold text-white">Live Room Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-surface-500">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.type === 'system';
            if (isSystem) {
              return (
                <div key={msg._id} className="text-center text-xs text-surface-500 py-1 bg-surface-950/20 rounded">
                  {msg.content}
                </div>
              );
            }

            return (
              <div key={msg._id} className="group flex flex-col space-y-1">
                {/* Reply context */}
                {msg.replyTo && (
                  <div className="ml-8 p-1.5 bg-surface-800/40 border-l-2 border-primary-500 rounded text-xs text-surface-400 flex items-center gap-1.5">
                    <TbArrowBackUp size={12} />
                    <span className="font-semibold text-white">{msg.replyTo.sender.name}:</span>
                    <span className="truncate">{msg.replyTo.content}</span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-800 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                    {msg.sender.avatar ? (
                      <img src={msg.sender.avatar} alt={msg.sender.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      msg.sender.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-white">{msg.sender.name}</span>
                      <span className="text-[10px] text-surface-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className={`text-sm text-surface-200 mt-1 break-words ${msg.isDeleted ? 'italic text-surface-500' : ''}`}>
                      {msg.content}
                    </p>
                  </div>

                  {/* Actions */}
                  {!msg.isDeleted && (
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="p-1 text-surface-400 hover:text-white rounded hover:bg-surface-800"
                        title="Reply"
                      >
                        <TbArrowBackUp size={14} />
                      </button>
                      {(msg.sender._id === user?._id || msg.sender._id === user?.id) && (
                        <button
                          onClick={() => handleDelete(msg._id)}
                          className="p-1 text-surface-400 hover:text-red-400 rounded hover:bg-surface-800"
                          title="Delete Message"
                        >
                          <TbTrash size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-surface-450 italic bg-surface-950/10">
          {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-surface-800 bg-surface-950/20 space-y-2 relative">
        {replyTo && (
          <div className="flex items-center justify-between p-2 bg-surface-800 border-l-2 border-primary-500 rounded text-xs">
            <div className="flex items-center gap-2 truncate">
              <TbArrowBackUp size={14} />
              <span className="text-surface-400">Replying to {replyTo.sender.name}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-surface-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="flex gap-2 relative">
          <button
            type="button"
            onClick={() => setEmojiOpen(!emojiOpen)}
            className="p-2.5 text-surface-400 hover:text-white rounded-lg hover:bg-surface-800 focus:outline-none"
          >
            <TbMoodSmile size={20} />
          </button>

          {emojiOpen && (
            <div className="absolute bottom-14 left-0 z-50">
              <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" width={320} height={400} />
            </div>
          )}

          <input
            type="text"
            placeholder="Type your message..."
            value={content}
            onChange={handleInputChange}
            className="input py-2"
          />

          <button type="submit" className="btn-primary p-2.5">
            <TbSend size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
