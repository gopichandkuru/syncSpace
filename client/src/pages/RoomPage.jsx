import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { roomService } from '../services';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import InviteMemberModal from '../components/room/InviteMemberModal';
import RoomSettingsModal from '../components/room/RoomSettingsModal';
import { TbBrush, TbCode, TbUserPlus, TbSettings, TbHistory, TbUsers, TbTrash, TbShare, TbCrown } from 'react-icons/tb';
import toast from 'react-hot-toast';

export default function RoomPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentRoom, setCurrentRoom, members, setMembers, setCurrentSession } = useRoomStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const res = await roomService.getBySlug(slug);
        const room = res.data.data.room;
        setCurrentRoom(room);
        setMembers(room.members);

        // Fetch Sessions
        const sRes = await roomService.getSessions(room._id);
        setSessions(sRes.data.data.sessions || []);
      } catch (err) {
        toast.error('Failed to load workspace.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchRoomData();
  }, [slug, navigate, setCurrentRoom, setMembers]);

  const handleStartSession = async (mode) => {
    try {
      const res = await roomService.createSession(currentRoom._id);
      setCurrentSession(res.data.data.session);
      navigate(`/room/${slug}/${mode}`);
    } catch (err) {
      toast.error('Failed to start a session.');
    }
  };

  const handleKick = async (targetUserId) => {
    try {
      await roomService.kickMember(currentRoom._id, targetUserId);
      setMembers(members.filter((m) => m.user._id !== targetUserId));
      toast.success('Member kicked.');
    } catch (err) {
      toast.error('Failed to kick member.');
    }
  };

  const handleTransfer = async (targetUserId) => {
    try {
      await roomService.transferOwnership(currentRoom._id, targetUserId);
      toast.success('Ownership transferred.');
      // Reload
      const res = await roomService.getBySlug(slug);
      setCurrentRoom(res.data.data.room);
    } catch (err) {
      toast.error('Failed to transfer ownership.');
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete this workspace? This cannot be undone.')) return;
    try {
      await roomService.delete(currentRoom._id);
      toast.success('Workspace deleted.');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to delete workspace.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-4">
        <div className="skeleton w-12 h-12 rounded-full animate-pulse bg-primary-600" />
        <p className="text-surface-400 text-sm">Loading workspace dashboard...</p>
      </div>
    );
  }

  const isOwner = currentRoom.owner._id === user._id;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="card p-8 bg-gradient-to-br from-surface-900 via-surface-900 to-primary-950/20 border-surface-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">{currentRoom.name}</h1>
            <span className="badge badge-primary">{currentRoom.type}</span>
          </div>
          <p className="text-surface-400 text-sm max-w-2xl">{currentRoom.description || 'No description provided.'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(currentRoom.activeMode === 'both' || currentRoom.activeMode === 'whiteboard') && (
            <button onClick={() => handleStartSession('whiteboard')} className="btn-primary">
              <TbBrush size={18} />
              <span>Go to Whiteboard</span>
            </button>
          )}
          {(currentRoom.activeMode === 'both' || currentRoom.activeMode === 'editor') && (
            <button onClick={() => handleStartSession('editor')} className="btn-secondary">
              <TbCode size={18} />
              <span>Go to Code Editor</span>
            </button>
          )}
          {isOwner && (
            <button onClick={() => setSettingsOpen(true)} className="btn-secondary p-2.5">
              <TbSettings size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspace Members list */}
        <div className="space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TbUsers size={20} className="text-primary-500" />
              <span>Workspace Members</span>
            </h2>
            <button onClick={() => setInviteOpen(true)} className="btn-secondary btn-sm">
              <TbUserPlus size={14} />
              <span>Invite</span>
            </button>
          </div>

          <div className="card p-6 divide-y divide-surface-800/60 max-h-[420px] overflow-y-auto">
            {members.map((member) => (
              <div key={member.user._id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary-800 flex items-center justify-center text-white font-bold border border-primary-700/50">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt={member.user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {member.user.isOnline && <span className="online-dot" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                      <span>{member.user.name}</span>
                      {member.role === 'owner' && <TbCrown className="text-yellow-400" size={14} />}
                    </p>
                    <p className="text-xs text-surface-450 truncate">{member.user.email}</p>
                  </div>
                </div>

                {isOwner && member.user._id !== user._id && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTransfer(member.user._id)}
                      title="Transfer Ownership"
                      className="p-1.5 text-surface-400 hover:text-yellow-400 hover:bg-surface-800 rounded transition-colors"
                    >
                      <TbCrown size={14} />
                    </button>
                    <button
                      onClick={() => handleKick(member.user._id)}
                      title="Kick Member"
                      className="p-1.5 text-surface-400 hover:text-red-400 hover:bg-surface-800 rounded transition-colors"
                    >
                      <TbTrash size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sessions History List */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TbHistory size={20} className="text-primary-500" />
            <span>Recent Sessions & Replay History</span>
          </h2>

          <div className="card p-6 divide-y divide-surface-800/60 max-h-[420px] overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-12">No replay sessions found. Start a whiteboard or editor session to log activities.</p>
            ) : (
              sessions.map((session) => (
                <div key={session._id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Session Started by {session.startedBy.name}
                    </p>
                    <p className="text-xs text-surface-450 mt-0.5">
                      Date: {new Date(session.startedAt).toLocaleDateString()} at {new Date(session.startedAt).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-surface-500 mt-1">
                      Duration: {session.duration ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : 'Ongoing / Live'}
                    </p>
                  </div>
                  {session.endedAt && (
                    <Link to={`/room/${slug}/replay/${session._id}`} className="btn-secondary btn-sm">
                      <span>View Replay</span>
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="card border-red-900/30 bg-red-950/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-red-400">Danger Zone</h3>
            <p className="text-xs text-surface-450 mt-1">Once you delete this workspace, there is no going back. All drawing snapshots, replay logs, and configs will be lost.</p>
          </div>
          <button onClick={handleDeleteRoom} className="btn-danger btn-sm">
            Delete Workspace
          </button>
        </div>
      )}

      <InviteMemberModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} roomId={currentRoom._id} />
      <RoomSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} room={currentRoom} />
    </div>
  );
}
