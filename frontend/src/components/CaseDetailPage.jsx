import React from 'react';
import { useMandamus } from '../context/MandamusContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, BrainCircuit, Search, FileText, Calendar, Video, CheckCircle2, ShieldCheck, Briefcase, Download } from 'lucide-react';
import './CaseDetailPage.css';

export default function CaseDetailPage({ onTabChange }) {
  const { state } = useMandamus();
  const { user } = useAuth();
  const activeCase = state.active_case;
  const currentStage = state.pipeline_stage || 'summarise';

  if (!activeCase) {
    return (
      <div className="cdp-page">
        <div className="cdp-header">
          <button className="cdp-back-btn" onClick={() => onTabChange(user?.role === 'lawyer' ? 'lawyer-dashboard' : 'judge-dashboard')}>
            <ArrowLeft size={14} /> BACK TO DOCKET
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '100px', color: '#888', fontFamily: 'monospace' }}>
          NO ACTIVE CASE SELECTED. PLEASE RETURN TO DOCKET.
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    if (!activeCase.case_text) return;
    const blob = new Blob([activeCase.case_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Case_${activeCase.id || 'Document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cdp-page">
      {/* HEADER */}
      <div className="cdp-header">
        <div className="cdp-title-group">
          <h1>{activeCase.title || 'Case Overview'}</h1>
          <span className="cdp-sub">CASE ID: {activeCase.id || 'N/A'}</span>
        </div>
        <button className="cdp-back-btn" onClick={() => onTabChange(user?.role === 'lawyer' ? 'lawyer-dashboard' : 'judge-dashboard')}>
          <ArrowLeft size={14} /> BACK TO DOCKET
        </button>
      </div>

      <div className="cdp-layout">
        {/* LEFT COLUMN: Metadata & Pipeline */}
        <div className="cdp-sidebar">
          
          <div className="cdp-info-list">
            <div className="cdp-info-item">
              <span className="cdp-info-label">Petitioner</span>
              <span className="cdp-info-value">{activeCase.petitioner || 'N/A'}</span>
            </div>
            <div className="cdp-info-item">
              <span className="cdp-info-label">Respondent</span>
              <span className="cdp-info-value">{activeCase.respondent || 'N/A'}</span>
            </div>
            <div className="cdp-info-item">
              <span className="cdp-info-label">Case Type</span>
              <span className="cdp-info-value">{activeCase.type ? activeCase.type.toUpperCase() : 'N/A'}</span>
            </div>
            <div className="cdp-info-item">
              <span className="cdp-info-label">Priority Status</span>
              <span className={`cdp-info-value ${activeCase.undertrial ? 'highlight' : ''}`}>
                {activeCase.undertrial ? 'URGENT (UNDERTRIAL)' : 'STANDARD'}
              </span>
            </div>
            <div className="cdp-info-item">
              <span className="cdp-info-label">Filed Date</span>
              <span className="cdp-info-value">{activeCase.filedDate || 'N/A'}</span>
            </div>
            {user?.role === 'lawyer' && (
              <div className="cdp-info-item" style={{ marginTop: '15px', padding: '10px', background: 'rgba(224, 32, 32, 0.1)', border: '1px solid rgba(224, 32, 32, 0.3)' }}>
                <span className="cdp-info-label" style={{ color: '#e02020' }}>YOUR ROLE</span>
                <span className="cdp-info-value" style={{ fontWeight: '800' }}>
                  {activeCase.petitioner_lawyer_email === user.email.toLowerCase() ? 'PETITIONER COUNSEL' : 'RESPONDENT COUNSEL'}
                </span>
              </div>
            )}
          </div>

          <div className="cdp-action-panel">
            <h2 className="cdp-pipeline-title">
              <Briefcase size={16} color="#e02020" />
              CASE ACTIONS
            </h2>
            <div className="cdp-action-buttons">
              <button className="cdp-btn-summarise" onClick={() => onTabChange('summariser')}>
                <BrainCircuit size={18} /> SUMMARISE THIS CASE 
              </button>
              <button className="cdp-btn-download" onClick={handleDownload}>
                <Download size={18} /> DOWNLOAD CASE FILE
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Document Viewer */}
        <div className="cdp-viewer-container">
          <div className="cdp-viewer-header">
            <FileText size={16} color="#e02020" />
            <span className="cdp-viewer-title">OFFICIAL CASE PROCEEDINGS & AFFIDAVITS</span>
          </div>
          
          <div className="cdp-viewer-content">
            {activeCase.case_text ? activeCase.case_text : "No case text available for this case."}
          </div>
        </div>
      </div>
    </div>
  );
}
