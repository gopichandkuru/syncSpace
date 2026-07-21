import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { roomService, userService } from '../services';
import CreateRoomModal from '../components/dashboard/CreateRoomModal';
import JoinRoomModal from '../components/dashboard/JoinRoomModal';
import {
  TbPlus, TbSearch, TbCompass, TbClock, TbUsers, TbLock, TbLockOpen,
  TbArrowRight, TbLayoutColumns, TbBrush, TbCode, TbBolt, TbMail, TbCheck,
} from 'react-icons/tb';
import toast from 'react-hot-toast';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTION_ICONS = {
  room_created: '🏠', room_joined: '🚪', session_started: '▶️',
  code_edit: '💻', draw: '🎨', chat: '💬', file_upload: '📁',
};

export default function DashboardPage() {
  const { myRooms, setMyRooms } = useRoomStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [activity, setActivity] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsRes, actRes, invRes] = await Promise.all([
          roomService.getMy(),
          userService.getActivityLog({ limit: 8 }),
          roomService.getPendingInvitations(),
        ]);
        setMyRooms(roomsRes.data.data.rooms);
        setActivity(actRes.data.data.logs || []);
        setPendingInvites(invRes.data.data.invitations || []);
      } catch (err) {
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [setMyRooms]);

  const totalMembers = myRooms.reduce((acc, r) => acc + (r.members?.length || 0), 0);
  const activeRooms = myRooms.filter((r) => r.isActive).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Create or join collaborative real-time sync spaces.
          </p>
        </div>
        <div className="flex flex-col xs:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <button onClick={() => setJoinOpen(true)} className="btn-secondary flex-1 sm:flex-none justify-center">
            <TbSearch size={18} />
            <span>Join Space</span>
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex-1 sm:flex-none justify-center">
            <TbPlus size={18} />
            <span>Create Space</span>
          </button>
        </div>
      </div>

      {/* Pending Invitations Banner */}
      {pendingInvites.length > 0 && (
        <div className="card border-primary-500/40 bg-primary-950/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TbMail size={18} className="text-primary-400" />
            <h2 className="text-sm font-bold text-white">Pending Invitations ({pendingInvites.length})</h2>
          </div>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between bg-surface-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{inv.room?.name || 'Unknown Room'}</p>
                  <p className="text-xs text-surface-400">Invited by <span className="text-primary-400">{inv.invitedBy?.name}</span> · Role: {inv.role}</p>
                </div>
                <a
                  href={`/invite/${inv.token}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <TbCheck size={14} />
                  Accept
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { icon: <TbCompass size={20} className="text-primary-400"/>, label: 'My Workspaces', value: loading ? '…' : myRooms.length },
          { icon: <TbUsers size={20} className="text-green-400"/>, label: 'Total Members', value: loading ? '…' : totalMembers },
          { icon: <TbBolt size={20} className="text-yellow-400"/>, label: 'Active Spaces', value: loading ? '…' : activeRooms },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center flex-shrink-0">
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-surface-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspaces Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TbCompass size={20} className="text-primary-500" />
            <span>My Workspaces</span>
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-6 h-40 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="skeleton h-5 w-2/3" />
                    <div className="skeleton h-4 w-5/6" />
                  </div>
                  <div className="skeleton h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : myRooms.length === 0 ? (
            <div className="card p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-900/30 flex items-center justify-center mx-auto">
                <TbLayoutColumns size={32} className="text-primary-400" />
              </div>
              <div>
                <p className="text-white font-semibold">No workspaces yet</p>
                <p className="text-surface-450 text-sm mt-1">Create one to begin collaborating!</p>
              </div>
              <button onClick={() => setCreateOpen(true)} className="btn-primary mx-auto">
                Create First Space
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRooms.map((room) => (
                <div key={room._id} className="card p-5 hover:border-primary-500/50 hover:shadow-lg transition-all group flex flex-col justify-between h-44">
                  {/* Room header */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white group-hover:text-primary-400 transition-colors truncate pr-2">
                        {room.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {room.type === 'public'
                          ? <TbLockOpen size={14} className="text-green-400" />
                          : <TbLock size={14} className="text-yellow-400" />
                        }
                      </div>
                    </div>
                    <p className="text-xs text-surface-450 line-clamp-2">
                      {room.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Stats + CTA */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <TbUsers size={12} />
                        {room.members?.length || 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <TbClock size={12} />
                        {timeAgo(room.lastActivity || room.updatedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        {room.activeMode === 'both' && <><TbBrush size={12}/><TbCode size={12}/></>}
                        {room.activeMode === 'whiteboard' && <TbBrush size={12}/>}
                        {room.activeMode === 'editor' && <TbCode size={12}/>}
                      </span>
                    </div>

                    <Link
                      to={`/room/${room.slug}/collaborate`}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors"
                    >
                      <span>Open Space</span>
                      <TbArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
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

          <div className="card p-5 space-y-4 max-h-[500px] overflow-y-auto">
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
              <div className="text-center py-10 space-y-2">
                <p className="text-3xl">📋</p>
                <p className="text-sm text-surface-500">No recent activity logged.</p>
              </div>
            ) : (
              activity.map((log) => (
                <div key={log._id} className="flex gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary-900/40 text-primary-300 flex items-center justify-center font-bold flex-shrink-0 text-base">
                    {ACTION_ICONS[log.action] || '🔔'}
                  </div>
                  <div>
                    <p className="text-white font-medium capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    {log.room && (
                      <span className="text-xs text-surface-400">
                        in {log.room.name}
                      </span>
                    )}
                    <p className="text-[10px] text-surface-500 mt-0.5">
                      {timeAgo(log.createdAt)}
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
