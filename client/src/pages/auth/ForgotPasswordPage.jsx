import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { authService } from '../../services';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSubmitted(true);
      toast.success('If the email is registered, we have sent a reset link.');
    } catch (err) {
      toast.error('Failed to send reset link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
        <p className="text-surface-400 text-sm">
          Enter your email address and we will email you a password reset link.
        </p>
      </div>

      {submitted ? (
        <div className="p-4 bg-primary-950/20 border border-primary-900/50 rounded-xl space-y-4">
          <p className="text-sm text-surface-200">
            A password reset link has been dispatched to your email address. It will remain valid for 1 hour.
          </p>
          <Link to="/login" className="btn-secondary w-full text-center py-2.5">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              className={errors.email ? 'input-error' : 'input'}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' }
              })}
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="text-sm text-center text-surface-400">
        Remember your password?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
