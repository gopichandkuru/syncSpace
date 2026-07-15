import { useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '../../context/SocketContext';
import { useMeetingStore } from '../../store/meetingStore';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';

export default function MeetingManager() {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const { currentRoom } = useRoomStore();
  const { isInMeeting, localStream, isScreenSharing, localScreenStream, addParticipant, removeParticipant, setMeetingState, clearMeeting, audioEnabled, videoEnabled } = useMeetingStore();
  
  const peersRef = useRef({});

  useEffect(() => {
    if (!socket || !currentRoom) return;

    const handleWebRTCSignal = async ({ senderUserId, signal }) => {
      let peer = peersRef.current[senderUserId];
      
      if (!peer) {
        // We received a signal from someone, meaning they initiated. We need to create a peer to answer.
        peer = createPeer(senderUserId, signal, localStream);
        peersRef.current[senderUserId] = peer;
      } else {
        peer.signal(signal);
      }
    };

    const handleMeetingJoin = ({ userId, name }) => {
      // Someone joined, we should initiate a peer connection to them
      if (isInMeeting && localStream) {
        const peer = createPeer(userId, null, localStream, true);
        peersRef.current[userId] = peer;
        addParticipant({ id: userId, name });
      }
    };

    const handleMeetingLeave = ({ userId }) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
      }
      removeParticipant(userId);
    };

    const handleScreenShareStart = ({ userId }) => {
      addParticipant({ id: userId, isSharingScreen: true });
    };

    const handleScreenShareStop = ({ userId }) => {
      addParticipant({ id: userId, isSharingScreen: false });
    };

    socket.on('webrtc:signal', handleWebRTCSignal);
    socket.on('meeting:join', handleMeetingJoin);
    socket.on('meeting:leave', handleMeetingLeave);
    socket.on('screen_share:start', handleScreenShareStart);
    socket.on('screen_share:stop', handleScreenShareStop);

    return () => {
      socket.off('webrtc:signal', handleWebRTCSignal);
      socket.off('meeting:join', handleMeetingJoin);
      socket.off('meeting:leave', handleMeetingLeave);
      socket.off('screen_share:start', handleScreenShareStart);
      socket.off('screen_share:stop', handleScreenShareStop);
    };
  }, [socket, currentRoom, isInMeeting, localStream]);

  // Clean up on unmount or when leaving meeting
  useEffect(() => {
    if (!isInMeeting) {
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      peersRef.current = {};
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (localScreenStream) {
        localScreenStream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isInMeeting]);

  const createPeer = (targetUserId, incomingSignal, stream, initiator = false) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      socket?.emit('webrtc:signal', { targetUserId, signal });
    });

    peer.on('stream', userStream => {
      addParticipant({ id: targetUserId, stream: userStream });
    });

    peer.on('error', err => {
      console.warn('Peer error:', err);
    });

    if (incomingSignal) {
      peer.signal(incomingSignal);
    }

    return peer;
  };

  return null; // This is a logic-only component
}
