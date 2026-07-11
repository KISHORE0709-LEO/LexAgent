import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale, ShieldAlert, Award, FileText, CheckCircle2, XCircle, Edit3, ShieldCheck } from 'lucide-react';
import './SeniorPartnerSignoff.css';

const DEFAULT_ESCALATED = [
  {
    id: "clause-escalated-1",
    category: "Indemnification",
    riskLevel: "high",
    originalClause: "Contractor shall indemnify, defend, and hold Client completely harmless from any and all damages, claims, liabilities, and expenses, including third-party IP infringement, without any monetary cap or negligence carve-outs.",
    revisedClause: "Contractor shall indemnify Client for direct third-party claims arising out of Contractor's gross negligence, capped at the fees paid under this Agreement, excluding indirect damages.",
    rationale: "Broad unilateral uncapped indemnification. Exposes contractor to extreme financial liabilities.",
    court_name: "New York",
    confidence_score: 82,
    retrievedPrecedents: [
      "Under New York commercial law, indemnification for a party's own negligence must be explicitly and unequivocally stated (the express negligence rule).",
      "New York courts enforce mutual liability limits and caps in commercial business-to-business agreements, unless voided by gross negligence/willful misconduct."
    ]
  }
];

export default function SeniorPartnerSignoff() {
  const location = useLocation();
  const navigate = useNavigate();

  // Load from router state, fallback to mock data
  const escalatedFromState = location.state?.escalatedClauses || [];
  const courtName = location.state?.court_name || "New York";
  const confidenceScore = location.state?.confidence_score || 85;

  const escalatedClauses = escalatedFromState.length > 0 
    ? escalatedFromState 
    : DEFAULT_ESCALATED.map(c => ({ ...c, court_name: courtName, confidence_score: confidenceScore }));

  // State for actions: index -> 'approve' | 'reject' | 'edit'
  const [actions, setActions] = useState({});
  // State for modified revised text: index -> text
  const [revisedEdits, setRevisedEdits] = useState({});
  // State for digital signature
  const [signature, setSignature] = useState("");
  // Error and Success states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [successState, setSuccessState] = useState(false);

  const handleAction = (index, type) => {
    setActions(prev => ({ ...prev, [index]: type }));
  };

  const handleTextChange = (index, text) => {
    setRevisedEdits(prev => ({ ...prev, [index]: text }));
  };

  const getRevisedText = (index, originalRevised) => {
    return revisedEdits[index] !== undefined ? revisedEdits[index] : (originalRevised || "");
  };

  const getAction = (index) => {
    return actions[index] || "approve"; // default action is approve
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!signature.trim()) {
      setStatusMessage({ type: 'error', text: 'Digital signature is required to authorize this sign-off.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // Map clauses into payload expected by POST /api/approve
      const payloadClauses = escalatedClauses.map((clause, idx) => {
        const actionType = getAction(idx);
        return {
          id: clause.id || `clause-${idx}`,
          originalClause: clause.originalClause,
          revisedClause: actionType === 'approve' || actionType === 'edit' 
            ? getRevisedText(idx, clause.revisedClause) 
            : null,
          category: clause.category || "General",
          status: actionType === 'edit' ? 'edited' : actionType === 'reject' ? 'rejected' : 'approved',
          signature: signature,
        };
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clauses: payloadClauses }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit approval payload to server');
      }

      setSuccessState(true);
      setStatusMessage({ type: 'success', text: 'Approval successfully logged! Clauses archived in Reviewer Knowledge DB.' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: `Submission failed: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signoff-container" id="partner-signoff-root">
      {/* ── HEADER ── */}
      <header className="signoff-header">
        <button className="back-btn" onClick={() => navigate('/manual-review')} id="btn-back-to-review">
          <ChevronLeft size={16} />
          <span>Back to Manual Review</span>
        </button>
        <div className="header-title">
          <Award size={20} className="header-icon" />
          <h1>Senior Partner Sign-off Portal</h1>
        </div>
      </header>

      {/* ── CONTENT CONTAINER ── */}
      <div className="signoff-content">
        {successState ? (
          <div className="success-panel glass-panel">
            <ShieldCheck size={64} className="success-icon" />
            <h2>Sign-off Fully Authorized</h2>
            <p>{statusMessage?.text}</p>
            <button className="done-btn" onClick={() => navigate('/dashboard')} id="btn-signoff-done">
              Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="signoff-form">
            <div className="intro-banner glass-panel">
              <ShieldAlert size={20} className="alert-icon" />
              <div>
                <h2>Authorization Panel</h2>
                <p>
                  You are reviewing high-risk escalated clauses. Your approval or modifications will be recorded deterministically as corporate guidelines inside the Reviewer Knowledge base.
                </p>
              </div>
            </div>

            {statusMessage && statusMessage.type === 'error' && (
              <div className="error-banner">
                <ShieldAlert size={16} />
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* List of Escalated Clauses */}
            <div className="escalated-list">
              {escalatedClauses.map((clause, idx) => {
                const currentAction = getAction(idx);
                const precedents = clause.retrievedPrecedents || [];

                return (
                  <div key={idx} className="escalated-card glass-panel">
                    <div className="card-header">
                      <div className="card-badge">
                        <span className="risk-level-tag">HIGH RISK ESCALATED</span>
                        <h3>Clause Category: {clause.category}</h3>
                      </div>
                      <div className="action-toggle-group">
                        <button
                          type="button"
                          className={`action-toggle-btn action-toggle-btn--approve ${currentAction === 'approve' ? 'active' : ''}`}
                          onClick={() => handleAction(idx, 'approve')}
                          id={`action-approve-${idx}`}
                        >
                          <CheckCircle2 size={12} /> Approve AI Draft
                        </button>
                        <button
                          type="button"
                          className={`action-toggle-btn action-toggle-btn--edit ${currentAction === 'edit' ? 'active' : ''}`}
                          onClick={() => handleAction(idx, 'edit')}
                          id={`action-edit-${idx}`}
                        >
                          <Edit3 size={12} /> Edit Draft
                        </button>
                        <button
                          type="button"
                          className={`action-toggle-btn action-toggle-btn--reject ${currentAction === 'reject' ? 'active' : ''}`}
                          onClick={() => handleAction(idx, 'reject')}
                          id={`action-reject-${idx}`}
                        >
                          <XCircle size={12} /> Reject Clause
                        </button>
                      </div>
                    </div>

                    <div className="card-body">
                      {/* Explainable Risk Section */}
                      <div className="explainable-row">
                        <div className="risk-explanation-panel">
                          <h4>Explainable Risk Analysis</h4>
                          <div className="meta-info">
                            <div className="meta-pill">
                              <span className="label">Jurisdiction:</span>
                              <span className="val">{clause.court_name || "New York"}</span>
                            </div>
                            <div className="meta-pill">
                              <span className="label">Confidence Score:</span>
                              <span className="val score-val">{clause.confidenceScore || clause.confidence_score || 85}%</span>
                            </div>
                          </div>
                          <p className="rationale-text" style={{ marginBottom: '8px' }}>
                            <strong>Issue Detected:</strong> {clause.reason || clause.rationale}
                          </p>
                          {clause.impact && (
                            <p className="rationale-text" style={{ color: '#fbbf24' }}>
                              <strong>Impact:</strong> {clause.impact}
                            </p>
                          )}
                          {clause.reasoning && (
                            <p className="rationale-text" style={{ color: '#aaa', fontStyle: 'italic', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px' }}>
                              <strong>Reasoning:</strong> {clause.reasoning}
                            </p>
                          )}
                        </div>

                        {/* Retrieved Precedents */}
                        <div className="precedents-panel">
                          <h4>Retrieved Precedents (Grounding Knowledge)</h4>
                          {clause.groundingSources?.length > 0 ? (
                            <ul className="precedent-bullets">
                              {clause.groundingSources.map((source, sIdx) => (
                                <li key={sIdx} style={{ marginBottom: '6px' }}>
                                  <strong style={{ color: '#eee' }}>{source}</strong>
                                  {clause.whyPrecedent?.[sIdx] && (
                                    <div style={{ color: '#7b61ff', fontSize: '11px', fontStyle: 'italic' }}>Relevance: {clause.whyPrecedent[sIdx]}</div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : precedents.length > 0 ? (
                            <ul className="precedent-bullets">
                              {precedents.map((prec, pIdx) => (
                                <li key={pIdx}>{prec}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="no-precedents">No explicit precedents retrieved from Qdrant.</p>
                          )}
                        </div>
                      </div>

                      {/* Original Clause Display */}
                      <div className="text-display-box">
                        <span className="box-label">Original Clause Text</span>
                        <div className="box-content text-muted">
                          {clause.originalClause}
                        </div>
                      </div>

                      {/* Action Inputs */}
                      {currentAction === 'approve' && (
                        <div className="text-display-box text-display-box--approved">
                          <span className="box-label">Approved AI Revised Clause</span>
                          <div className="box-content text-approved">
                            {clause.revisedClause || "No revised draft suggested."}
                          </div>
                        </div>
                      )}

                      {currentAction === 'edit' && (
                        <div className="edit-box">
                          <span className="box-label">Edit Clause Draft</span>
                          <textarea
                            className="edit-textarea-signoff"
                            value={getRevisedText(idx, clause.revisedClause)}
                            onChange={(e) => handleTextChange(idx, e.target.value)}
                            placeholder="Type your revised partner-approved clause language here..."
                            id={`signoff-edit-textarea-${idx}`}
                          />
                        </div>
                      )}

                      {currentAction === 'reject' && (
                        <div className="reject-alert-box">
                          <XCircle size={16} />
                          <span>This clause will be flagged as completely rejected. Standard contract negotiations will strip it.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Signature Area */}
            <div className="signature-panel glass-panel">
              <h3>Digital Signature Authorization</h3>
              <p>Type your full name below. This acts as a formal sign-off for the changes above.</p>
              <div className="signature-input-row">
                <input
                  type="text"
                  className="signature-field"
                  placeholder="Senior Partner Name (e.g. Harvey Specter)"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  disabled={isSubmitting}
                  id="input-signature-signoff"
                />
                <button
                  type="submit"
                  className="submit-signoff-btn"
                  disabled={isSubmitting || !signature.trim()}
                  id="btn-submit-signoff"
                >
                  {isSubmitting ? 'Authorizing...' : 'Submit Approval'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
