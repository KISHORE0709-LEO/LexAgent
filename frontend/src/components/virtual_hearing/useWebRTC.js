import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * useWebRTC — mesh WebRTC hook
 * Returns: { localStream, peers, connectionStatus, toggleMic, toggleCamera, startRecording, stopRecording, downloadRecording }
 * peers: [{ socketId, stream, name, role }]
 */
export const useWebRTC = ({ roomId, userId, name, role, enabled }) => {
  const socketRef       = useRef(null);
  const localStreamRef  = useRef(null);
  const peerConnsRef    = useRef({});   // socketId → RTCPeerConnection
  const recorderRef     = useRef(null);
  const recChunksRef    = useRef([]);

  const [localStream,       setLocalStream]       = useState(null);
  const [peers,             setPeers]             = useState([]);   // [{ socketId, stream, name, role }]
  const [connectionStatus,  setConnectionStatus]  = useState('idle');
  const [isRecording,       setIsRecording]       = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────

  const updatePeer = useCallback((socketId, updates) => {
    setPeers(prev => {
      const idx = prev.findIndex(p => p.socketId === socketId);
      if (idx === -1) return [...prev, { socketId, stream: null, name: '', role: '', ...updates }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
  }, []);

  const removePeer = useCallback((socketId) => {
    setPeers(prev => prev.filter(p => p.socketId !== socketId));
    if (peerConnsRef.current[socketId]) {
      peerConnsRef.current[socketId].close();
      delete peerConnsRef.current[socketId];
    }
  }, []);

  // ── create RTCPeerConnection for a remote peer ────────────────────────────

  const createPC = useCallback((remoteSocketId, remoteInfo) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnsRef.current[remoteSocketId] = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track =>
        pc.addTrack(track, localStreamRef.current)
      );
    }

    // Remote stream
    const remoteStream = new MediaStream();
    updatePeer(remoteSocketId, { stream: remoteStream, ...remoteInfo });

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
      updatePeer(remoteSocketId, { stream: remoteStream });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { to: remoteSocketId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setConnectionStatus('connected');
      if (pc.connectionState === 'failed')    setConnectionStatus('disconnected');
    };

    return pc;
  }, [updatePeer]);

  // ── main effect ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !roomId) return;

    let cancelled = false;
    setConnectionStatus('connecting');

    const init = async () => {
      // 1. Get local media
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        // Camera denied — create silent/black stream so signaling still works
        stream = new MediaStream();
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Connect socket
      const socket = io(SIGNALING_URL, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnectionStatus('connecting');
        socket.emit('join-room', { roomId, userId, role, name });
      });

      socket.on('connect_error', () => setConnectionStatus('disconnected'));

      // 3. Existing users in room → we initiate offer to each
      socket.on('room-users', async (users) => {
        for (const user of users) {
          const pc = createPC(user.socketId, { name: user.name, role: user.role });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { to: user.socketId, offer });
        }
        if (users.length === 0) setConnectionStatus('connected');
      });

      // 4. New user joined → they will send us an offer
      socket.on('user-joined', ({ socketId, name: n, role: r }) => {
        createPC(socketId, { name: n, role: r });
      });

      // 5. Receive offer → send answer
      socket.on('offer', async ({ from, offer }) => {
        let pc = peerConnsRef.current[from];
        if (!pc) pc = createPC(from, {});
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
        setConnectionStatus('connected');
      });

      // 6. Receive answer
      socket.on('answer', async ({ from, answer }) => {
        const pc = peerConnsRef.current[from];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        setConnectionStatus('connected');
      });

      // 7. ICE candidates
      socket.on('ice-candidate', async ({ from, candidate }) => {
        const pc = peerConnsRef.current[from];
        if (pc && candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        }
      });

      // 8. User disconnected
      socket.on('user-disconnected', ({ socketId }) => {
        removePeer(socketId);
      });
    };

    init();

    return () => {
      cancelled = true;
      // Cleanup
      Object.values(peerConnsRef.current).forEach(pc => pc.close());
      peerConnsRef.current = {};
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      socketRef.current?.disconnect();
      setLocalStream(null);
      setPeers([]);
      setConnectionStatus('idle');
    };
  }, [enabled, roomId]);

  // ── controls ──────────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !track.enabled;
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
  }, []);

  const startRecording = useCallback(() => {
    if (!localStreamRef.current) return;
    recChunksRef.current = [];
    const recorder = new MediaRecorder(localStreamRef.current);
    recorder.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const downloadRecording = useCallback(() => {
    const blob = new Blob(recChunksRef.current, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `hearing-recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    localStream,
    peers,
    connectionStatus,
    isRecording,
    toggleMic,
    toggleCamera,
    startRecording,
    stopRecording,
    downloadRecording,
  };
};
