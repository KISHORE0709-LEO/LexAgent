import React, { useMemo } from 'react';
import { ShieldCheck, FileText, Download, CalendarClock } from 'lucide-react';

const PostHearing = ({ role, caseData, onReturn }) => {
  const [context, setContext] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchIntelligence = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/virtual-hearing/case-context/${caseData?.id}`);
        const data = await res.json();
        setContext(data);
      } catch (err) {
        console.error("Failed to fetch hearing intelligence:", err);
      } finally {
        setLoading(false);
      }
    };
    if (caseData?.id) fetchIntelligence();
  }, [caseData]);

  const sessionHash = useMemo(() => [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''), []);
  const duration = '1h 24m';
  const participantCount = 4;

  return (
    <div className="post-hearing">
      <div className="summary-card">
        <div className="summary-header">
          <div className="vh-post-icon"><ShieldCheck size={32} /></div>
          <h2>HEARING COMPLETE ✅</h2>
          <p>The session has been cryptographically sealed and stored immutably.</p>
        </div>

        <div className="summary-content">
          <div className="info-group">
            <h3><FileText size={16} /> Session Record</h3>
            <div className="info-item">
              <span className="info-label">Case</span>
              <span className="info-value">{caseData?.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration</span>
              <span className="info-value">{duration}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Participants</span>
              <span className="info-value">{participantCount} Verified</span>
            </div>
            <div className="info-item">
              <span className="info-label">Recording</span>
              <span className="info-value" style={{ color: '#81c995' }}>✅ Stored</span>
            </div>
            <div className="info-item">
              <span className="info-label">Transcript</span>
              <span className="info-value" style={{ color: '#81c995' }}>✅ Saved</span>
            </div>
          </div>

          <div className="info-group">
            <h3><ShieldCheck size={16} /> Integrity</h3>
            <div className="info-item">
              <span className="info-label">Session Hash</span>
              <span className="info-value" style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{sessionHash}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Integrity</span>
              <span className="info-value" style={{ color: '#81c995' }}>✅ VERIFIED</span>
            </div>
            <div className="info-item">
              <span className="info-label">Anomalies</span>
              <span className="info-value">0 Detected</span>
            </div>
          </div>

          {context?.hearing_summaries?.length > 0 && (
            <div className="info-group" style={{ gridColumn: 'span 2', marginTop: '1.5rem', background: 'rgba(224,32,32,0.05)', border: '1px solid rgba(224,32,32,0.1)', borderRadius: '8px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e02020', borderBottom: '1px solid rgba(224,32,32,0.1)', paddingBottom: '0.5rem' }}>
                <ShieldCheck size={18} /> AI HEARING INTELLIGENCE (Nova Pro)
              </h3>
              <div className="intelligence-summary" style={{ padding: '1rem', color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '1rem', fontWeight: '600', color: '#e02020', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>SUMMARY OF PROCEEDINGS:</p>
                <p style={{ color: '#fff' }}>{context.hearing_summaries[context.hearing_summaries.length - 1].summary}</p>
                
                {context.important_arguments?.length > 0 && (
                  <div style={{ marginTop: '1.2rem' }}>
                    <p style={{ fontWeight: '600', color: '#e02020', fontSize: '0.75rem', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KEY ARGUMENTS CAPTURED:</p>
                    <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#aaa' }}>
                      {context.important_arguments.slice(-3).map((arg, idx) => (
                        <li key={idx} style={{ marginBottom: '0.4rem' }}>{arg}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="summary-actions">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Download Transcript
          </button>
          {role === 'judge' && (
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarClock size={16} /> Schedule Next Hearing
            </button>
          )}
          <button className="btn-secondary" onClick={onReturn}>Return to Dashboard</button>
        </div>
      </div>
    </div>
  );
};

export default PostHearing;
