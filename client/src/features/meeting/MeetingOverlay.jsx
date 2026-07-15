import { useEffect, useRef } from 'react';
import { useMeetingStore } from '../../store/meetingStore';
import { TbMicrophone, TbMicrophoneOff, TbVideo, TbVideoOff, TbPhoneOff } from 'react-icons/tb';

const VideoStream = ({ stream, isLocal, muted }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal || muted}
      className={`w-full h-full object-cover rounded-lg bg-surface-900 ${isLocal ? 'transform scale-x-[-1]' : ''}`}
    />
  );
};

export default function MeetingOverlay({ roomId }) {
  const { isInMeeting, localStream, meetingParticipants, audioEnabled, videoEnabled, setMeetingState, clearMeeting } = useMeetingStore();
  const { socket } = useMeetingStore((state) => ({ socket: null })); // get from context ideally, but we will pass down methods or use store

  if (!isInMeeting) return null;

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !audioEnabled);
      setMeetingState({ audioEnabled: !audioEnabled });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !videoEnabled);
      setMeetingState({ videoEnabled: !videoEnabled });
    }
  };

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 w-64 max-h-[80vh] overflow-y-auto pointer-events-none">
      
      {/* Local Video */}
      <div className="relative rounded-lg shadow-lg aspect-video bg-surface-900 pointer-events-auto border-2 border-primary-500/50">
        <VideoStream stream={localStream} isLocal={true} />
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded p-1">
          <button onClick={toggleAudio} className={`p-1.5 rounded ${!audioEnabled ? 'bg-red-500/80 text-white' : 'hover:bg-surface-800 text-surface-200'}`}>
            {audioEnabled ? <TbMicrophone size={14} /> : <TbMicrophoneOff size={14} />}
          </button>
          <button onClick={toggleVideo} className={`p-1.5 rounded ${!videoEnabled ? 'bg-red-500/80 text-white' : 'hover:bg-surface-800 text-surface-200'}`}>
            {videoEnabled ? <TbVideo size={14} /> : <TbVideoOff size={14} />}
          </button>
        </div>
      </div>

      {/* Participants Video */}
      {meetingParticipants.map(p => (
        <div key={p.id} className="relative rounded-lg shadow-lg aspect-video bg-surface-900 pointer-events-auto border border-surface-700">
          {p.stream ? (
            <VideoStream stream={p.stream} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-500">Connecting...</div>
          )}
          <div className="absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 rounded text-xs text-white">
            {p.name || 'Participant'}
          </div>
        </div>
      ))}
    </div>
  );
}
