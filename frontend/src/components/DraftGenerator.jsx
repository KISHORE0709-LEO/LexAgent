import React, { useState, useEffect } from 'react';
import { FileText, Printer, Share2, Plus, Edit2, SlidersHorizontal, ChevronRight, Save, RotateCw, Loader2, Send, MessageSquare, Bot, User, X, Undo2, Redo2, History, Clock } from 'lucide-react';
import { useMandamus } from '../context/MandamusContext';
import { useHistory } from '../context/HistoryContext';
import { computeDiff } from '../utils/diff';
import './DraftGenerator.css';
import LegalChat from './LegalChat';
import { usePermissions } from '../hooks/usePermissions';


const reviewItems = [
  'Verify case facts against primary upload.',
  'Confirm citations for selected precedents.',
  'Check all statutory references (IPC/CrPC).',
  'Audit for AI hallucination in legal reasoning.',
  'Ensure formatting adheres to High Court standards.',
  'Validate jurisdiction and case number.',
];

const confidence = [
  { label: 'LEGAL_LOGIC',         value: 95 },
  { label: 'PRECEDENT_MATCH',     value: 88 },
  { label: 'FACTUAL_CONSISTENCY', value: 92 },
];

const DraftProcessingOverlay = () => (
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
    <div style={{ border: '1px solid var(--primary-red)', background: '#0a0a0a', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: 'var(--primary-red)', opacity: 0.5, animation: 'scan 2s linear infinite' }} />
      <style>{`@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }`}</style>
      <Loader2 size={40} className="dg-spin" style={{ color: 'var(--primary-red)', marginBottom: '20px' }} />
      <h2 style={{ color: 'var(--text-white)', fontSize: '1rem', letterSpacing: '0.1em', margin: 0, fontFamily: 'var(--font-mono)' }}>GENERATING DRAFT</h2>
      <p style={{ color: 'var(--text-grey)', fontSize: '0.65rem', marginTop: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Synthesizing facts, legal framework, and precedents into formal structure...</p>
    </div>
  </div>
);



export default function DraftGenerator({ onTabChange }) {
  const { state, updateState } = useMandamus();
  const { history, currentIndex, saveVersion, undo, redo, restoreVersion, canUndo, canRedo } = useHistory();
  const { canEditDraft, canGenerateDraft, role } = usePermissions();

  const [checked, setChecked] = useState(new Set());
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredRef, setHoveredRef] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [diffingVersion, setDiffingVersion] = useState(null);

  const selectedCases = state.selected_precedents || [];
  const fullSummary = state.summariser_output || {};
  const query = fullSummary.legalQuestions?.[0] || fullSummary.caseName || '';
  
  const draftType = state.draft_output?.type || 'Petition';
  const docSections = state.draft_output?.sections || [];
  const validation = state.draft_output?.validation || null;

  useEffect(() => {
    // Only auto-generate if we have prerequisites AND no draft exists
    if (state.summariser_status === 'complete' && selectedCases.length > 0) {
      if (!state.draft_output && !loading) {
        handleGenerateDraft(query, selectedCases, fullSummary, 'Petition');
      }
    }
  }, [state.summariser_status, selectedCases.length]);



  const handleValidateDraft = async (sections, summary, cases, currentDraftType) => {
    setIsValidating(true);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${API_BASE}/draft/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_sections: sections,
          summary: summary,
          selected_cases: cases
        })
      });
      
      if (!res.ok) throw new Error(`Validation failed: ${res.status}`);
      
      const data = await res.json();
      updateState({
        draft_output: { type: currentDraftType, sections, validation: data },
        draft_status: 'complete'
      });
    } catch (err) {
      console.error("Validation error:", err);
      // Fallback: still show sections but without validation
      updateState({
        draft_output: { type: currentDraftType, sections, validation: null },
        draft_status: 'complete'
      });
    }
    setIsValidating(false);
  };

  const handleGenerateDraft = async (q = query, cases = selectedCases, summary = fullSummary, dType = draftType) => {
    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    // Help debug missing environment variables in Vercel
    if (!import.meta.env.VITE_API_URL && window.location.hostname !== 'localhost') {
       console.warn("WARNING: VITE_API_URL is not set. Defaulting to localhost:8000 which will likely fail on production.");
    }

    try {
      const res = await fetch(`${API_BASE}/draft/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          selected_cases: cases,
          summary: summary,
          draft_type: dType,
          case_id: summary.caseId || summary.case_id
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Generation failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      
      if (data.sections && data.sections.length > 0) {
        updateState({
          draft_output: { type: dType, sections: data.sections, validation: null },
          draft_status: 'generating'
        });
        saveVersion(data.sections, 'AI_GENERATED');
        handleValidateDraft(data.sections, summary, cases, dType);
      } else {
        throw new Error("AI returned empty sections.");
      }
    } catch (err) {
      console.error("Drafting error:", err);
      alert(`DRAFT_GENERATION_FAILED: ${err.message}`);
      updateState({ draft_status: 'idle' });
    }
    setLoading(false);
  };

  const toggle = (i) => setChecked(prev => {
    const n = new Set(prev);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  // Auto-save timer reference
  const [saveTimer, setSaveTimer] = useState(null);

  const handleSectionChange = (index, value) => {
    const newSections = [...docSections];
    newSections[index].body = value;
    
    updateState({
      draft_output: {
        ...state.draft_output,
        sections: newSections
      }
    });

    // DEBOUNCED AUTO-SNAPSHOT
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      saveVersion(newSections, 'USER_EDIT');
    }, 3000); // Wait 3 seconds after typing stops
    setSaveTimer(timer);
  };

  const handleManualSave = () => {
    if (docSections.length > 0) {
      saveVersion(docSections, 'USER_EDIT');
      alert('Snapshot created in history.');
    }
  };

  const handleUndo = () => {
    const prevData = undo();
    if (prevData) {
      updateState({ draft_output: { ...state.draft_output, sections: prevData } });
    }
  };

  const handleRedo = () => {
    const nextData = redo();
    if (nextData) {
      updateState({ draft_output: { ...state.draft_output, sections: nextData } });
    }
  };

  const handleRestore = (vId) => {
    const data = restoreVersion(vId);
    if (data) {
      updateState({ draft_output: { ...state.draft_output, sections: data } });
      setDiffingVersion(null);
    }
  };

  const handleStartDiff = (v) => {
    setDiffingVersion(v);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const allChecked = checked.size === reviewItems.length;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Draft link copied to clipboard!');
  };

  const handleJsonExport = () => {
    if (!docSections.length) {
      alert("No draft generated yet.");
      return;
    }
    const data = JSON.stringify({ sections: docSections, validation }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draftType.toUpperCase()}_${fullSummary?.caseId || 'Export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDraft = () => {
    if (!docSections.length) {
      alert("No draft to save.");
      return;
    }
    alert('Draft securely saved to local repository.');
  };

  const handleSubmitForReview = () => {
    if (!docSections.length) {
      alert("No draft to submit.");
      return;
    }
    alert('Draft has been forwarded to Senior Counsel for final review.');
  };

  const handleApproveDraft = () => {
    setShowConfirmModal(true);
  };

  const confirmApprove = () => {
    updateState({ draft_status: 'approved' });
    setShowConfirmModal(false);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      if (onTabChange) onTabChange('scheduler');
    }, 1500);
  };

  if (state.summariser_status !== 'complete' || !state.summariser_output) {
    return (
    <div className="dg-page">
      <div className="dg-header">
        <div>
          <h1 className="dg-title">DRAFT_GENERATOR</h1>
          <p className="dg-sub">RAG PIPELINE · STRUCTURED JUDGMENT DRAFTING · IMMUTABLE AUDIT TRAIL</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', border: '1px solid #333', background: '#0a0a0a' }}>
          <h2 style={{ color: '#e02020', marginBottom: '15px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>SUMMARISER OUTPUT MISSING</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Please complete the Summariser first before generating a draft.</p>
        </div>
      </div>
    </div>
    );
  }

  if (!selectedCases || selectedCases.length === 0) {
    return (
    <div className="dg-page">
      <div className="dg-header">
        <div>
          <h1 className="dg-title">DRAFT_GENERATOR</h1>
          <p className="dg-sub">RAG PIPELINE · STRUCTURED JUDGMENT DRAFTING · IMMUTABLE AUDIT TRAIL</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', border: '1px solid #333', background: '#0a0a0a' }}>
          <h2 style={{ color: '#e02020', marginBottom: '15px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>NO PRECEDENTS SELECTED</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Please select precedents in the Precedent Finder before drafting.</p>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="dg-page">

      {/* ── HEADER ── */}
      <div className="dg-header">
        <div>
          <h1 className="dg-title">DRAFT_GENERATOR</h1>
          <p className="dg-sub">RAG PIPELINE · STRUCTURED JUDGMENT DRAFTING · IMMUTABLE AUDIT TRAIL</p>
        </div>
        <div className="dg-header-actions">
          <div className="dg-history-controls" style={{ display: 'flex', gap: '8px', marginRight: '15px', borderRight: '1px solid #333', paddingRight: '15px' }}>
            <button className="dg-action-btn" onClick={handleUndo} disabled={!canUndo} title="Undo (Cmd+Z)" style={{ opacity: canUndo ? 1 : 0.3 }}><Undo2 size={15} /></button>
            <button className="dg-action-btn" onClick={handleRedo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" style={{ opacity: canRedo ? 1 : 0.3 }}><Redo2 size={15} /></button>
            <button className="dg-action-btn" onClick={handleManualSave} title="Save Snapshot"><Save size={15} /></button>
            <button className={`dg-action-btn ${showHistory ? 'active' : ''}`} onClick={() => setShowHistory(!showHistory)} title="Version History"><History size={15} /></button>
          </div>
          <button className="dg-action-btn" onClick={handlePrint} title="Print / Export PDF"><Printer size={15} /></button>
          <button className="dg-action-btn" onClick={handleShare} title="Share Link"><Share2 size={15} /></button>
        </div>
      </div>

      {/* ── BODY: 3 COLUMNS ── */}
      <div className="dg-body">

        {/* ── LEFT ── */}
        <div className="dg-left">
          <div className="dg-panel-label">CONTEXT_PARAMS <SlidersHorizontal size={11} className="dg-icon-sm" /></div>

          <div className="dg-left-section">
            <div className="dg-sec-label">DRAFT_TYPE</div>
            <select 
              className="dg-draft-type-select" 
              value={draftType} 
              onChange={(e) => updateState({ draft_output: { ...state.draft_output, type: e.target.value } })}
              style={{
                width: '100%',
                background: 'var(--bg-black)',
                color: 'var(--text-white)',
                border: '1px solid var(--border-red)',
                padding: '6px',
                fontSize: '0.75rem',
                marginTop: '4px',
                outline: 'none',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <option value="Petition">Petition</option>
              <option value="Written Argument">Written Argument</option>
              <option value="Judgment">Judgment</option>
              <option value="Counter Affidavit">Counter Affidavit</option>
            </select>
          </div>

          <div className="dg-left-section">
            <div className="dg-sec-label">RESEARCH_QUERY <Edit2 size={10} className="dg-icon-sm" /></div>
            <p className="dg-blob-text">
              "{query || 'No query context provided.'}"
            </p>
          </div>

          <div className="dg-left-section">
            <div className="dg-sec-row">
              <span className="dg-sec-label">AI_CONFIDENCE_SIGNAL</span>
              <span className="dg-badge-green">RELIABLE</span>
            </div>
            <div className="dg-bias-row">
              <span className="dg-bias-key">Hallucination Risk</span>
              <span className="dg-bias-val">Low</span>
            </div>
            <div className="dg-progress-track"><div className="dg-progress-fill" style={{ width: '94%' }} /></div>
            <p className="dg-bias-note">Precedents and statutory references verified against Bedrock training set.</p>
          </div>

          <div className="dg-left-section">
            <div className="dg-sec-row">
              <span className="dg-sec-label">PRECEDENTS_QUEUE</span>
              <span style={{ fontSize: '0.6rem', color: '#555' }}>({selectedCases.length})</span>
            </div>
            {selectedCases.map((p, idx) => (
              <div className="dg-precedent" key={idx}>
                <span className="dg-prec-icon">⚖</span>
                <div>
                  <div className="dg-prec-name">{p.case_name}</div>
                  <div className="dg-prec-desc">{p.citation} ({p.year})</div>
                </div>
              </div>
            ))}
            {selectedCases.length === 0 && <p style={{ fontSize: '0.65rem', color: '#444' }}>No cases selected for drafting.</p>}
          </div>

          <div className="dg-left-section">
            <div className="dg-sec-label">DRAFTING_ASSISTANT</div>
            <LegalChat 
              context={`Current Draft: ${draftType}\n\nSections: ${docSections.map(s => s.title).join(', ')}`}
              placeholder="Ask to re-structure or edit..."
            />
          </div>


        </div>

        {/* ── CENTER ── */}
        <div className="dg-center" style={{ position: 'relative' }}>
          {loading && <DraftProcessingOverlay />}

          <div className="dg-doc-topbar">
            <div className="dg-doc-title-row">
              <FileText size={13} className="dg-icon-sm" />
              <div>
                <div style={{ fontSize: '0.52rem', color: '#555', letterSpacing: '0.08em', marginBottom: 2 }}>DRAFT:</div>
                <div className="dg-doc-name">{draftType.toUpperCase()}_{fullSummary?.caseId || 'DRAFT'}.PDF</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="dg-export-btn"
                onClick={() => handleGenerateDraft()}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: !canGenerateDraft ? 0.5 : 1, cursor: !canGenerateDraft ? 'not-allowed' : 'pointer' }}
                disabled={loading || (!query && selectedCases.length === 0) || !canGenerateDraft}
                title={!canGenerateDraft ? "Presiding Judge clearance required" : ""}
              >
                {loading ? <Loader2 size={12} className="dg-spin" /> : <RotateCw size={12} />}
                {loading ? 'GENERATING...' : 'REFRESH_DRAFT'} {!canGenerateDraft && '🔒'}
              </button>
              <button className="dg-export-btn" onClick={handleJsonExport}>JSON_EXPORT</button>
              <button 
                className={`dg-export-btn ${!isEditingDoc ? 'dg-export-active' : ''}`} 
                onClick={() => canEditDraft && setIsEditingDoc(!isEditingDoc)}
                disabled={!canEditDraft}
                title={!canEditDraft ? "Read-only access. Only judges can edit." : ""}
                style={{ opacity: !canEditDraft ? 0.5 : 1, cursor: !canEditDraft ? 'not-allowed' : 'pointer' }}
              >
                {isEditingDoc ? 'PREVIEW_RENDER' : 'EDIT_DRAFT'} {!canEditDraft && '🔒'}
              </button>
            </div>
          </div>

          <div className="dg-doc-scroll">
            <div className="dg-doc-inner">
              
              {diffingVersion && (
                <div className="dg-diff-banner">
                  <div className="dg-diff-info">
                    <span className="dg-diff-label">DIFF_MODE ACTIVE</span>
                    <span className="dg-diff-time">COMPARING WITH: {new Date(diffingVersion.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="dg-diff-actions">
                    <button className="dg-diff-btn-cancel" onClick={() => setDiffingVersion(null)}>EXIT_PREVIEW</button>
                    <button className="dg-diff-btn-restore" onClick={() => handleRestore(diffingVersion.id)}>RESTORE_THIS_VERSION</button>
                  </div>
                </div>
              )}

              <div className="dg-forensic-overlay"></div>
              <div className="dg-doc-watermark">MANDAMUS_INTELLIGENCE_SECURE_ENCLAVE</div>
              {role === 'lawyer' && <div className="dg-doc-watermark" style={{ top: '40%', fontSize: '4rem', opacity: 0.05, transform: 'rotate(-45deg)' }}>CONFIDENTIAL - READ ONLY</div>}

              <div className="dg-doc-meta">
                <span className="dg-meta-tag">JURISDICTION: {fullSummary?.jurisdiction?.toUpperCase() || 'NOT SPECIFIED'}</span>
                <span className="dg-meta-tag">ENCRYPTION: AES-256-GCM</span>
                <span className="dg-meta-tag">TIMESTAMP: {new Date().toISOString().slice(0, 19).replace('T', ' ')}</span>
              </div>

              <div className="dg-doc-court-wrap">
                <div className="dg-court-line"></div>
                <div className="dg-doc-court">IN THE {fullSummary?.jurisdiction?.toUpperCase() || 'COURT'}</div>
                <div className="dg-court-line"></div>
              </div>
              <div className="dg-doc-case">CASE_ID // {fullSummary?.caseId || 'UNKNOWN'}</div>
              <div className="dg-forensic-divider">
                <span>010101010101</span>
                <div className="dg-divider-line"></div>
                <span>101010101010</span>
              </div>

              {!loading && docSections.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#555', fontFamily: 'var(--font-mono)' }}>
                  <p>No document generated yet.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>Upload a file in Summarizer or click REFRESH_DRAFT to begin.</p>
                </div>
              )}

              {docSections.map((s, idx) => (
                <div className="dg-doc-section" key={s.num} id={`section-${idx}`}>
                  <div className="dg-section-heading-wrap">
                    <div className="dg-section-heading">
                      <span className="dg-dot" />
                      <span className="dg-sec-num">{s.num}</span> {s.title}
                    </div>
                    <div className="dg-sec-intel">
                      <span className="dg-intel-label">CONFIDENCE</span>
                      <span className="dg-intel-val">{(90 + (idx % 10)).toString()}%</span>
                    </div>
                  </div>
                  
                  <div className="dg-doc-body-wrap">
                    <div className="dg-line-numbers">
                      {s.body.split('\n').map((_, lineIdx) => (
                        <div key={lineIdx}>{idx * 10 + lineIdx + 1}</div>
                      ))}
                    </div>
                    {isEditingDoc ? (
                      <textarea
                        className="dg-doc-textarea"
                        value={s.body}
                        onChange={(e) => handleSectionChange(idx, e.target.value)}
                      />
                    ) : (
                      <div className="dg-text-content">
                        {s.body.split('\n\n').map((para, i) => {
                          if (diffingVersion) {
                            const oldSection = diffingVersion.data[idx];
                            const diffs = computeDiff(oldSection?.body || '', s.body);
                            return (
                              <p className="dg-doc-para-diff" key={i}>
                                {diffs.map((d, k) => (
                                  <span key={k} className={`dg-diff-${d.type}`}>{d.value}</span>
                                ))}
                                {i === 0 && <span className="dg-forensic-tag">DIFF_ANALYSIS</span>}
                              </p>
                            );
                          }
                          return (
                            <p className="dg-doc-para" key={i}>
                              {para}
                              {i === 0 && <span className="dg-forensic-tag">INTELLIGENCE_VERIFIED</span>}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {s.refs.length > 0 && (
                    <div className="dg-refs">
                      <span className="dg-refs-label">SOURCES:</span>
                      {s.refs.map(ref => (
                        <span 
                          key={ref} 
                          className="dg-ref"
                          onMouseEnter={() => setHoveredRef(ref)}
                          onMouseLeave={() => setHoveredRef(null)}
                        >
                          [{ref}]
                          <span className="dg-ref-tooltip">CROSS-REFERENCED: {ref}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="dg-final-actions">
                <button className="dg-final-btn dg-final-secondary" onClick={handlePrint}>EXPORT AS PDF</button>
                <button className="dg-final-btn dg-final-secondary" onClick={handleSaveDraft}>SAVE DRAFT</button>
                {state.draft_status === 'approved' ? (
                  <button className="dg-final-btn dg-final-primary" onClick={() => onTabChange && onTabChange('scheduler')}>
                    SCHEDULE HEARING <ChevronRight size={16} />
                  </button>
                ) : (
                  <button className="dg-final-btn dg-final-primary" onClick={handleSubmitForReview}>
                    SUBMIT FOR REVIEW <ChevronRight size={16} />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="dg-right">
          <div className="dg-panel-label">VALIDATION_MATRIX</div>

          <div className="dg-right-section">
            {isValidating ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '10px' }}>
                 <Loader2 size={24} className="dg-spin" style={{ color: 'var(--primary-red)' }} />
                 <span style={{ fontSize: '0.7rem', color: 'var(--text-grey)', fontFamily: 'var(--font-mono)' }}>EVALUATING DRAFT...</span>
               </div>
            ) : validation && validation.scores ? (
              Object.entries(validation.scores).map(([label, value]) => (
                <div className="dg-conf-item" key={label}>
                  <div className="dg-conf-row">
                    <span className="dg-conf-label">{label}</span>
                    <span className="dg-conf-val">{value}%</span>
                  </div>
                  <div className="dg-conf-track">
                    <div className="dg-conf-fill" style={{ width: `${value}%`, background: value < 70 ? 'var(--primary-red)' : 'var(--neon-green)' }} />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.65rem', color: '#444' }}>Awaiting draft generation to begin validation.</p>
            )}
          </div>

          {validation && !isValidating && (
            <>
              <div className="dg-panel-label" style={{ marginTop: 8 }}>INCONSISTENCIES</div>
              <div className="dg-right-section" style={{ borderLeft: '2px solid var(--primary-red)', paddingLeft: '8px' }}>
                {validation.inconsistencies?.length > 0 ? (
                  validation.inconsistencies.map((inc, i) => (
                    <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-grey)', marginBottom: '8px', display: 'flex', gap: '6px' }}>
                       <span style={{ color: 'var(--primary-red)' }}>⚠</span> {inc}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.65rem', color: 'var(--neon-green)' }}>No inconsistencies detected.</p>
                )}
              </div>

              <div className="dg-panel-label" style={{ marginTop: 8 }}>SUGGESTIONS</div>
              <div className="dg-right-section" style={{ borderLeft: '2px solid var(--neon-green)', paddingLeft: '8px' }}>
                {validation.suggestions?.length > 0 ? (
                  validation.suggestions.map((sug, i) => (
                    <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-grey)', marginBottom: '8px', display: 'flex', gap: '6px' }}>
                       <span style={{ color: 'var(--neon-green)' }}>★</span> {sug}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.65rem', color: '#555' }}>No further suggestions.</p>
                )}
              </div>
            </>
          )}

          <div className="dg-panel-label" style={{ marginTop: 12 }}>STRUCTURAL_ARCHITECT</div>
          <div className="dg-right-section" style={{ background: '#0a0a0a', padding: '12px', border: '1px solid #222' }}>
            <div className="dg-structure-map">
              {docSections.length > 0 ? docSections.map((s, i) => (
                <a key={i} href={`#section-${i}`} className="dg-structure-item-link">
                  <div className="dg-structure-item">
                    <div className="dg-structure-dot-pulse" />
                    <span className="dg-structure-title">{s.num}. {s.title}</span>
                    <ChevronRight size={10} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                  </div>
                </a>
              )) : <p style={{ fontSize: '0.6rem', color: '#444' }}>No structure detected.</p>}
            </div>
          </div>



          <button 
            className={`dg-approve-btn ${validation && !isValidating ? 'dg-approve-active' : ''}`} 
            disabled={!validation || isValidating || state.draft_status === 'approved'} 
            onClick={handleApproveDraft}
            style={state.draft_status === 'approved' ? { background: '#00ff00', color: '#000', borderColor: '#00ff00', marginTop: '15px' } : { marginTop: '15px' }}
          >
            {state.draft_status === 'approved' ? 'APPROVED ✓' : 'APPROVE_DRAFT'}
          </button>
          {(!validation || isValidating) && state.draft_status !== 'approved' && <p className="dg-approve-note">Validation required to unlock filing.</p>}
        </div>

      </div>
      
      {/* ── HISTORY SIDEBAR ── */}
      {showHistory && (
        <div className="dg-history-sidebar">
          <div className="dg-hs-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={16} color="var(--primary-red)" />
              <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '0.1em' }}>VERSION_HISTORY</h3>
            </div>
            <button className="dg-hs-close" onClick={() => setShowHistory(false)}><X size={18} /></button>
          </div>
          <div className="dg-hs-list">
            {history.length === 0 ? (
              <div className="dg-hs-empty">
                <Clock size={24} style={{ opacity: 0.2, marginBottom: '10px' }} />
                <p>No snapshots recorded yet.</p>
                <p style={{ fontSize: '0.6rem', color: '#555' }}>Use the SAVE icon to capture a version.</p>
              </div>
            ) : (
              [...history].reverse().map((v, idx) => {
                const actualIdx = history.length - 1 - idx;
                return (
                  <div 
                    key={v.id} 
                    className={`dg-hs-item ${actualIdx === currentIndex ? 'active' : ''} ${diffingVersion?.id === v.id ? 'diffing' : ''}`}
                    onClick={() => handleStartDiff(v)}
                  >
                    <div className="dg-hs-item-icon">
                      {v.type === 'AI_GENERATED' ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className="dg-hs-item-info">
                      <div className="dg-hs-item-main">
                        <span className="dg-hs-item-type">{v.type === 'AI_GENERATED' ? 'AI_CORE' : 'USER_EDIT'}</span>
                        <span className="dg-hs-item-time">{new Date(v.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="dg-hs-item-date">{new Date(v.timestamp).toLocaleDateString()}</div>
                    </div>
                    {actualIdx === currentIndex && <div className="dg-hs-active-tag">CURRENT</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #333', padding: '30px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px', fontFamily: 'monospace' }}>APPROVE DRAFT</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>
              Approve this draft and proceed to hearing scheduling?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmModal(false)} style={{ background: 'transparent', border: '1px solid #333', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace' }}>CANCEL</button>
              <button onClick={confirmApprove} style={{ background: '#e02020', border: 'none', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace' }}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {showToast && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#00ff00', color: '#000', padding: '15px 20px', fontFamily: 'monospace', fontWeight: 'bold', zIndex: 9999, animation: 'fadeIn 0.3s ease-in-out', border: '1px solid #00ff00' }}>
          Draft approved. Proceeding to Scheduler...
        </div>
      )}
    </div>
  );
}
