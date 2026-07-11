import { useForm } from 'react-hook-form';
import { roomService } from '../../services';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useRoomStore } from '../../store/roomStore';

export default function RoomSettingsModal({ isOpen, onClose, room }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: room?.name,
      description: room?.description,
      type: room?.type,
      activeMode: room?.activeMode,
    }
  });
  const [loading, setLoading] = useState(false);
  const { updateRoom } = useRoomStore();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await roomService.update(room._id, data);
      updateRoom(room._id, res.data.data.room);
      toast.success('Workspace updated successfully!');
      onClose();
    } catch (err) {
      toast.error('Failed to update workspace.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Workspace Settings</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="roomName">Workspace Name</label>
            <input
              id="roomName"
              type="text"
              className={errors.name ? 'input-error' : 'input'}
              {...register('name', { required: 'Workspace name is required' })}
            />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
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
            <label className="label" htmlFor="activeMode">Active Mode</label>
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
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
