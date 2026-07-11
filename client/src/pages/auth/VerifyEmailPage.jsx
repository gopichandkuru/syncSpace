import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authService } from '../../services';
import { TbCircleCheck, TbCircleX, TbLoader } from 'react-icons/tb';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(res.data.message || 'Your email address has been verified!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification link is invalid or expired.');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center space-y-6">
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <TbLoader className="text-primary-500 animate-spin" size={48} />
            <h1 className="text-xl font-bold text-white">Verifying Email Address</h1>
            <p className="text-surface-450 text-sm">Please hold on while we process your request...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <TbCircleCheck className="text-green-500" size={48} />
            <h1 className="text-xl font-bold text-white">Email Address Verified</h1>
            <p className="text-surface-400 text-sm">{message}</p>
            <Link to="/login" className="btn-primary w-full py-2.5">
              Continue to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <TbCircleX className="text-red-500" size={48} />
            <h1 className="text-xl font-bold text-white">Verification Failed</h1>
            <p className="text-surface-400 text-sm">{message}</p>
            <Link to="/login" className="btn-secondary w-full py-2.5">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
