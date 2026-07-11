import { useForm } from 'react-hook-form';
import { roomService } from '../../services';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useRoomStore } from '../../store/roomStore';

export default function CreateRoomModal({ isOpen, onClose }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const { addRoom } = useRoomStore();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await roomService.create(data);
      addRoom(res.data.data.room);
      toast.success('Room created successfully!');
      reset();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Create New Workspace</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="roomName">Workspace Name</label>
            <input
              id="roomName"
              type="text"
              placeholder="e.g. Project Whiteboard"
              className={errors.name ? 'input-error' : 'input'}
              {...register('name', { required: 'Room name is required' })}
            />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              placeholder="Workspace goals or topics"
              className="input h-20 resize-none"
              {...register('description')}
            />
          </div>

          <div>
            <label className="label" htmlFor="type">Privacy Type</label>
            <select id="type" className="input" {...register('type')}>
              <option value="private">Private (Invite only)</option>
              <option value="public">Public (Anyone can discover)</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="activeMode">Mode</label>
            <select id="activeMode" className="input" {...register('activeMode')}>
              <option value="both">Whiteboard + Code Editor</option>
              <option value="whiteboard">Whiteboard Only</option>
              <option value="editor">Code Editor Only</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
