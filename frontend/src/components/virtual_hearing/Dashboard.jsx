import React, { useState, useEffect } from 'react';
import { Scale, Users, Lock, ClipboardList, ChevronRight, Clock, MapPin, Calendar, FileText } from 'lucide-react';
import { getHearingsByJudge } from '../../lib/firestoreHelpers';
import { useAuth } from '../../context/AuthContext';

const MOCK_CASES = [
  { id: 'MH-HC-2024-4471', name: 'State of Maharashtra vs. Arjun Mehta', time: '10:00 AM', room: 'COURT-7A',  status: 'Scheduled',   date: '25 Jul 2025', type: 'Criminal' },
  { id: 'DL-HC-2024-1192', name: 'Union of India vs. Priya Sharma',       time: '12:30 PM', room: 'COURT-3B',  status: 'Pending Docs', date: '25 Jul 2025', type: 'Civil'    },
  { id: 'KA-HC-2024-8823', name: 'Rajan Exports vs. HDFC Bank Ltd.',      time: '03:00 PM', room: 'COURT-12C', status: 'Ready',        date: '25 Jul 2025', type: 'Commercial' },
];

const STATUS_CONFIG = {
  'Scheduled':   { color: '#fcc934', bg: 'rgba(252,201,52,0.08)',  dot: '#fcc934' },
  'Pending Docs':{ color: '#f28b82', bg: 'rgba(242,139,130,0.08)', dot: '#f28b82' },
  'Ready':       { color: '#81c995', bg: 'rgba(129,201,149,0.08)', dot: '#81c995' },
};

const TYPE_COLOR = {
  'Criminal':   '#f28b82',
  'Civil':      '#8ab4f8',
  'Commercial': '#fcc934',
};

const ROLE_CONFIG = {
  judge:   { icon: <Scale size={22} />,       title: "Judge's Hearing Dashboard",    subtitle: "Today's scheduled hearings",         btn: 'Start Hearing'       },
  lawyer:  { icon: <Users size={22} />,       title: 'Assigned Cases',               subtitle: 'Your hearings for today',            btn: 'Join Hearing'        },
  custody: { icon: <Lock size={22} />,        title: 'Custody Node — Secure Access', subtitle: 'Accused hearing access',             btn: 'Join Secure Hearing' },
  clerk:   { icon: <ClipboardList size={22}/>, title: "Clerk's Hearing Log",          subtitle: 'Observer access to hearings',        btn: 'Observe Hearing'     },
};

const Dashboard = ({ role, onCaseSelect }) => {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.clerk;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Load hearings from Firestore
  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      getHearingsByJudge(user.uid)
        .then(hearings => {
          // Transform Firestore hearings to match expected format
          const transformed = hearings.map((h, idx) => ({
            id: h.id,  // Use Firestore document ID for unique key
            caseId: h.caseId,
            name: h.caseName || 'Untitled Case',
            time: h.scheduledTime || '10:00 AM',
            room: `COURT-${Math.floor(Math.random() * 20) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
            status: h.status === 'scheduled' ? 'Scheduled' : h.status === 'active' ? 'Ready' : 'Pending Docs',
            date: h.scheduledDate ? new Date(h.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD',
            type: h.type?.includes('Criminal') ? 'Criminal' : h.type?.includes('Civil') ? 'Civil' : 'Commercial',
            hearingId: h.id,
            roomId: h.roomId,
            parties: h.parties,
            agenda: h.agenda,
            draftAttached: h.draftAttached
          }));

          // DEDUPLICATION: Use caseId as the unique key to show only the LATEST schedule for a case
          // First, sort all by date and time (descending) so the newest is first
          const sortedAll = [...transformed].sort((a, b) => {
            const dateA = a.date === 'TBD' ? '0' : a.date;
            const dateB = b.date === 'TBD' ? '0' : b.date;
            if (dateB !== dateA) return dateB.localeCompare(dateA);
            return b.time.localeCompare(a.time);
          });

          const uniqueMap = new Map();
          sortedAll.forEach(h => {
            const key = h.caseId || h.roomId || h.id;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, h);
            }
          });

          const deduplicated = Array.from(uniqueMap.values());

          // FINAL SORTING FOR DISPLAY: Ready/Active first, then by time (ascending)
          deduplicated.sort((a, b) => {
            if (a.status === 'Ready' && b.status !== 'Ready') return -1;
            if (a.status !== 'Ready' && b.status === 'Ready') return 1;
            return a.time.localeCompare(b.time);
          });

          setCases(deduplicated);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading hearings:', err);
          // Fallback to mock data if error
          setCases(MOCK_CASES);
          setLoading(false);
        });
    } else {
      // Not logged in, show mock data
      setCases(MOCK_CASES);
      setLoading(false);
    }
  }, [user]);

  return (
    <div className="vhd-root">

      {/* ── HEADER ── */}
      <div className="vhd-header">
        <div className="vhd-header-left">
          <div className="vhd-header-icon">{cfg.icon}</div>
          <div>
            <h1 className="vhd-title">{cfg.title}</h1>
            <p className="vhd-sub">{cfg.subtitle} · <span className="vhd-date">{today}</span></p>
          </div>
        </div>
        <div className="vhd-header-right">
          {role === 'custody' && <div className="vhd-custody-pill">🔒 SECURE FACILITY ACCESS</div>}
          <div className="vhd-count-pill">
            <FileText size={13} /> {cases.length} Hearings Today
          </div>
        </div>
      </div>

      {/* ── TABLE HEADER ── */}
      <div className="vhd-table-head">
        <div className="vhd-col-time">Time</div>
        <div className="vhd-col-case">Case</div>
        <div className="vhd-col-room">Courtroom</div>
        <div className="vhd-col-status">Status</div>
        <div className="vhd-col-action"></div>
      </div>

      {/* ── ROWS ── */}
      <div className="vhd-rows">
        {loading ? (
          <div className="vhd-loading">
            <Clock size={32} style={{ opacity: 0.3 }} />
            <div style={{ marginTop: '12px', opacity: 0.6 }}>Loading hearings...</div>
          </div>
        ) : cases.length === 0 ? (
          <div className="vhd-loading">
            <Calendar size={32} style={{ opacity: 0.3 }} />
            <div style={{ marginTop: '12px', opacity: 0.6 }}>No hearings scheduled</div>
            <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.4 }}>Schedule a hearing from the Scheduler tab</div>
          </div>
        ) : (
          cases.map((c, i) => {
            const sc = STATUS_CONFIG[c.status];
            return (
              <div key={c.id} className="vhd-row" onClick={() => onCaseSelect(c)}>

                {/* Time */}
                <div className="vhd-col-time">
                  <div className="vhd-time">{c.time}</div>
                  <div className="vhd-sno">#{String(i + 1).padStart(2, '0')}</div>
                </div>

                {/* Case */}
                <div className="vhd-col-case">
                  <div className="vhd-case-top">
                    <span className="vhd-case-id">{c.caseId || c.id}</span>
                    <span className="vhd-type-tag" style={{ color: TYPE_COLOR[c.type], borderColor: TYPE_COLOR[c.type] }}>
                      {c.type}
                    </span>
                  </div>
                  <div className="vhd-case-name">{c.name}</div>
                  {role === 'custody' && (
                    <div className="vhd-custody-note">Accused: Arjun Mehta · Arthur Road Jail</div>
                  )}
                </div>

                {/* Room */}
                <div className="vhd-col-room">
                  <div className="vhd-room-name"><MapPin size={12} /> {c.room}</div>
                  <div className="vhd-room-date"><Calendar size={12} /> {c.date}</div>
                </div>

                {/* Status */}
                <div className="vhd-col-status">
                  <div className="vhd-status-pill" style={{ color: sc.color, background: sc.bg, borderColor: sc.color }}>
                    <span className="vhd-status-dot" style={{ background: sc.dot }} />
                    {c.status}
                  </div>
                </div>

                {/* Action */}
                <div className="vhd-col-action">
                  <button className="vhd-btn" onClick={(e) => { e.stopPropagation(); onCaseSelect(c); }}>
                    {cfg.btn} <ChevronRight size={15} />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default Dashboard;
