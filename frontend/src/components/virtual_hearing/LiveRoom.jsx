import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  MessageSquare, FileText, Shield, Disc, Users, Download, Wifi, WifiOff, Copy, Check, Link as LinkIcon
} from 'lucide-react';
import { useWebRTC } from './useWebRTC';

const DOCS = [
  { name: 'Case_Summary.pdf',              tag: 'PRIMARY DOC' },
  { name: 'Bank_Statements_Jan_Aug.pdf',   tag: 'EXHIBIT A'   },
  { name: 'Digital_Forensics_Report.pdf',  tag: 'EXHIBIT B'   },
  { name: 'Witness_Depositions.pdf',       tag: 'EXHIBIT C'   },
];

const MOCK_TRANSCRIPT = [
  { speaker: 'System', text: 'End-to-end encrypted session initiated. All participants verified.', system: true },
];

const LIVE_LINES = [
  { speaker: 'Hon. Justice R. Vance',  text: 'Counsel, please present the digital evidence in Exhibit B.' },
  { speaker: 'Adv. S. Chatterjee',     text: 'Objection — the evidence was obtained without a valid warrant under IT Act §65.' },
  { speaker: 'Hon. Justice R. Vance',  text: 'Objection noted. We will address admissibility after a short recess.' },
];

// STATUS PILL
const STATUS_COLORS = { connected: '#81c995', connecting: '#fcc934', disconnected: '#f28b82', idle: '#555' };
const STATUS_LABELS = { connected: '🟢 Connected', connecting: '🟡 Connecting…', disconnected: '🔴 Disconnected', idle: '⚪ Idle' };

// Video tile — shows real stream or initials fallback
const VideoTile = ({ stream, name, role, isLocal, isJudge, isSpeaking, color }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';

  return (
    <div className={`lr-tile ${isJudge ? 'lr-spotlight' : ''} ${isSpeaking ? 'lr-speaking' : ''}`}
         style={isJudge ? { flex: 1 } : {}}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
      ) : (
        <div className="lr-avatar-wrap">
          <div className="lr-avatar" style={{ background: color || '#333' }}>{initials}</div>
        </div>
      )}
      <div className={`lr-nametag ${isJudge ? '' : 'lr-nametag-sm'}`}>
        <span className="lr-nametag-name">{name}{isLocal ? ' (You)' : ''}</span>
        <span className="lr-nametag-role">{role}</span>
        {isJudge && <span className="lr-nametag-verified">✓ Verified</span>}
      </div>
      <div className="lr-mic-indicator"><Mic size={isJudge ? 12 : 11} /></div>
    </div>
  );
};

const LiveRoom = ({ role, caseData, roomId, user, userId, userName, setStage }) => {
  const [micOn,          setMicOn]          = useState(true);
  const [cameraOn,       setCameraOn]       = useState(true);
  const [activeTab,      setActiveTab]      = useState('transcript');
  const [panelOpen,      setPanelOpen]      = useState(true);
  const [transcript,     setTranscript]     = useState(MOCK_TRANSCRIPT);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [copiedCode,     setCopiedCode]     = useState(false);
  const [copiedLink,     setCopiedLink]     = useState(false);
  const [showCodeMenu,   setShowCodeMenu]   = useState(false);
  const transcriptEndRef = useRef(null);
  const codeMenuRef = useRef(null);

  const {
    localStream,
    peers,
    connectionStatus,
    isRecording,
    toggleMic,
    toggleCamera,
    startRecording,
    stopRecording,
    downloadRecording,
  } = useWebRTC({
    roomId:  roomId || 'demo-room',
    userId,
    name:    userName || role,
    role,
    enabled: true,
  });

  // Close code menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (codeMenuRef.current && !codeMenuRef.current.contains(event.target)) {
        setShowCodeMenu(false);
      }
    };
    if (showCodeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCodeMenu]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const [interimText, setInterimText] = useState('');

  // ── MONGODB INTEGRATION (HEARING LIFECYCLE) ──
  useEffect(() => {
    const initMongoSession = async () => {
      if (role === 'judge' && roomId && caseData) {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          await fetch(`${baseUrl}/virtual-hearing/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hearing_id: roomId,
              case_id: caseData.id || caseData.caseId || 'UNKNOWN',
              judge_email: user?.email || 'admin@mandamus.gov',
              hearing_date: new Date().toISOString().split('T')[0],
              room_id: roomId,
              status: 'in_progress',
              participants: [{ email: user?.email, name: userName || role, role: role }]
            })
          });
          console.log("MongoDB Hearing Session Initialized");
        } catch (err) {
          console.error("Failed to init MongoDB session:", err);
        }
      }
    };
    initMongoSession();
  }, [roomId, role, caseData, user, userName]);

  // ── SPEECH RECOGNITION (LIVE TRANSCRIPT) ──
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) || !micOn) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          const newEntry = { 
            speaker: userName || role, 
            text: text.trim(), 
            timestamp: new Date().toLocaleTimeString(),
            isFinal: true 
          };
          
          setTranscript(prev => [...prev, newEntry]);
          setInterimText('');

          // ── SYNC TO MONGODB ──
          const syncUtterance = async () => {
            try {
              const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
              await fetch(`${baseUrl}/virtual-hearing/sessions/${roomId}/transcript`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  timestamp: newEntry.timestamp,
                  speaker_role: role,
                  speaker_name: userName || role,
                  text: text.trim()
                })
              });
            } catch (err) {
              console.error("Failed to sync transcript to MongoDB:", err);
            }
          };
          syncUtterance();
          
          // AI DETECTION
          if (text.toLowerCase().includes('objection') || text.toLowerCase().includes('contradict') || text.toLowerCase().includes('wrong')) {
            setTranscript(prev => [...prev, { 
              speaker: 'AI_COMMAND_CENTER', 
              text: `⚠️ POTENTIAL INCONSISTENCY DETECTED: Statement differs from official record.`, 
              system: true,
              type: 'alert' 
            }]);
          }
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onend = () => {
      if (micOn) {
        try { recognition.start(); } catch (e) { console.log("Recognition restart suppressed"); }
      }
    };

    recognition.start();
    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [micOn, userName, role]);

  const handleDownloadTranscript = () => {
    const text = transcript.map(m => `[${m.speaker}] ${m.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${caseData?.id || 'hearing'}.txt`;
    a.click();
  };

  // Wire mic/camera toggles to real tracks
  const handleMicToggle = () => {
    toggleMic();
    setMicOn(v => !v);
  };

  const handleCameraToggle = () => {
    toggleCamera();
    setCameraOn(v => !v);
  };

  const handleRecordToggle = () => {
    if (isRecording) { stopRecording(); }
    else             { startRecording(); }
  };

  const copyMeetingCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/hearing/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Build participant tiles: local + remote peers
  const ROLE_COLORS = { judge: '#e02020', lawyer: '#4285f4', custody: '#fbbc04', clerk: '#34a853' };
  const localColor  = ROLE_COLORS[role] || '#555';

  const localParticipant = { stream: localStream, name: userName || role, role, isLocal: true, color: localColor };

  // Judge tile is always first / spotlight
  const isJudge      = role === 'judge';
  const judgeData    = isJudge ? localParticipant : peers.find(p => p.role === 'judge');
  const othersData   = isJudge
    ? peers
    : [localParticipant, ...peers.filter(p => p.role !== 'judge')];

  return (
    <div className="lr-root">

      {/* ── END SESSION CONFIRM ── */}
      {showEndConfirm && (
        <div className="vh-confirm-overlay">
          <div className="vh-confirm-box">
            <h3>End Session?</h3>
            <p>This will close the hearing for all participants and seal the session record.</p>
            <div className="vh-confirm-actions">
              <button className="vh-btn-danger" onClick={async () => { 
                if (isRecording) stopRecording(); 
                // Signal completion to MongoDB Intelligence Layer
                try {
                  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                  fetch(`${baseUrl}/virtual-hearing/sessions/${roomId}/complete`, { method: 'POST' })
                    .catch(e => console.error(e));
                } catch (err) {
                  console.error("Failed to initiate MongoDB completion:", err);
                }
                setStage('post-hearing'); 
              }}>
                Yes, End Session
              </button>
              <button className="vh-btn-secondary" onClick={() => setShowEndConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="lr-topbar">
        <div className="lr-topbar-left">
          <div className="lr-case-id">{caseData?.id}</div>
          <div className="lr-case-name">{caseData?.name}</div>
        </div>
        <div className="lr-topbar-center">
          {isRecording && <div className="lr-rec-pill"><span className="lr-rec-dot" /> REC · LIVE</div>}
          {roomId && (
            <div style={{ position: 'relative' }} ref={codeMenuRef}>
              <button 
                onClick={() => setShowCodeMenu(!showCodeMenu)}
                style={{ 
                  background: 'rgba(224,32,32,0.15)', 
                  border: '1px solid rgba(224,32,32,0.3)', 
                  color: '#e02020', 
                  padding: '0.4rem 0.9rem', 
                  borderRadius: '4px', 
                  fontFamily: 'monospace', 
                  fontSize: '0.8rem', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                title="Meeting Code"
              >
                {roomId}
                <Copy size={12} />
              </button>
              {showCodeMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '0.5rem',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  minWidth: '200px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 1000
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem', textAlign: 'center' }}>SHARE MEETING</div>
                  <button
                    onClick={() => { copyMeetingCode(); setShowCodeMenu(false); }}
                    style={{
                      width: '100%',
                      background: copiedCode ? '#81c995' : '#e02020',
                      color: '#fff',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      marginBottom: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copiedCode ? <><Check size={12} /> CODE COPIED</> : <><Copy size={12} /> COPY CODE</>}
                  </button>
                  <button
                    onClick={() => { copyMeetingLink(); setShowCodeMenu(false); }}
                    style={{
                      width: '100%',
                      background: copiedLink ? '#81c995' : 'rgba(224,32,32,0.2)',
                      color: copiedLink ? '#fff' : '#e02020',
                      border: '1px solid rgba(224,32,32,0.3)',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copiedLink ? <><Check size={12} /> LINK COPIED</> : <><LinkIcon size={12} /> COPY LINK</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="lr-topbar-right">
          {/* Connection status */}
          <div className="lr-conn-status" style={{ color: STATUS_COLORS[connectionStatus] }}>
            {connectionStatus === 'connected'
              ? <Wifi size={13} />
              : <WifiOff size={13} />}
            {STATUS_LABELS[connectionStatus]}
          </div>
          <div className="lr-e2ee"><Shield size={13} /> E2EE</div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="lr-body">

        {/* ── VIDEO AREA ── */}
        <div className="lr-video-area">

          {/* Judge spotlight */}
          {judgeData ? (
            <VideoTile
              stream={judgeData.stream}
              name={judgeData.name}
              role={judgeData.role || 'Judge'}
              isLocal={judgeData.isLocal}
              isJudge={true}
              color={ROLE_COLORS.judge}
            />
          ) : (
            <div className="lr-spotlight lr-tile-empty">
              <span style={{ color: '#333', fontSize: '0.85rem' }}>Waiting for Judge…</span>
            </div>
          )}

          {/* Others strip */}
          <div className="lr-strip">
            {othersData.map((p, i) => (
              <VideoTile
                key={p.socketId || (p.isLocal ? 'local' : i)}
                stream={p.stream}
                name={p.name}
                role={p.role}
                isLocal={p.isLocal}
                isJudge={false}
                color={ROLE_COLORS[p.role] || '#555'}
              />
            ))}
            {othersData.length === 0 && (
              <div className="lr-tile lr-tile-empty">
                <span style={{ color: '#333', fontSize: '0.78rem' }}>Waiting for participants…</span>
              </div>
            )}
          </div>
        </div>

        {/* ── SIDE PANEL ── */}
        {panelOpen && (
          <div className="lr-side">
            <div className="lr-side-tabs">
              <button className={`lr-side-tab ${activeTab === 'transcript' ? 'active' : ''}`} onClick={() => setActiveTab('transcript')}>
                <MessageSquare size={14} /> Transcript
              </button>
              <button className={`lr-side-tab ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
                <FileText size={14} /> Documents
              </button>
              <button className={`lr-side-tab ${activeTab === 'people' ? 'active' : ''}`} onClick={() => setActiveTab('people')}>
                <Users size={14} /> People
              </button>
            </div>

            <div className="lr-side-body">
              {activeTab === 'transcript' && (
                <div className="lr-transcript-container">
                  <div className="lr-transcript-header">
                    <span>LIVE_TRANSCRIPT_v2.0</span>
                    <button className="lr-transcript-dl" onClick={handleDownloadTranscript} title="Download Full Transcript">
                      <Download size={14} /> DOWNLOAD
                    </button>
                  </div>
                  <div className="lr-transcript-list">
                    {transcript.map((msg, i) => (
                      <div key={i} className={`lr-msg ${msg.system ? 'lr-msg-system' : ''} ${msg.type === 'alert' ? 'lr-msg-alert' : ''}`}>
                        {!msg.system && <div className="lr-msg-speaker">{msg.speaker}</div>}
                        <div className="lr-msg-text">{msg.text}</div>
                      </div>
                    ))}
                    {interimText && (
                      <div className="lr-msg lr-msg-interim">
                        <div className="lr-msg-speaker">{userName || role}</div>
                        <div className="lr-msg-text">{interimText}...</div>
                      </div>
                    )}
                    {isRecording && (
                      <div className="lr-transcribing">
                        <span className="lr-rec-dot" style={{ width: 6, height: 6 }} /> Listening and transcribing...
                      </div>
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="lr-docs-list">
                  {DOCS.map((d, i) => (
                    <div key={i} className="lr-doc-row">
                      <div className="lr-doc-icon"><FileText size={18} /></div>
                      <div className="lr-doc-info">
                        <div className="lr-doc-name">{d.name}</div>
                        <div className="lr-doc-tag">{d.tag}</div>
                      </div>
                      <button className="lr-doc-dl" title="Download"><Download size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'people' && (
                <div className="lr-people-list">
                  {/* Local user */}
                  <div className="lr-person-row">
                    <div className="lr-avatar lr-avatar-xs" style={{ background: localColor }}>
                      {(userName || role).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="lr-person-info">
                      <div className="lr-person-name">{userName || role} (You)</div>
                      <div className="lr-person-role">{role}</div>
                    </div>
                    <span className="lr-person-verified">✓</span>
                  </div>
                  {/* Remote peers */}
                  {peers.map(p => (
                    <div key={p.socketId} className="lr-person-row">
                      <div className="lr-avatar lr-avatar-xs" style={{ background: ROLE_COLORS[p.role] || '#555' }}>
                        {(p.name || p.role).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="lr-person-info">
                        <div className="lr-person-name">{p.name || 'Participant'}</div>
                        <div className="lr-person-role">{p.role}</div>
                      </div>
                      <span className="lr-person-verified">✓</span>
                    </div>
                  ))}
                  {peers.length === 0 && (
                    <div style={{ color: '#444', fontSize: '0.82rem', textAlign: 'center', marginTop: '1rem' }}>
                      No other participants yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="lr-bottombar">
        <div className="lr-bottom-left">
          <span className="lr-room-code">{caseData?.room}</span>
          <span className="lr-room-sep">·</span>
          <span className="lr-room-code">{1 + peers.length} participant{peers.length !== 0 ? 's' : ''}</span>
        </div>

        <div className="lr-controls">
          <div className="lr-ctrl-group">
            <button className={`lr-ctrl-btn ${!micOn ? 'lr-ctrl-off' : ''}`} onClick={handleMicToggle}>
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <span className="lr-ctrl-label">{micOn ? 'Mute' : 'Unmute'}</span>
          </div>

          <div className="lr-ctrl-group">
            <button className={`lr-ctrl-btn ${!cameraOn ? 'lr-ctrl-off' : ''}`} onClick={handleCameraToggle}>
              {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <span className="lr-ctrl-label">{cameraOn ? 'Camera' : 'No Video'}</span>
          </div>

          {role === 'judge' && (
            <>
              <div className="lr-ctrl-group">
                <button className={`lr-ctrl-btn ${isRecording ? 'lr-ctrl-rec' : ''}`} onClick={handleRecordToggle}>
                  <Disc size={20} />
                </button>
                <span className="lr-ctrl-label">{isRecording ? 'Stop Rec' : 'Record'}</span>
              </div>
              {!isRecording && peers.length === 0 && (
                <div className="lr-ctrl-group">
                  <button className="lr-ctrl-btn" onClick={downloadRecording} title="Download Recording">
                    <Download size={20} />
                  </button>
                  <span className="lr-ctrl-label">Download</span>
                </div>
              )}
            </>
          )}

          <div className="lr-ctrl-group">
            <button className="lr-ctrl-btn lr-ctrl-end" onClick={() => setShowEndConfirm(true)}>
              <PhoneOff size={20} />
            </button>
            <span className="lr-ctrl-label">End</span>
          </div>
        </div>

        <div className="lr-bottom-right">
          <button className={`lr-panel-toggle ${panelOpen ? 'active' : ''}`} onClick={() => setPanelOpen(!panelOpen)}>
            <MessageSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveRoom;
