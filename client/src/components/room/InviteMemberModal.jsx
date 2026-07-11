import { useForm } from 'react-hook-form';
import { roomService } from '../../services';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function InviteMemberModal({ isOpen, onClose, roomId }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await roomService.invite(roomId, data);
      toast.success(`Invitation sent to ${data.email}!`);
      reset();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Invite Collaborator</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              className={errors.email ? 'input-error' : 'input'}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' }
              })}
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="role">Role Permission</label>
            <select id="role" className="input" {...register('role')}>
              <option value="editor">Editor (Can draw and code)</option>
              <option value="viewer">Viewer (Read-only)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
