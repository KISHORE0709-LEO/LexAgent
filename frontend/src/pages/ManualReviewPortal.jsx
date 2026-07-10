import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChevronLeft, FileText, Scale, Send, ShieldAlert, CheckCircle2, ShieldEllipsis, AlertCircle } from 'lucide-react';
import './ManualReviewPortal.css';

const DEFAULT_MOCK = {
  case_id: "DOC-2849",
  court_name: "New York",
  filing_date: "2026",
  petitioner: "Global Corp LLC",
  respondent: "Aegis Tech Inc",
  plain_summary: "This is a standard Software Services Master Agreement containing typical vendor-favorable terms, evaluated under New York jurisdiction.",
  key_facts: [
    "Agreement dated October 12, 2025.",
    "Services include enterprise cloud migration and systems integration.",
    "Governing Law is designated as the State of New York."
  ],
  ipc_sections: [
    {
      section: "[HIGH] Clause",
      riskLevel: "high",
      originalClause: "Contractor shall indemnify, defend, and hold Client completely harmless from any and all damages, claims, liabilities, and expenses, including third-party IP infringement, without any monetary cap or negligence carve-outs.",
      revisedClause: "Contractor shall indemnify Client for direct third-party claims arising out of Contractor's gross negligence, capped at the fees paid under this Agreement, excluding indirect damages.",
      rationale: "Broad unilateral uncapped indemnification. Exposes contractor to extreme financial liabilities.",
      guardPassed: false,
      guardReasons: ["Uncapped indemnity detected", "Broad patent infringement risk"]
    },
    {
      section: "[MEDIUM] Clause",
      riskLevel: "medium",
      originalClause: "Employee agrees not to solicit any company client, customer, employee, or independent contractor for a period of two (2) years following termination of employment.",
      revisedClause: "Employee shall not solicit Company's active clients for a period of one (1) year following termination, restricted strictly to clients Employee directly managed.",
      rationale: "Exceeded standard duration for non-solicitation covenants under New York law, which typically favors 6-12 months.",
      guardPassed: true,
      guardReasons: []
    },
    {
      section: "[LOW] Clause",
      riskLevel: "low",
      originalClause: "Each party shall maintain the confidentiality of all trade secrets and proprietary information disclosed during the term of the agreement.",
      revisedClause: "Each party shall maintain the confidentiality of all trade secrets and proprietary information disclosed during the term of the agreement.",
      rationale: "Standard mutual confidentiality protection with standard exclusions.",
      guardPassed: true,
      guardReasons: []
    }
  ]
};

export default function ManualReviewPortal() {
  const location = useLocation();
  const navigate = useNavigate();

  // Load from router state if available, otherwise fall back to rich default mock
  const analysisData = location.state?.analysisData || DEFAULT_MOCK;
  const clauses = analysisData.ipc_sections || [];

  const [edits, setEdits] = useState({});
  const [comments, setComments] = useState({});
  const [escalated, setEscalated] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const getEditedValue = (index, original) => {
    return edits[index] !== undefined ? edits[index] : (original || "");
  };

  const getCommentValue = (index) => {
    return comments[index] || "";
  };

  const handleDraftChange = (index, val) => {
    setEdits(prev => ({ ...prev, [index]: val }));
  };

  const handleCommentChange = (index, val) => {
    setComments(prev => ({ ...prev, [index]: val }));
  };

  const handleEscalate = (index) => {
    setEscalated(prev => ({ ...prev, [index]: true }));
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Prepare data for Risk Transparency Pie Chart
  const riskCounts = clauses.reduce((acc, curr) => {
    const level = curr.riskLevel?.toLowerCase() || 'low';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, { low: 0, medium: 0, high: 0 });

  const chartData = [
    { name: 'High Risk', value: riskCounts.high, color: '#ff4d4d' },
    { name: 'Medium Risk', value: riskCounts.medium, color: '#ffb938' },
    { name: 'Low Risk', value: riskCounts.low, color: '#00e676' }
  ].filter(item => item.value > 0);

  const COLORS = chartData.map(d => d.color);

  return (
    <div className="portal-container" id="manual-review-portal-root">
      {/* ── HEADER ── */}
      <header className="portal-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')} id="btn-back-to-dashboard">
          <ChevronLeft size={16} />
          <span>Back to Agent Dashboard</span>
        </button>
        <div className="header-title">
          <Scale size={20} className="header-icon" />
          <h1>Manual Review Portal</h1>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button"
            className="signoff-portal-btn" 
            onClick={() => {
              const escalatedList = clauses
                .map((c, idx) => {
                  const hasDraftEdit = edits[idx] !== undefined;
                  const currentRevised = hasDraftEdit ? edits[idx] : c.revisedClause;
                  return { 
                    ...c, 
                    originalIdx: idx, 
                    isEscalated: escalated[idx],
                    revisedClause: currentRevised,
                  };
                })
                .filter(c => c.isEscalated || (c.riskLevel === 'high' && escalated[c.originalIdx]));
              navigate('/partner-signoff', { 
                state: { 
                  escalatedClauses: escalatedList, 
                  court_name: analysisData.court_name, 
                  confidence_score: analysisData.confidence_score 
                } 
              });
            }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 77, 77, 0.4)',
              color: '#ff4d4d',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            id="btn-go-to-signoff-portal"
          >
            Senior Partner Sign-off
          </button>
          <button className="save-btn" onClick={handleSave} id="btn-save-manual-review">
            Save Review
          </button>
        </div>
      </header>

      {saveSuccess && (
        <div className="save-notification">
          <CheckCircle2 size={16} />
          <span>Review saved successfully. Updated drafts are archived.</span>
        </div>
      )}

      {/* ── CONTENT GRID ── */}
      <div className="portal-grid">
        {/* Left Column: Dashboard Metrics */}
        <aside className="portal-sidebar-metrics">
          <div className="metric-card glass-panel">
            <h2>Contract Details</h2>
            <div className="meta-list">
              <div className="meta-item">
                <span className="label">Case/Doc ID:</span>
                <span className="val">{analysisData.case_id}</span>
              </div>
              <div className="meta-item">
                <span className="label">Jurisdiction:</span>
                <span className="val jurisdiction-pill">{analysisData.court_name}</span>
              </div>
              <div className="meta-item">
                <span className="label">Petitioner:</span>
                <span className="val">{analysisData.petitioner}</span>
              </div>
              <div className="meta-item">
                <span className="label">Respondent:</span>
                <span className="val">{analysisData.respondent}</span>
              </div>
            </div>
            <div className="summary-section">
              <h3>Summary Overview</h3>
              <p>{analysisData.plain_summary}</p>
            </div>
            {analysisData.key_facts?.length > 0 && (
              <div className="key-facts-section">
                <h3>Key Grounding Facts</h3>
                <ul>
                  {analysisData.key_facts.map((fact, idx) => (
                    <li key={idx}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="metric-card glass-panel chart-panel">
            <h2>Risk Transparency Dashboard</h2>
            <p className="chart-subtitle">Distribution of risk levels across evaluated clauses</p>
            {chartData.length > 0 ? (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#111026', border: '1px solid #332f63', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="no-chart-data">No rated clauses detected.</div>
            )}
          </div>
        </aside>

        {/* Right Column: Clause Editor */}
        <section className="portal-main-editor">
          <div className="section-header">
            <h2>Clause Analysis & Editing</h2>
            <span className="badge-count">{clauses.length} Clauses Scanned</span>
          </div>

          {clauses.length === 0 ? (
            <div className="no-clauses glass-panel">
              <FileText size={48} />
              <p>No analyzed clauses found for this contract.</p>
            </div>
          ) : (
            <div className="clauses-list">
              {clauses.map((clause, idx) => {
                const risk = clause.riskLevel?.toLowerCase() || "low";
                const isEscalated = escalated[idx];
                const isBlocked = !clause.guardPassed;

                return (
                  <div key={idx} className={`clause-card glass-panel risk-border--${risk}`}>
                    <div className="clause-card__header">
                      <div className="header-left">
                        <span className={`risk-badge risk-badge--${risk}`}>
                          {risk.toUpperCase()} RISK
                        </span>
                        <h3>Clause #{idx + 1}</h3>
                      </div>
                      <div className="header-right">
                        {isEscalated ? (
                          <span className="escalation-status escalated" id={`escalation-status-${idx}`}>
                            <ShieldAlert size={14} /> Escalated to Partner
                          </span>
                        ) : risk === 'high' ? (
                          <button
                            className="escalate-btn"
                            onClick={() => handleEscalate(idx)}
                            id={`btn-escalate-${idx}`}
                          >
                            <ShieldEllipsis size={14} /> Escalate to Senior Partner
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="clause-card__body">
                      {/* Original Clause */}
                      <div className="text-block">
                        <span className="block-label">Original Contract Clause</span>
                        <div className="block-content original-box">
                          {clause.originalClause}
                        </div>
                      </div>

                      {/* Rationale / Explanatory */}
                      {clause.rationale && (
                        <div className="text-block">
                          <span className="block-label">Risk Explanation / Rationale</span>
                          <div className="block-content rationale-box">
                            <AlertCircle size={14} className="rationale-icon" />
                            <span>{clause.rationale}</span>
                          </div>
                        </div>
                      )}

                      {/* Enkrypt Blocks */}
                      {isBlocked && (
                        <div className="blocked-alert">
                          <ShieldAlert size={14} />
                          <span>
                            <strong>Enkrypt AI Output Guard Blocked Draft:</strong>{" "}
                            {clause.guardReasons?.join(", ") || "Safety violation detected"}
                          </span>
                        </div>
                      )}

                      {/* Inline AI Suggestion Edit */}
                      <div className="edit-block">
                        <span className="block-label">Revised AI Clause Draft (Inline Editor)</span>
                        <textarea
                          className="edit-textarea"
                          value={getEditedValue(idx, clause.revisedClause || clause.originalClause)}
                          onChange={(e) => handleDraftChange(idx, e.target.value)}
                          placeholder="Modify the revised clause here..."
                          id={`textarea-draft-${idx}`}
                        />
                      </div>

                      {/* Comments / Annotations */}
                      <div className="comment-block">
                        <span className="block-label">Comments & Annotations</span>
                        <textarea
                          className="comment-textarea"
                          value={getCommentValue(idx)}
                          onChange={(e) => handleCommentChange(idx, e.target.value)}
                          placeholder="Add comments, issues, or instructions for senior counsel here..."
                          id={`textarea-comment-${idx}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
