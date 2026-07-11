import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomService } from '../services';
import toast from 'react-hot-toast';
import { TbLoader, TbCheck } from 'react-icons/tb';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accept = async () => {
      try {
        const res = await roomService.acceptInvitation(token);
        toast.success(`Welcome to ${res.data.data.room.name}!`);
        navigate(`/room/${res.data.data.room.slug}`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Invitation is invalid, expired, or you are already joined.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    accept();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center space-y-4">
        {loading ? (
          <>
            <TbLoader className="text-primary-500 animate-spin mx-auto" size={48} />
            <h1 className="text-xl font-bold text-white">Accepting Invitation</h1>
            <p className="text-surface-450 text-sm">Please wait while we add you to the workspace...</p>
          </>
        ) : (
          <>
            <TbCheck className="text-green-500 mx-auto" size={48} />
            <h1 className="text-xl font-bold text-white">Redirecting...</h1>
          </>
        )}
      </div>
    </div>
  );
}
