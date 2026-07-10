import React from 'react';
import { ArrowLeft, CalendarClock, Hash, MapPin, ShieldCheck, ChevronRight } from 'lucide-react';

const CasePreHearing = ({ role, caseData, onProceed, onBack }) => {
  return (
    <div className="vh-center-wrap">
      <div className="vh-panel">
        <button className="vh-back-btn" onClick={onBack}><ArrowLeft size={16} /> Back</button>

        <div className="vh-pre-badge">HEARING SCHEDULED</div>

        <h2 className="vh-panel-title">{caseData?.name}</h2>

        <div className="vh-info-grid">
          <div className="vh-info-row">
            <Hash size={14} />
            <span className="vh-info-label">Case ID</span>
            <span className="vh-info-val">{caseData?.id}</span>
          </div>
          <div className="vh-info-row">
            <CalendarClock size={14} />
            <span className="vh-info-label">Date & Time</span>
            <span className="vh-info-val">{caseData?.date} — {caseData?.time}</span>
          </div>
          <div className="vh-info-row">
            <MapPin size={14} />
            <span className="vh-info-label">Courtroom</span>
            <span className="vh-info-val">{caseData?.room}</span>
          </div>
          <div className="vh-info-row">
            <ShieldCheck size={14} />
            <span className="vh-info-label">Status</span>
            <span className="vh-info-val" style={{ color: '#fcc934' }}>⏳ Waiting to Start</span>
          </div>
        </div>

        <div className="vh-notice">
          Biometric verification is required before entering the hearing room.
          Your identity will be verified in the next step.
        </div>

        <button className="vh-btn-primary vh-btn-full" onClick={onProceed}>
          Proceed to Verification <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default CasePreHearing;
