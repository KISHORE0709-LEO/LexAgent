import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, MessageSquare, Settings, LogOut, Paperclip, Send,
  BrainCircuit, X, FileText, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight, Mic, MicOff, Link, MoreHorizontal,
  Folder, Scale, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AgentDashboard.css';

const MOCK_HISTORY = {
  Today: [
    { id: 1, title: 'NDA Benchmarking (NY)', jurisdiction: 'New York' },
    { id: 2, title: 'Employment Contract Review', jurisdiction: 'California' },
  ],
  Yesterday: [
    { id: 3, title: 'SaaS MSA — Limitation Clause', jurisdiction: 'Delaware' },
  ],
  'Previous 7 Days': [
    { id: 4, title: 'IP Assignment Agreement', jurisdiction: 'New York' },
    { id: 5, title: 'Vendor Service Agreement', jurisdiction: 'California' },
  ],
};

const MOCK_PROJECTS = [
  { id: 'p1', name: 'Acme Corp Deals' },
  { id: 'p2', name: 'Q3 NDAs' },
];

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [chatTitle, setChatTitle] = useState('');
  const [detectedJurisdiction, setDetectedJurisdiction] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, processingStatus]);

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); } catch (e) { console.error(e); }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputText('');
    setAttachedFile(null);
    setChatTitle('');
    setDetectedJurisdiction('');
    setActiveChat(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setAttachedFile(file);
    e.target.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: inputText,
      file: attachedFile ? attachedFile.name : null,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    const fileToSend = attachedFile;
    setAttachedFile(null);
    setIsProcessing(true);
    setProcessingStatus('Initializing...');

    if (fileToSend && !chatTitle) {
      const name = fileToSend.name.replace(/\.[^/.]+$/, '');
      setChatTitle(name);
    }

    if (!fileToSend) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: 'agent', type: 'text',
          text: 'I am optimized to analyze legal documents. Please attach a PDF or DOCX contract using the paperclip icon for a full jurisdiction-aware risk analysis.',
        }]);
        setIsProcessing(false);
        setProcessingStatus('');
      }, 800);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('files', fileToSend);
      if (user?.uid) formData.append('user_id', user.uid);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/summarise`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) throw new Error('Failed to connect to Legal Agent API');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.processing_status === 'failed') throw new Error(data.error);

              if (data.processing_status === 'document_summary') {
                setProcessingStatus('Analyzing clauses...');
                if (data.court_name) setDetectedJurisdiction(data.court_name);
                
                // Add the initial analysis card to messages list
                setMessages(prev => {
                  // Check if card is already added to avoid duplication
                  if (prev.some(msg => msg.id === 'current-analysis-card')) {
                    return prev;
                  }
                  const cardMsg = {
                    id: 'current-analysis-card',
                    role: 'agent',
                    type: 'analysis_card',
                    data: {
                      ...data,
                      ipc_sections: [],
                      executive_summary: null
                    }
                  };
                  return [...prev, cardMsg];
                });
              } 
              else if (data.processing_status === 'clause_analyzed') {
                setMessages(prev => {
                  return prev.map(msg => {
                    if (msg.id === 'current-analysis-card') {
                      const updatedClauses = [...(msg.data.ipc_sections || [])];
                      if (!updatedClauses.some(c => c.id === data.clause.id)) {
                        updatedClauses.push(data.clause);
                      }
                      return {
                        ...msg,
                        data: {
                          ...msg.data,
                          ipc_sections: updatedClauses
                        }
                      };
                    }
                    return msg;
                  });
                });
              }
              else if (data.processing_status === 'complete') {
                setProcessingStatus('');
                if (data.court_name) setDetectedJurisdiction(data.court_name);
                setMessages(prev => {
                  return prev.map(msg => {
                    if (msg.id === 'current-analysis-card') {
                      return {
                        ...msg,
                        id: Date.now() + 2, // change ID to make it static
                        data: {
                          ...msg.data,
                          ...data,
                          ipc_sections: data.ipc_sections || msg.data.ipc_sections
                        }
                      };
                    }
                    return msg;
                  });
                });
              } 
              else {
                const labels = {
                  uploading: 'Uploading document...',
                  extracting: 'Extracting text...',
                  resolving_jurisdiction: 'Resolving jurisdiction...',
                  summarising: 'Creating summary & facts...',
                  analyzing_clauses: 'Analyzing clauses concurrently...',
                };
                setProcessingStatus(labels[data.processing_status] || data.processing_status);
              }
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) throw e;
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setProcessingStatus('');
      setMessages(prev => [...prev, {
        id: Date.now() + 3, role: 'agent', type: 'text',
        text: `Error analyzing document: ${err.message}`,
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMessage = (msg) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="msg-row msg-row--user">
          <div className="msg-bubble msg-bubble--user">
            {msg.text && <p>{msg.text}</p>}
            {msg.file && (
              <div className="file-badge">
                <FileText size={13} />
                <span>{msg.file}</span>
              </div>
            )}
          </div>
          <div className="msg-avatar msg-avatar--user">
            {user?.photoURL
              ? <img src={user.photoURL} alt="user" />
              : <User size={16} />}
          </div>
        </div>
      );
    }

    if (msg.type === 'text') {
      return (
        <div key={msg.id} className="msg-row msg-row--agent">
          <div className="msg-avatar msg-avatar--agent"><Scale size={16} /></div>
          <div className="msg-bubble msg-bubble--agent"><p>{msg.text}</p></div>
        </div>
      );
    }

    if (msg.type === 'analysis_card') {
      const { data } = msg;
      return (
        <div key={msg.id} className="msg-row msg-row--agent">
          <div className="msg-avatar msg-avatar--agent"><Scale size={16} /></div>
          <div className="msg-bubble msg-bubble--agent analysis-bubble" style={{ width: '100%' }}>
            <p className="analysis-intro">
              Analysis complete — processed through Jurisdiction-Aware Retrieval and Enkrypt AI Safety Pipeline.
            </p>

            {/* Document Header & Facts */}
            <div className="analysis-card">
              <div className="analysis-card__header">
                <BrainCircuit size={15} />
                <span>Case Breakdown — {data.case_id}</span>
              </div>
              <div className="analysis-card__body">
                <div className="meta-row">
                  <span className="meta-label">Jurisdiction</span>
                  <span className="jurisdiction-pill">{data.court_name}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Parties</span>
                  <span>{data.petitioner} vs. {data.respondent}</span>
                </div>
                <p className="summary-text">{data.plain_summary}</p>
                {data.key_facts?.length > 0 && (
                  <div className="facts-section">
                    <span className="facts-label">Key Facts</span>
                    <ul>{data.key_facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>

            {/* Compliance Ring & Executive Summary */}
            <div className="analysis-card">
              <div className="compliance-header">
                <div className="compliance-info">
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Compliance Dashboard</span>
                  <div className="compliance-badge-group">
                    <span className="compliance-pill compliance-pill--high">
                      High: {data.executive_summary?.high_risk_count ?? 0}
                    </span>
                    <span className="compliance-pill compliance-pill--medium">
                      Medium: {data.executive_summary?.medium_risk_count ?? 0}
                    </span>
                    <span className="compliance-pill compliance-pill--low">
                      Low: {data.executive_summary?.low_risk_count ?? 0}
                    </span>
                  </div>
                </div>
                <div className="compliance-meter">
                  <div className="compliance-circle">
                    <span className="compliance-circle-score" style={{ 
                      color: (data.executive_summary?.overall_compliance_score ?? 100) >= 80 ? '#10b981' : 
                             (data.executive_summary?.overall_compliance_score ?? 100) >= 60 ? '#fbbf24' : '#ff4d4d' 
                    }}>
                      {data.executive_summary?.overall_compliance_score ?? '--'}%
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#72728c', fontWeight: '600', marginTop: '2px' }}>Compliance Score</span>
                </div>
              </div>

              {data.executive_summary ? (
                <div className="executive-summary-box">
                  <div className="exec-issues-section">
                    <span className="exec-section-label">Key Legal Issues Detected</span>
                    {data.executive_summary.key_legal_issues?.length > 0 ? (
                      <ul className="exec-list">
                        {data.executive_summary.key_legal_issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="summary-text" style={{ margin: '6px 0 0' }}>No material legal concerns detected.</p>
                    )}
                  </div>
                  <div className="exec-actions-section">
                    <span className="exec-section-label">Prioritized Action Items</span>
                    {data.executive_summary.prioritized_actions?.length > 0 ? (
                      <ul className="exec-list">
                        {data.executive_summary.prioritized_actions.map((action, idx) => (
                          <li key={idx} style={{ color: '#fbbf24' }}>{action}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="summary-text" style={{ margin: '6px 0 0' }}>No urgent actions required.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="executive-summary-box" style={{ textAlign: 'center', padding: '24px', color: '#555' }}>
                  <span>Analyzing clauses and calibrating compliance risk scores...</span>
                </div>
              )}
            </div>

            {/* Clause-by-Clause Assessment Cards */}
            {data.ipc_sections?.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span className="exec-section-label" style={{ fontSize: '13px', marginLeft: '4px' }}>Clause-by-Clause Assessment</span>
                
                {data.ipc_sections.map((clause, idx) => {
                  const risk = clause.riskLevel?.toLowerCase() || 'low';
                  const isBlocked = !clause.guardPassed;
                  
                  return (
                    <div key={idx} className={`structured-clause-card structured-clause-card--${risk}`}>
                      <div className="clause-card-header">
                        <div className="clause-card-title-group">
                          <span className={`clause-card-badge clause-card-badge--${risk}`}>
                            {risk.toUpperCase()} Risk
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                            Clause #{idx + 1}
                          </span>
                        </div>
                        <div className="clause-confidence">
                          Confidence: <span className="confidence-val">{clause.confidenceScore || 90}%</span>
                        </div>
                      </div>

                      {/* Original Clause */}
                      <div className="clause-content-section">
                        <span className="section-label-tag">Original Clause Text</span>
                        <div className="original-clause-display">
                          {clause.originalClause}
                        </div>
                      </div>

                      {/* Analysis Details (Reason & Impact) */}
                      <div className="clause-analysis-details">
                        <div className="analysis-subbox">
                          <span className="section-label-tag">Issue / Violation</span>
                          <div className={`analysis-subbox-content ${risk !== 'low' ? 'analysis-subbox-content--warn' : ''}`}>
                            {clause.reason || 'No material legal concerns detected.'}
                          </div>
                        </div>
                        <div className="analysis-subbox">
                          <span className="section-label-tag">Impact Analysis</span>
                          <div className={`analysis-subbox-content ${risk !== 'low' ? 'analysis-subbox-content--action' : ''}`}>
                            {clause.impact || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Precedents and Legal Reasoning */}
                      {(clause.groundingSources?.length > 0 || clause.reasoning) && (
                        <div className="clause-content-section">
                          <span className="section-label-tag">Applicable Law & Legal Reasoning</span>
                          <p className="summary-text" style={{ margin: '4px 0 10px', fontSize: '14px' }}>
                            {clause.reasoning || 'Standard terms compliant with governing rules.'}
                          </p>
                          {clause.groundingSources?.length > 0 && (
                            <div className="precedent-relevance-list">
                              <span className="section-label-tag" style={{ color: '#7b61ff', fontSize: '10px' }}>Grounded In Precedents</span>
                              {clause.groundingSources.map((source, sIdx) => (
                                <div key={sIdx} className="precedent-relevance-item">
                                  <span className="precedent-relevance-title">{source}</span>
                                  {clause.whyPrecedent?.[sIdx] && (
                                    <span className="precedent-relevance-why">Relevance: {clause.whyPrecedent[sIdx]}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Suggested Rewrite */}
                      {clause.revisedClause && (
                        <div className="clause-content-section" style={{ marginTop: '4px' }}>
                          <span className="section-label-tag" style={{ color: '#10b981' }}>Recommended Clause Rewrite</span>
                          <div className="rewritten-clause-box">
                            <div className="rewritten-clause-text">
                              {clause.revisedClause}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Safety Guards status */}
                      <div className="guard-status-row" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        borderTop: '1px solid rgba(255,255,255,0.04)', 
                        paddingTop: '12px', 
                        marginTop: '4px' 
                      }}>
                        {isBlocked ? (
                          <div className="guard-status guard-status--blocked" style={{ fontSize: '12px' }}>
                            <X size={14} /> Output Guard Blocked suggestion: {clause.guardReasons?.join(', ') || 'Security policy violation'}
                          </div>
                        ) : (
                          <div className="guard-status guard-status--passed" style={{ fontSize: '12px' }}>
                            <CheckCircle2 size={14} /> Passed Enkrypt Safety Pipeline
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="portal-link-container" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="portal-link-btn"
                onClick={() => navigate('/manual-review', { state: { analysisData: data } })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #7b61ff 0%, #6347f5 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(123, 97, 255, 0.25)',
                  transition: 'all 0.2s ease'
                }}
                id={`btn-open-review-portal-${data.case_id}`}
              >
                <Scale size={14} />
                <span>Open Manual Review Portal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className={`lex-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

      {/* ── SIDEBAR ── */}
      <aside className="lex-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-icon"><Scale size={18} /></div>
            <span className="brand-name">LexAgent</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)} title="Collapse sidebar">
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="sidebar-divider" />

        <button className="new-doc-btn" onClick={handleNewChat}>
          <Plus size={16} /> New Document Analysis
        </button>

        <div className="sidebar-scroll">
          {Object.entries(MOCK_HISTORY).map(([group, items]) => (
            <div key={group} className="history-group">
              <span className="history-group-label">{group}</span>
              {items.map(item => (
                <button
                  key={item.id}
                  className={`history-item ${activeChat === item.id ? 'history-item--active' : ''}`}
                  onClick={() => setActiveChat(item.id)}
                >
                  <FileText size={14} className="history-icon" />
                  <span className="history-title">{item.title}</span>
                </button>
              ))}
            </div>
          ))}

          <div className="projects-section">
            <span className="history-group-label">Projects</span>
            {MOCK_PROJECTS.map(p => (
              <button key={p.id} className="history-item" type="button">
                <Folder size={14} className="history-icon" />
                <span className="history-title">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="projects-section">
            <span className="history-group-label">System Control</span>
            <button 
              className="history-item" 
              onClick={() => navigate('/risk-analytics')}
              style={{ width: '100%', textAlign: 'left' }}
              id="sidebar-link-risk-analytics"
              type="button"
            >
              <BrainCircuit size={14} className="history-icon" style={{ color: '#7b61ff' }} />
              <span className="history-title" style={{ fontWeight: '500' }}>Risk & Overrides Tuning</span>
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{displayName}</span>
            <button className="user-menu-btn" onClick={() => setAccountMenuOpen(v => !v)}>
              <MoreHorizontal size={16} />
            </button>
          </div>
          {accountMenuOpen && (
            <div className="user-dropdown">
              <button className="dropdown-item"><Settings size={14} /> Settings</button>
              <button className="dropdown-item dropdown-item--danger" onClick={handleLogout}>
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="lex-main">

        {/* Top bar */}
        <header className="lex-topbar">
          {!sidebarOpen && (
            <button className="sidebar-toggle sidebar-toggle--open" onClick={() => setSidebarOpen(true)}>
              <ChevronRight size={18} />
            </button>
          )}
          <span className="topbar-title">{chatTitle || 'LexAgent'}</span>
          <div className="topbar-actions">
            {detectedJurisdiction && (
              <span className="jurisdiction-badge">{detectedJurisdiction}</span>
            )}
            <button className="share-btn" title="Share">
              <Link size={15} />
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* Chat area */}
        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon"><Scale size={48} /></div>
              <h1>How can I assist you today?</h1>
              <p>Upload a legal contract for jurisdiction-aware clause analysis and risk benchmarking powered by Qdrant and Enkrypt AI.</p>
              <div className="welcome-hints">
                <div className="hint-chip"><FileText size={14} /> Attach a PDF contract</div>
                <div className="hint-chip"><Scale size={14} /> Jurisdiction detection</div>
                <div className="hint-chip"><AlertTriangle size={14} /> Clause risk scoring</div>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map(renderMessage)}
              {isProcessing && (
                <div className="msg-row msg-row--agent">
                  <div className="msg-avatar msg-avatar--agent"><Scale size={16} /></div>
                  <div className="msg-bubble msg-bubble--agent">
                    <div className="thinking-indicator">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-label">{processingStatus}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="input-wrapper">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept=".pdf,.docx,.txt"
          />

          {attachedFile && (
            <div className="attached-pill">
              <FileText size={13} />
              <span>{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)}><X size={12} /></button>
            </div>
          )}

          <form className="input-bar" onSubmit={handleSubmit}>
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach document"
            >
              <Paperclip size={19} />
            </button>

            <input
              ref={inputRef}
              type="text"
              className="input-field"
              placeholder="Message LexAgent or attach a contract..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={isProcessing}
            />

            <button
              type="button"
              className={`input-icon-btn mic-btn ${isRecording ? 'mic-btn--active' : ''}`}
              onClick={() => setIsRecording(v => !v)}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? <MicOff size={19} /> : <Mic size={19} />}
              {isRecording && <span className="mic-pulse" />}
            </button>

            <button
              type="submit"
              className={`send-btn ${(inputText.trim() || attachedFile) && !isProcessing ? 'send-btn--active' : ''}`}
              disabled={(!inputText.trim() && !attachedFile) || isProcessing}
            >
              <Send size={17} />
            </button>
          </form>
          <p className="input-disclaimer">LexAgent can make mistakes. Verify important legal information.</p>
        </div>
      </main>
    </div>
  );
}
