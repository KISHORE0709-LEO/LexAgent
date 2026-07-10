import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, XCircle, CheckCircle, ChevronRight, Copy, UserPlus, Check, Link as LinkIcon } from 'lucide-react';
import { addParticipant, subscribeToParticipantsByRoom, updateParticipantStatus, getHearingByRoomId, getUser } from '../../lib/firestoreHelpers';
import { useAuth } from '../../context/AuthContext';

const INITIAL_PARTICIPANTS = [
  { id: 'p1', name: 'Hon. Justice R. Vance', role: 'Judge',   status: 'verified' },
  { id: 'p2', name: 'Adv. Priya Nair',       role: 'Lawyer',  status: 'waiting' },
  { id: 'p3', name: 'Adv. S. Chatterjee',    role: 'Lawyer',  status: 'unverified' },
  { id: 'p4', name: 'Arjun Mehta',           role: 'Accused', status: 'joining' },
];

const STATUS_MAP = {
  verified:   { icon: <ShieldCheck size={14} />, label: 'Verified',                color: '#81c995' },
  invited:    { icon: <CheckCircle size={14} />,  label: 'Invited (Pending)',        color: '#888' },
  unverified: { icon: <XCircle size={14} />,      label: 'Unauthorized',            color: '#f28b82' },
  joining:    { icon: <Clock size={14} />,        label: 'Joining Securely',        color: '#8ab4f8' },
  admitted:   { icon: <CheckCircle size={14} />,  label: 'Admitted',                color: '#81c995' },
  rejected:   { icon: <XCircle size={14} />,      label: 'Access Denied',           color: '#f28b82' },
};

const WaitingRoom = ({ role, caseData, roomId, onStart }) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [myParticipantId, setMyParticipantId] = useState(null);
  const [sendingInvite, setSendingInvite] = useState(null);

  const registrationAttempted = React.useRef(false);
  const [hearing, setHearing] = useState(null);

  useEffect(() => {
    if (roomId) {
      getHearingByRoomId(roomId).then(setHearing);
    }
  }, [roomId]);
  
  useEffect(() => {
    if (!roomId || !user?.uid || registrationAttempted.current) return;
    
    registrationAttempted.current = true;
    let mounted = true;

    const registerSelf = async () => {
      try {
        const id = await addParticipant({
          roomId,
          name: user?.displayName || (role === 'judge' ? 'Hon. Judge' : 'Guest Participant'),
          role: role.charAt(0).toUpperCase() + role.slice(1),
          uid: user.uid,
          email: user?.email || '',
          status: role === 'judge' ? 'admitted' : 'pending' 
        });
        if (mounted) setMyParticipantId(id);
      } catch (err) {
        console.error("Registration error:", err);
      }
    };

    registerSelf();

    const unsubscribe = subscribeToParticipantsByRoom(roomId, async (data) => {
      if (!mounted) return;
      
      // Resolve emails for participants who don't have them
      const resolvedData = await Promise.all(data.map(async (p) => {
        if (!p.email && p.uid && !p.uid.startsWith('preauth-')) {
          try {
            const userData = await getUser(p.uid);
            if (userData?.email) return { ...p, email: userData.email };
          } catch (e) { console.error("Error resolving email for", p.name, e); }
        }
        return p;
      }));

      setParticipants(resolvedData);
      const me = resolvedData.find(p => p.uid === user?.uid);
      if (me && me.status === 'admitted' && role !== 'judge') {
        onStart();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [roomId, user, role, onStart]); 

  const handleAdmit = async (id) => {
    if (id.startsWith('expected-')) {
      const name = id.replace('expected-', '');
      await addParticipant({ roomId, name, role: 'Party to Case', uid: `preauth-${Date.now()}`, status: 'admitted' });
    } else {
      await updateParticipantStatus(id, 'admitted');
    }
  };

  const handleReject = async (id) => {
    if (id.startsWith('expected-')) {
      const name = id.replace('expected-', '');
      await addParticipant({ roomId, name, role: 'Party to Case', uid: `preauth-${Date.now()}`, status: 'rejected' });
    } else {
      await updateParticipantStatus(id, 'rejected');
    }
  };

  const handleResendInvite = async (pId, email) => {
    if (!email) {
      alert("No email address found for this participant.");
      return;
    }
    
    setSendingInvite(pId);
    try {
      // Try multiple endpoints if one fails
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const endpoints = [`${baseUrl}/api/invite`, `${baseUrl}/resend-judicial-invite`, `${baseUrl}/virtual-hearing/invites/send`];
      
      let success = false;
      let lastError = 'Unknown';

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              case_name: hearing?.caseName || "Mandamus Virtual Hearing",
              scheduled_time: hearing?.scheduledTime || "10:00 AM",
              room_id: roomId
            })
          });
          if (res.ok) { success = true; break; }
          const err = await res.json();
          lastError = err.detail || 'Not Found';
        } catch (e) { lastError = e.message; }
      }
      
      if (success) {
        alert(`Secure invitation successfully sent to: ${email}`);
      } else {
        alert(`Failed to connect to backend: ${lastError}`);
      }
    } catch (err) {
      console.error("Resend error:", err);
      alert("Connection error while sending invitation.");
    } finally {
      setSendingInvite(null);
    }
  };

  const handleSendReminders = async () => {
    const list = getDisplayParticipants().filter(p => p.isExpected && p.email);
    if (list.length === 0) {
      alert("No pending invitations to remind.");
      return;
    }
    
    const confirm = window.confirm(`Send secure reminders to ${list.length} participants?`);
    if (!confirm) return;

    for (const p of list) {
      await handleResendInvite(p.id, p.email);
    }
  };

  const getDisplayParticipants = () => {
    const list = [...participants];
    const filtered = list.filter(p => p.uid !== user?.uid || role !== 'judge').map(p => {
      // Fallback: If email is missing, try to find it in hearing data
      if (!p.email && hearing) {
        // 1. Try dedicated fields
        if (hearing.petitioner_lawyer_email || hearing.respondent_lawyer_email) {
           const partyNames = (hearing.parties || '').split('·').map(s => s.trim());
           const idx = partyNames.findIndex(name => p.name.toLowerCase().includes(name.toLowerCase()));
           if (idx !== -1) {
             p.email = idx === 0 ? hearing.petitioner_lawyer_email : hearing.respondent_lawyer_email;
           }
        }
        
        // 2. Try parsing from parties string (e.g. "Name (email@test.com)")
        if (!p.email && hearing.parties) {
           const matches = hearing.parties.match(/\(([^)]+)\)/g);
           if (matches) {
             const emails = matches.map(m => m.replace(/[()]/g, ''));
             const partyNames = hearing.parties.split('·').map(s => s.trim());
             const idx = partyNames.findIndex(name => p.name.toLowerCase().includes(name.toLowerCase()));
             if (idx !== -1 && emails[idx]) p.email = emails[idx];
           }
        }
      }
      return p;
    });

    if (hearing?.parties) {
      const partyNames = hearing.parties.split('·').map(s => s.trim());
      partyNames.forEach((name, idx) => {
        // Clean name (remove email if present in string)
        const cleanName = name.split('(')[0].trim();
        const joined = participants.some(p => p.name.toLowerCase().includes(cleanName.toLowerCase()));
        
        if (!joined) {
          let email = idx === 0 ? hearing.petitioner_lawyer_email : hearing.respondent_lawyer_email;
          
          // Try to extract from name string if missing
          if (!email && name.includes('(')) {
            const match = name.match(/\(([^)]+)\)/);
            if (match) email = match[1];
          }

          filtered.push({
            id: `expected-${cleanName}`,
            name: cleanName,
            email: email,
            role: idx === 0 ? 'Petitioner Lawyer' : 'Respondent Lawyer',
            status: 'invited',
            isExpected: true
          });
        }
      });
    }
    console.log("WAITING_ROOM: Display List Prepared", filtered.map(p => ({ n: p.name, e: p.email })));
    return filtered;
  };

  const displayList = getDisplayParticipants();

  return (
    <div className="vh-center-wrap">
      <div className="vh-panel vh-panel-wide" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.6rem', color: '#444', border: '1px solid #222', padding: '2px 6px', borderRadius: '4px' }}>
          SECURE PIPELINE v2.0 ACTIVE
        </div>
        <div className="vh-pre-badge" style={{ background: 'rgba(224,32,32,0.1)', color: '#e02020', borderColor: 'rgba(224,32,32,0.4)' }}>
          <ShieldCheck size={14} /> SECURE COURTROOM ENTRY — VERIFICATION ACTIVE
        </div>

        <h2 className="vh-panel-title">{hearing?.caseName || caseData?.name || "Virtual Hearing"}</h2>
        <p className="vh-panel-sub">Hearing Room ID: {hearing?.roomId || roomId} &nbsp;|&nbsp; {hearing?.scheduledTime || "10:00"}</p>
        
        {/* SECURE ACCESS CONTROL STATUS */}
        <div className="vh-invite-status-box">
          <div className="vh-status-header">
            <div className="vh-status-title">
              <LinkIcon size={14} /> PARTICIPANT VERIFICATION CONTROL
            </div>
            <div className="vh-status-badge">ENCRYPTED SESSION</div>
          </div>
          <div className="vh-status-body">
            Access is restricted to authorized email recipients. All participants must complete Resend OTP verification.
          </div>
        </div>

        <div className="vh-participants-list" style={{ marginTop: '1.5rem' }}>
          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', borderBottom: '1px solid #222', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase' }}>Authorized Party</span>
             <span style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase' }}>Security State</span>
          </div>
          
          {displayList.map(p => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.invited;
            return (
              <div key={p.id} className={`vh-participant-row ${p.status === 'pending' ? 'vh-row-pending' : ''}`}>
                <div className="vh-participant-avatar" style={{ background: p.status === 'verified' || p.status === 'admitted' ? '#81c995' : p.isExpected ? '#222' : '#e02020' }}>
                  {p.name[0]}
                </div>
                <div className="vh-participant-info">
                  <div className="vh-participant-name">{p.name}</div>
                  <div className="vh-participant-role">
                    {p.role} {p.email && <span style={{ color: '#444', marginLeft: '8px' }}>— {p.email}</span>}
                  </div>
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div className="vh-participant-status" style={{ color: s.color, fontSize: '0.75rem', fontWeight: '500' }}>
                    {s.icon} {s.label}
                  </div>
                  {role === 'judge' && (
                    <button 
                      className="vh-btn-mini" 
                      onClick={() => handleResendInvite(p.id, p.email)}
                      disabled={sendingInvite === p.id}
                    >
                      {sendingInvite === p.id ? 'SENDING...' : 'RESEND INVITE'}
                    </button>
                  )}
                </div>

                {role === 'judge' && p.role !== 'Judge' && (
                  <div className="vh-admit-controls" style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid #222' }}>
                    <button className="vh-btn-admit" onClick={() => handleAdmit(p.id)}>ALLOW</button>
                    <button className="vh-btn-reject" onClick={() => handleReject(p.id)}>DENY</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {role === 'judge' ? (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="vh-btn-secondary" style={{ flex: 1 }} onClick={handleSendReminders}>
               SEND REMINDERS
            </button>
            <button className="vh-btn-primary" style={{ flex: 2 }} onClick={onStart}>
               START JUDICIAL SESSION <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="vh-waiting-notice" style={{ marginTop: '2rem', background: 'rgba(252,252,52,0.02)', border: '1px solid rgba(252,252,52,0.1)' }}>
            <Clock size={16} /> Identity verified. Waiting for the Judge to initiate the session…
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
