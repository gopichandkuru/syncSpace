import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { TbEye, TbEyeOff } from 'react-icons/tb';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authService.login(data);
      const { user, accessToken } = res.data.data;
      login(user, accessToken);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--text-base))' }}>Welcome Back</h1>
        <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
          Collab space awaits. Log in to connect with your workspaces.
        </p>
      </div>

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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={errors.password ? 'input-error pr-10' : 'input pr-10'}
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors focus:outline-none"
            >
              {showPassword ? <TbEyeOff size={18} /> : <TbEye size={18} />}
            </button>
          </div>
          {errors.password && <p className="error-text">{errors.password.message}</p>}
        </div>

        <div className="flex items-center">
          <input
            id="rememberMe"
            type="checkbox"
            className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-primary-600 focus:ring-primary-500 focus:ring-offset-surface-950"
            {...register('rememberMe')}
          />
          <label htmlFor="rememberMe" className="ml-2 text-sm text-surface-300">
            Remember me on this device
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-sm text-center text-surface-400">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
          Create account
        </Link>
      </p>
    </div>
  );
}
