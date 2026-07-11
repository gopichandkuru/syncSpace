import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../../services';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function JoinRoomModal({ isOpen, onClose }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await roomService.getBySlug(data.slug);
      toast.success('Workspace found! Entering room...');
      reset();
      onClose();
      navigate(`/room/${res.data.data.room.slug}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Workspace ID is invalid or access was denied.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Join Workspace</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="slug">Workspace ID / Slug</label>
            <input
              id="slug"
              type="text"
              placeholder="e.g. a1b2c3d4"
              className={errors.slug ? 'input-error' : 'input'}
              {...register('slug', { required: 'Workspace slug is required' })}
            />
            {errors.slug && <p className="error-text">{errors.slug.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Searching...' : 'Join Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
