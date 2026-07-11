import { useForm } from 'react-hook-form';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authService.resetPassword(token, data);
      toast.success('Password updated successfully. You can now login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed. Token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
        <p className="text-surface-400 text-sm">
          Please select a strong password of at least 6 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label" htmlFor="password">New Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className={errors.password ? 'input-error' : 'input'}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' }
            })}
          />
          {errors.password && <p className="error-text">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className={errors.confirmPassword ? 'input-error' : 'input'}
            {...register('confirmPassword', {
              required: 'Confirm your password',
              validate: (val) => val === password || 'Passwords do not match'
            })}
          />
          {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? 'Resetting password...' : 'Update password'}
        </button>
      </form>

      <p className="text-sm text-center text-surface-400">
        Back to{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
