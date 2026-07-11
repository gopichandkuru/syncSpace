import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { roomService, userService } from '../services';
import CreateRoomModal from '../components/dashboard/CreateRoomModal';
import JoinRoomModal from '../components/dashboard/JoinRoomModal';
import { TbPlus, TbSearch, TbCompass, TbClock, TbUsers, TbLock, TbLockOpen, TbArrowRight } from 'react-icons/tb';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { myRooms, setMyRooms } = useRoomStore();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsRes, actRes] = await Promise.all([
          roomService.getMy(),
          userService.getActivityLog({ limit: 8 }),
        ]);
        setMyRooms(roomsRes.data.data.rooms);
        setActivity(actRes.data.data.logs || []);
      } catch (err) {
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [setMyRooms]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">
            Create or join collaborative real-time sync spaces.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setJoinOpen(true)} className="btn-secondary">
            <TbSearch size={18} />
            <span>Join Space</span>
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <TbPlus size={18} />
            <span>Create Space</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspaces List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TbCompass size={20} className="text-primary-500" />
            <span>My Workspaces</span>
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-6 h-36 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="skeleton h-5 w-2/3" />
                    <div className="skeleton h-4 w-5/6" />
                  </div>
                  <div className="skeleton h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : myRooms.length === 0 ? (
            <div className="card p-12 text-center space-y-4">
              <p className="text-surface-450">No workspaces yet. Create one to begin collaborating!</p>
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                Create First Space
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRooms.map((room) => (
                <Link
                  key={room._id}
                  to={`/room/${room.slug}`}
                  className="card p-6 hover:border-primary-500/50 hover:bg-surface-900/80 transition-all group flex flex-col justify-between h-40"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white group-hover:text-primary-400 transition-colors truncate pr-2">
                        {room.name}
                      </h3>
                      {room.type === 'public' ? (
                        <TbLockOpen size={16} className="text-green-400" />
                      ) : (
                        <TbLock size={16} className="text-yellow-400" />
                      )}
                    </div>
                    <p className="text-xs text-surface-450 line-clamp-2">
                      {room.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-surface-400 border-t border-surface-800 pt-3 mt-3">
                    <span className="flex items-center gap-1">
                      <TbUsers size={14} />
                      <span>{room.members?.length || 0} members</span>
                    </span>
                    <span className="flex items-center gap-1 group-hover:text-primary-400 transition-colors">
                      <span>Open Space</span>
                      <TbArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TbClock size={20} className="text-primary-500" />
            <span>Activity Feed</span>
          </h2>

          <div className="card p-6 space-y-4 max-h-[460px] overflow-y-auto">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-4 w-5/6" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))
            ) : activity.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-8">No recent activity logged.</p>
            ) : (
              activity.map((log) => (
                <div key={log._id} className="flex gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary-900/40 text-primary-300 flex items-center justify-center font-bold flex-shrink-0">
                    {log.action.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {log.action.replace('_', ' ')}
                    </p>
                    {log.room && (
                      <span className="text-xs text-surface-400">
                        Room: {log.room.name}
                      </span>
                    )}
                    <p className="text-[10px] text-surface-500 mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateRoomModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinRoomModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}
