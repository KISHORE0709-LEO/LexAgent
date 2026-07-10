import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useMandamus } from '../context/MandamusContext';
import { 
  ShieldCheck, 
  FileText, 
  Calendar,
  AlertTriangle,
  Gavel,
  Briefcase,
  Users,
  Search,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import './JudgeDashboard.css';

export default function JudgeDashboard({ setActiveFeature }) {
  const { user } = useAuth();
  const { updateState } = useMandamus();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!user?.email) return;

    console.log(`Judge Dashboard: Synchronizing docket for ${user.email}`);
    setIsLoading(true);

    // REAL-TIME LISTENER: Only fetch cases assigned to THIS judge email
    const q = query(
      collection(db, 'cases'),
      where('assigned_judge_email', '==', user.email.toLowerCase().trim())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCases = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Intelligent sorting: Undertrial first, then high priority, then newest
      fetchedCases.sort((a, b) => {
        if (a.undertrial && !b.undertrial) return -1;
        if (!a.undertrial && b.undertrial) return 1;
        
        const priorityScore = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        const scoreA = priorityScore[a.priority] || 0;
        const scoreB = priorityScore[b.priority] || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;

        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      });

      setCases(fetchedCases);
      setIsLoading(false);
    }, (error) => {
      console.error("Docket Sync Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
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

  const urgentCount = cases.filter(c => c.undertrial || c.priority === 'Critical').length;
  const civilCount = cases.filter(c => (c.type || '').toLowerCase() === 'civil').length;
  const criminalCount = cases.filter(c => (c.type || '').toLowerCase() === 'criminal').length;

  return (
    <div className="jd-page view-fade">
      {/* HEADER */}
      <div className="jd-header">
        <div className="jd-title-group">
          <h1>Judicial Chambers</h1>
          <span className="jd-sub">Logged in as: <strong style={{color: '#fff'}}>{user?.email}</strong></span>
        </div>
        <div className="jd-user-badge">
          <ShieldCheck size={18} />
          SECURE SESSION ENCLAVE
        </div>
      </div>

      {/* METRICS */}
      <div className="jd-metrics">
        <div className="jd-metric-card">
          <Briefcase size={24} className="jd-metric-icon" />
          <span className="jd-metric-val">{cases.length < 10 ? `0${cases.length}` : cases.length}</span>
          <span className="jd-metric-lbl">Active Docket</span>
        </div>
        <div className="jd-metric-card">
          <AlertTriangle size={24} className="jd-metric-icon" />
          <span className="jd-metric-val">{urgentCount < 10 ? `0${urgentCount}` : urgentCount}</span>
          <span className="jd-metric-lbl">Urgent Matters</span>
        </div>
        <div className="jd-metric-card">
          <Users size={24} className="jd-metric-icon" />
          <span className="jd-metric-val">{civilCount < 10 ? `0${civilCount}` : civilCount}</span>
          <span className="jd-metric-lbl">Civil Disputes</span>
        </div>
        <div className="jd-metric-card">
          <Gavel size={24} className="jd-metric-icon" />
          <span className="jd-metric-val">{criminalCount < 10 ? `0${criminalCount}` : criminalCount}</span>
          <span className="jd-metric-lbl">Criminal Matters</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="jd-main-content">
        <div className="jd-section-header">
          <h2 className="jd-section-title">
            <BookOpen size={24} color="#e02020" />
            Live Docket Feed
          </h2>
          <div className="jd-filters">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Matters</option>
              <option value="civil">Civil Only</option>
              <option value="criminal">Criminal Only</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="jd-loading">
            <RefreshCw className="spinner" size={32} />
            <p>Synchronizing with central judicial database...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="jd-empty glass-card">
            <FileText size={48} color="#222" />
            <p>Your judicial docket is currently clear.</p>
            <span>Cases assigned to <strong>{user?.email}</strong> will appear here instantly.</span>
          </div>
        ) : (
          <div className="jd-docket-list">
            {filteredCases.map(c => (
              <div key={c.id} className={`jd-case-row glass-card ${c.priority === 'Critical' || c.undertrial ? 'jd-case-urgent' : ''}`}>
                <div className="jd-row-main">
                  <div className="jd-row-header">
                    <span className="jd-case-id-badge">ID: {c.id.substring(0, 8)}</span>
                    <h3 className="jd-case-title">{c.title}</h3>
                  </div>
                  <div className="jd-case-badges">
                    <span className={`badge ${(c.type || 'civil').toLowerCase()}`}>{c.type}</span>
                    <span className={`badge ${(c.priority || 'Medium').toLowerCase()}`}>{c.priority} PRIORITY</span>
                    <span className="badge pipeline-stage">{c.pipeline_stage ? c.pipeline_stage.toUpperCase() : 'PENDING'}</span>
                  </div>
                </div>

                <div className="jd-row-details">
                  <div className="jd-cell">
                    <span className="jd-cell-lbl">PARTIES</span>
                    <span className="jd-cell-val">{c.petitioner} <br/> <small>vs</small> <br/> {c.respondent}</span>
                  </div>
                  <div className="jd-cell">
                    <span className="jd-cell-lbl">TIMELINE</span>
                    <span className="jd-cell-val">Filed: {c.filedDate}<br/>Hearing: {c.hearingDate || 'TBD'}</span>
                  </div>
                </div>

                <div className="jd-row-action">
                  <button 
                    className="jd-btn jd-btn-primary"
                    onClick={() => navigateToCaseDetail(c)}
                  >
                    OPEN FILE <Search size={16} />
                  </button>
                  <button 
                    className="jd-btn jd-btn-secondary"
                    onClick={() => {
                      updateState({ active_case: c });
                      if (setActiveFeature) {
                        setActiveFeature('scheduler');
                      } else {
                        navigate(`/dashboard?feature=scheduler&caseId=${c.id}`);
                      }
                    }}
                    style={{ marginLeft: '10px', backgroundColor: 'rgba(224, 32, 32, 0.2)', border: '1px solid #e02020', color: '#ffb3b3' }}
                  >
                    SCHEDULE <Calendar size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
