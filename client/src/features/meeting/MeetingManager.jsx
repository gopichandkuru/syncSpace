import { useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '../../context/SocketContext';
import { useMeetingStore } from '../../store/meetingStore';
import { useRoomStore } from '../../store/roomStore';

export default function MeetingManager() {
  const { socket, emitWebRTCSignal } = useSocket();
  const { currentRoom } = useRoomStore();
  const { isInMeeting, localStream, localScreenStream, isScreenSharing } = useMeetingStore();
  
  const peersRef = useRef({});
  const screenPeersRef = useRef({});

  useEffect(() => {
    if (!socket || !currentRoom) return;

    const handleWebRTCSignal = async ({ senderUserId, signal, isScreen }) => {
      const ref = isScreen ? screenPeersRef : peersRef;
      let peer = ref.current[senderUserId];
      
      const { localStream: freshLocalStream, localScreenStream: freshScreenStream } = useMeetingStore.getState();
      const streamToUse = isScreen ? null : freshLocalStream; // We don't send screen stream in response to screen peer offer usually, but wait, the screen sharer initiates!

      if (!peer) {
        // We received a signal from someone. 
        peer = createPeer(senderUserId, signal, streamToUse, false, isScreen);
        ref.current[senderUserId] = peer;
      } else {
        peer.signal(signal);
      }
    };

    const handleMeetingJoin = ({ userId, name }) => {
      const { isInMeeting: freshIsInMeeting, localStream: freshLocalStream, isScreenSharing: freshSharing, localScreenStream: freshScreenStream } = useMeetingStore.getState();
      
      if (freshIsInMeeting && freshLocalStream) {
        const peer = createPeer(userId, null, freshLocalStream, true, false);
        peersRef.current[userId] = peer;
        useMeetingStore.getState().addParticipant({ id: userId, name });

        // If I am sharing screen, I should also initiate a screen peer to the new user!
        if (freshSharing && freshScreenStream) {
          const screenPeer = createPeer(userId, null, freshScreenStream, true, true);
          screenPeersRef.current[userId] = screenPeer;
        }
      }
    };

    const handleMeetingLeave = ({ userId }) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
      }
      if (screenPeersRef.current[userId]) {
        screenPeersRef.current[userId].destroy();
        delete screenPeersRef.current[userId];
      }
      useMeetingStore.getState().removeParticipant(userId);
    };

    const handleScreenShareStart = ({ userId }) => {
      // Just mark them as sharing. We wait for their WebRTC signal to actually show the stream.
      useMeetingStore.getState().addParticipant({ id: userId, isSharingScreen: true });
    };

    const handleScreenShareStop = ({ userId }) => {
      useMeetingStore.getState().addParticipant({ id: userId, isSharingScreen: false, screenStream: null });
      if (screenPeersRef.current[userId]) {
        screenPeersRef.current[userId].destroy();
        delete screenPeersRef.current[userId];
      }
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
  }, [socket, currentRoom]);

  // When I start screen sharing, initiate screen peers to all existing meeting participants!
  useEffect(() => {
    if (isScreenSharing && localScreenStream) {
      const participants = useMeetingStore.getState().meetingParticipants;
      participants.forEach(p => {
        if (!screenPeersRef.current[p.id]) {
          const screenPeer = createPeer(p.id, null, localScreenStream, true, true);
          screenPeersRef.current[p.id] = screenPeer;
        }
      });
    } else {
      // If I stopped, destroy all my initiated screen peers
      Object.values(screenPeersRef.current).forEach(peer => peer.destroy());
      screenPeersRef.current = {};
    }
  }, [isScreenSharing, localScreenStream]);

  // Clean up on unmount or when leaving meeting
  useEffect(() => {
    if (!isInMeeting) {
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      peersRef.current = {};
      Object.values(screenPeersRef.current).forEach(peer => peer.destroy());
      screenPeersRef.current = {};
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (localScreenStream) {
        localScreenStream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isInMeeting, localStream, localScreenStream]);

  const createPeer = (targetUserId, incomingSignal, stream, initiator = false, isScreen = false) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      if (emitWebRTCSignal) {
        emitWebRTCSignal(targetUserId, signal, isScreen);
      }
    });

    peer.on('stream', userStream => {
      if (isScreen) {
        useMeetingStore.getState().addParticipant({ id: targetUserId, screenStream: userStream, isSharingScreen: true });
      } else {
        useMeetingStore.getState().addParticipant({ id: targetUserId, stream: userStream });
      }
    });

    peer.on('error', err => {
      console.warn(`Peer error (${isScreen ? 'screen' : 'video'}):`, err);
    });

    if (incomingSignal) {
      peer.signal(incomingSignal);
    }

    return peer;
  };

  return null;
}
