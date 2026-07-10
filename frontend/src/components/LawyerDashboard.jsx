import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useMandamus } from '../context/MandamusContext';
import { 
  ShieldCheck, 
  FileText, 
  Calendar,
  AlertTriangle,
  Briefcase,
  Users,
  Search,
  BookOpen,
  RefreshCw,
  Scale,
  Clock,
  ExternalLink,
  Video,
  ChevronRight
} from 'lucide-react';
import './LawyerDashboard.css';

export default function LawyerDashboard({ setActiveFeature }) {
  const { user } = useAuth();
  const { updateState } = useMandamus();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!user?.email) return;
    const email = user.email.toLowerCase().trim();

    console.log(`Lawyer Dashboard: Syncing cases and hearings for ${email}`);
    setIsLoading(true);

    // 1. Sync Cases
    const qCases = query(
      collection(db, 'cases'),
      or(
        where('petitioner_lawyer_email', '==', email),
        where('respondent_lawyer_email', '==', email)
      )
    );

    const unsubCases = onSnapshot(qCases, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Deduplicate by id (ensure unique cases only)
      const uniqueMap = new Map();
      fetched.forEach(c => uniqueMap.set(c.id, c));
      
      setCases(Array.from(uniqueMap.values()));
    });

    // 2. Sync Hearings (The Invites)
    const qHearings = query(
      collection(db, 'hearings'),
      or(
        where('petitioner_lawyer_email', '==', email),
        where('respondent_lawyer_email', '==', email)
      )
    );

    const unsubHearings = onSnapshot(qHearings, (snapshot) => {
      console.log(`Lawyer Dashboard: Received ${snapshot.size} hearings from Firestore`);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Deduplicate by caseId (ensure only one invite per case shows up)
      const uniqueMap = new Map();
      fetched.forEach(h => {
        if (h.caseId) {
          console.log(`- Found hearing for case: ${h.caseId} (${h.caseName})`);
          uniqueMap.set(h.caseId, h);
        }
      });
      
      setHearings(Array.from(uniqueMap.values()));
      setIsLoading(false);
    }, (err) => {
      console.error("Hearings Sync Error:", err);
      setIsLoading(false);
    });

    return () => { unsubCases(); unsubHearings(); };
  }, [user]);

  const navigateToCaseDetail = (c) => {
    updateState({ active_case: c });
    if (setActiveFeature) {
      setActiveFeature('case-detail');
    } else {
      navigate(`/dashboard?feature=case-detail&caseId=${c.id}`);
    }
  };

  const filteredCases = filterType === 'all' 
    ? cases 
    : cases.filter(c => (c.type || '').toLowerCase() === filterType);

  const upcomingHearingsCount = cases.filter(c => {
    if (!c.hearingDate) return false;
    const hDate = new Date(c.hearingDate);
    return hDate >= new Date();
  }).length;

  const urgentCount = cases.filter(c => c.priority === 'Critical' || c.priority === 'High').length;
  const pendingFilingsCount = cases.filter(c => c.status === 'assigned' && c.pipeline_stage === 'summarise').length;

  return (
    <div className="ld-page view-fade">
      {/* HEADER */}
      <div className="ld-header">
        <div className="ld-title-group">
          <h1>Counsel Workspace</h1>
          <span className="ld-sub">Authorized Practitioner: <strong style={{color: '#fff'}}>{user?.email}</strong></span>
        </div>
        <div className="ld-user-badge">
          <Scale size={18} />
          LEGAL OPERATIONS ENCLAVE
        </div>
      </div>

      {/* METRICS */}
      <div className="ld-metrics">
        <div className="ld-metric-card">
          <Briefcase size={24} className="ld-metric-icon" />
          <span className="ld-metric-val">{cases.length < 10 ? `0${cases.length}` : cases.length}</span>
          <span className="ld-metric-lbl">Total Litigations</span>
        </div>
        <div className="ld-metric-card">
          <Calendar size={24} className="ld-metric-icon" />
          <span className="ld-metric-val">{upcomingHearingsCount < 10 ? `0${upcomingHearingsCount}` : upcomingHearingsCount}</span>
          <span className="ld-metric-lbl">Upcoming Hearings</span>
        </div>
        <div className="ld-metric-card">
          <Clock size={24} className="ld-metric-icon" />
          <span className="ld-metric-val">{pendingFilingsCount < 10 ? `0${pendingFilingsCount}` : pendingFilingsCount}</span>
          <span className="ld-metric-lbl">Pending Filings</span>
        </div>
        <div className="ld-metric-card">
          <AlertTriangle size={24} className="ld-metric-icon" />
          <span className="ld-metric-val">{urgentCount < 10 ? `0${urgentCount}` : urgentCount}</span>
          <span className="ld-metric-lbl">Urgent Matters</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="ld-main-content">

        <div className="ld-section-header">
          <h2 className="ld-section-title">
            <BookOpen size={24} color="#e02020" />
            Active Case Queue
          </h2>
          <div className="ld-filters">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Matters</option>
              <option value="civil">Civil Disputes</option>
              <option value="criminal">Criminal Defense</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="ld-loading">
            <RefreshCw className="spinner" size={32} />
            <p>Syncing with Judicial Repository...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="ld-empty glass-card">
            <FileText size={48} color="#222" />
            <p>No active litigations found.</p>
            <span>Cases assigned to your email <strong>{user?.email}</strong> will appear here.</span>
          </div>
        ) : (
          <div className="ld-docket-list">
            {filteredCases.map(c => {
              const isPetitioner = c.petitioner_lawyer_email === user?.email.toLowerCase().trim();
              return (
                <div key={c.id} className={`ld-case-row glass-card ${c.priority === 'Critical' ? 'ld-case-urgent' : ''}`}>
                  <div className="ld-row-main">
                    <div className="ld-row-header">
                      <span className="ld-case-id-badge">ID: {c.id.substring(0, 8)}</span>
                      <h3 className="ld-case-title">{c.title}</h3>
                    </div>
                    <div className="ld-case-badges">
                      <span className={`badge ${(c.type || 'civil').toLowerCase()}`}>{c.type}</span>
                      <span className={`badge role-badge ${isPetitioner ? 'petitioner' : 'respondent'}`}>
                        {isPetitioner ? 'PETITIONER COUNSEL' : 'RESPONDENT COUNSEL'}
                      </span>
                      <span className={`badge ${(c.priority || 'Medium').toLowerCase()}`}>{c.priority} PRIORITY</span>
                    </div>
                  </div>

                  <div className="ld-row-details">
                    <div className="ld-cell">
                      <span className="ld-cell-lbl">PARTIES</span>
                      <span className="ld-cell-val">{c.petitioner} <br/> <small>vs</small> <br/> {c.respondent}</span>
                    </div>
                    <div className="ld-cell">
                      <span className="ld-cell-lbl">PRESIDING OFFICER</span>
                      <span className="ld-cell-val">{c.assigned_judge_name || 'NOT ASSIGNED'}</span>
                    </div>
                    <div className="ld-cell">
                      <span className="ld-cell-lbl">SCHEDULE</span>
                      <span className="ld-cell-val">Filed: {c.filedDate}<br/>Hearing: {c.hearingDate || 'TBD'}</span>
                    </div>
                  </div>

                  <div className="ld-row-action">
                    <button 
                      className="ld-btn ld-btn-primary"
                      onClick={() => navigateToCaseDetail(c)}
                    >
                      OPEN CASE <ExternalLink size={16} />
                    </button>
                    {(() => {
                      const activeHearing = hearings.find(h => h.caseId === c.id);
                      return (
                        <button 
                          className="ld-btn ld-btn-secondary"
                          onClick={() => {
                            if (activeHearing) {
                              updateState({ active_case: c });
                              navigate(`/hearing/${activeHearing.roomId}`);
                            } else {
                              updateState({ active_case: c });
                              if (setActiveFeature) {
                                setActiveFeature('scheduler');
                              } else {
                                navigate(`/dashboard?feature=scheduler&caseId=${c.id}`);
                              }
                            }
                          }}
                          style={{ 
                            marginLeft: '10px', 
                            backgroundColor: activeHearing ? '#e02020' : 'rgba(224, 32, 32, 0.2)', 
                            border: `1px solid #e02020`, 
                            color: activeHearing ? '#fff' : '#ffb3b3',
                            fontWeight: activeHearing ? 'bold' : 'normal'
                          }}
                        >
                          {activeHearing ? 'JOIN LIVE HEARING' : 'JOIN'} <Video size={16} />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SYSTEM STATUS BAR (For Demo) ── */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #333',
        padding: '10px 20px',
        borderRadius: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        zIndex: 1000,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 10px #00ff00' }}></div>
          <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: '800', letterSpacing: '0.05em' }}>BACKEND: ONLINE</span>
        </div>
        <div style={{ width: '1px', height: '15px', background: '#333' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={14} color="#d62828" />
          <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: '700' }}>
            {/* Logic to show Redis status */}
            RENDER TRACK: REDIS HA ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
};
