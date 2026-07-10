import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getHearingsByJudge, getHearingByRoomId } from '../../lib/firestoreHelpers';
import Dashboard from './Dashboard';
import JoinByCode from './JoinByCode';
import CasePreHearing from './CasePreHearing';
import Verification from './Verification';
import WaitingRoom from './WaitingRoom';
import LiveRoom from './LiveRoom';
import PostHearing from './PostHearing';
import './VirtualHearing.css';

// Generate a Google Meet-style room ID: xxx-xxxx-xxx
const generateRoomId = () => {
  const seg = (n) => Math.random().toString(36).substring(2, 2 + n);
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
};

const VirtualHearing = ({ initialRoomId }) => {
  const { role: authRole, user } = useAuth();
  const role = authRole || 'judge';

  const [stage,        setStage]        = useState(initialRoomId ? 'pre-hearing' : 'dashboard');
  const [selectedCase, setSelectedCase] = useState(null);
  const [roomId,       setRoomId]       = useState(initialRoomId || null);
  const [hearings,     setHearings]     = useState([]);

  // Load hearings from Firestore
  useEffect(() => {
    if (user?.uid) {
      getHearingsByJudge(user.uid)
        .then(setHearings)
        .catch(err => console.error('Error loading hearings:', err));
    }
  }, [user]);

  // Auto-load hearing if initialRoomId is provided or URL has roomId
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('roomId');
    const isInvite = params.get('invite') === 'true';
    
    const rId = initialRoomId || urlRoomId;
    
    if (rId && !selectedCase) {
      handleJoinByCode(rId).then(() => {
        if (isInvite) {
          setStage('verification');
        }
      });
    }
  }, [initialRoomId]);

  const handleCaseSelect = (c) => { 
    setSelectedCase(c); 
    setRoomId(c.roomId || c.hearingId); // Use existing roomId from hearing
    setStage('pre-hearing'); 
  };

  // Handle joining by code
  const handleJoinByCode = async (code) => {
    try {
      // Try to find in loaded hearings first
      let hearing = hearings.find(h => h.roomId === code);
      
      // If not found, try fetching from Firestore
      if (!hearing) {
        hearing = await getHearingByRoomId(code);
      }
      
      if (hearing) {
        setSelectedCase(hearing);
        setRoomId(code);
        setStage('pre-hearing');
      } else {
        // Create a minimal case object for unknown codes
        setSelectedCase({
          id: code,
          name: 'Virtual Hearing Session',
          room: 'Virtual Chamber',
          time: new Date().toLocaleTimeString(),
          roomId: code
        });
        setRoomId(code);
        setStage('pre-hearing');
      }
    } catch (error) {
      console.error('Error joining by code:', error);
      alert('Failed to join meeting. Please try again.');
    }
  };

  // Judge generates roomId on Start Hearing; others join with existing roomId
  const handleStart = () => {
    if (role === 'judge' && !roomId) {
      setRoomId(generateRoomId());
    }
    setStage('live-session');
  };

  return (
    <div className="virtual-hearing-container">
      {stage === 'dashboard' && (
        <>
          <JoinByCode onJoin={handleJoinByCode} />
          <Dashboard role={role} onCaseSelect={handleCaseSelect} />
        </>
      )}
      {stage === 'pre-hearing'  && <CasePreHearing role={role} caseData={selectedCase} onProceed={() => setStage('verification')} onBack={() => setStage('dashboard')} />}
      {stage === 'verification' && <Verification role={role} caseData={selectedCase} user={user} onVerified={() => setStage('waiting-room')} />}
      {stage === 'waiting-room' && <WaitingRoom role={role} caseData={selectedCase} roomId={roomId} onStart={handleStart} />}
      {stage === 'live-session' && (
        <LiveRoom
          role={role}
          caseData={selectedCase}
          roomId={roomId}
          user={user}
          userId={user?.uid || 'guest-' + Math.random().toString(36).slice(2)}
          userName={user?.displayName || role}
          setStage={setStage}
        />
      )}
      {stage === 'post-hearing' && <PostHearing role={role} caseData={selectedCase} onReturn={() => setStage('dashboard')} />}
    </div>
  );
};

export default VirtualHearing;
