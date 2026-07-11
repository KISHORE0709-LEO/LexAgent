import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, MessageSquare, Settings, LogOut, Paperclip, Send,
  BrainCircuit, X, FileText, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight, Mic, MicOff, Link, MoreHorizontal,
  Folder, Scale, User, Search, Pin, Archive, Trash2, Edit3,
  Copy, Download, FolderPlus, ExternalLink, PanelLeft, PanelLeftClose
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AgentDashboard.css';

const groupChatsByDate = (chats, searchQuery) => {
  const groups = {
    Pinned: [],
    Today: [],
    Yesterday: [],
    'Last 7 Days': [],
    'Last 30 Days': [],
    Older: []
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = todayStart - 6 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = todayStart - 29 * 24 * 60 * 60 * 1000;

  const filtered = chats.filter(c => {
    if (c.archived) return false;
    if (!searchQuery) return true;
    return c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (c.messages && c.messages.some(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())));
  });

  filtered.forEach(chat => {
    if (chat.pinned) {
      groups.Pinned.push(chat);
      return;
    }
    const t = chat.timestamp || Date.now();
    if (t >= todayStart) {
      groups.Today.push(chat);
    } else if (t >= yesterdayStart) {
      groups.Yesterday.push(chat);
    } else if (t >= sevenDaysAgo) {
      groups['Last 7 Days'].push(chat);
    } else if (t >= thirtyDaysAgo) {
      groups['Last 30 Days'].push(chat);
    } else {
      groups.Older.push(chat);
    }
  });

  return Object.fromEntries(Object.entries(groups).filter(([_, items]) => items.length > 0));
};

const renderTextWithLinks = (text) => {
  if (!text) return '';
  return text.split('\n').map((line, lineIdx) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      const [fullMatch, label, url] = match;
      const index = match.index;

      if (index > lastIndex) {
        parts.push(line.substring(lastIndex, index));
      }

      parts.push(
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="legal-source-link"
          style={{ color: '#ff4d4d', textDecoration: 'underline', fontWeight: '600' }}
        >
          {label}
        </a>
      );

      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    const processedParts = parts.map((part, partIdx) => {
      if (typeof part !== 'string') return part;

      const boldRegex = /\*\*([^*]+)\*\*/g;
      const boldParts = [];
      let bLastIndex = 0;
      let bMatch;

      while ((bMatch = boldRegex.exec(part)) !== null) {
        const [bFull, content] = bMatch;
        const bIndex = bMatch.index;

        if (bIndex > bLastIndex) {
          boldParts.push(part.substring(bLastIndex, bIndex));
        }

        boldParts.push(
          <strong key={bIndex} style={{ color: '#fff', fontWeight: '700' }}>
            {content}
          </strong>
        );

        bLastIndex = boldRegex.lastIndex;
      }

      if (bLastIndex < part.length) {
        boldParts.push(part.substring(bLastIndex));
      }

      return boldParts.length > 0 ? boldParts : part;
    });

    return (
      <span key={lineIdx} style={{ display: 'block', marginBottom: '8px' }}>
        {processedParts}
      </span>
    );
  });
};

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
  
  // Dynamic history and project states
  const [sessions, setSessions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState(null); // sessionId
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeContextMenu, setActiveContextMenu] = useState(null); // sessionId
  const [movingSessionId, setMovingSessionId] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [projectsCollapsed, setProjectsCollapsed] = useState({});
  const [qdrantStatus, setQdrantStatus] = useState("connecting");
  const [qdrantPoints, setQdrantPoints] = useState(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, processingStatus]);

  // Fetch conversation history and projects on mount or user change
  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const userId = user?.uid || 'default_user';
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setProjects(data.projects || []);
        setQdrantStatus(data.qdrantStatus || "connected");
        setQdrantPoints(data.qdrantPoints || 0);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      setQdrantStatus("disconnected");
    }
  };

  // Sync session state with the database
  const syncSession = async (sessionId, title, messagesList, pinned, archived, projectId) => {
    if (!sessionId) return;
    try {
      const userId = user?.uid || 'default_user';
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          title: title || 'New Chat',
          messages: messagesList || [],
          pinned: !!pinned,
          archived: !!archived,
          projectId: projectId || null
        })
      });
      if (response.ok) {
        fetchHistory(); // refresh sidebar list
      }
    } catch (err) {
      console.error("Error syncing session:", err);
    }
  };

  // Selects an existing chat from history
  const handleSelectChat = (session) => {
    setActiveChat(session.sessionId);
    setMessages(session.messages || []);
    setChatTitle(session.title || '');
    // Scan messages to find detected jurisdiction
    const analysisMsg = session.messages?.find(m => m.type === 'analysis_card');
    if (analysisMsg && analysisMsg.data?.court_name) {
      setDetectedJurisdiction(analysisMsg.data.court_name);
    } else {
      setDetectedJurisdiction('');
    }
  };

  // Pinned/Unpinned Chat
  const handleTogglePin = async (session) => {
    await syncSession(
      session.sessionId,
      session.title,
      session.messages,
      !session.pinned,
      session.archived,
      session.projectId
    );
    setActiveContextMenu(null);
  };

  // Archive/Unarchive Chat
  const handleToggleArchive = async (session) => {
    await syncSession(
      session.sessionId,
      session.title,
      session.messages,
      session.pinned,
      !session.archived,
      session.projectId
    );
    setActiveContextMenu(null);
  };

  // Move to Project
  const handleMoveToProject = async (session, projectId) => {
    await syncSession(
      session.sessionId,
      session.title,
      session.messages,
      session.pinned,
      session.archived,
      projectId
    );
    setMovingSessionId(null);
    setActiveContextMenu(null);
  };

  // Rename Session
  const handleRenameSession = async (sessionId, newTitle) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session || !newTitle.trim()) return;
    await syncSession(
      sessionId,
      newTitle.trim(),
      session.messages,
      session.pinned,
      session.archived,
      session.projectId
    );
    setEditingSessionId(null);
    setEditingTitle('');
    setActiveContextMenu(null);
  };

  // Duplicate Session
  const handleDuplicateSession = async (session) => {
    const newSessionId = "session-" + Date.now() + Math.floor(Math.random() * 1000);
    await syncSession(
      newSessionId,
      `Copy of ${session.title}`,
      session.messages || [],
      false,
      false,
      session.projectId
    );
    setActiveContextMenu(null);
  };

  // Delete Session
  const handleDeleteSession = async (sessionId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (activeChat === sessionId) {
          handleNewChat();
        }
        fetchHistory();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
    setActiveContextMenu(null);
  };

  // Export Session (JSON download)
  const handleExportSession = (session) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${session.title.replace(/\s+/g, '_')}_history.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setActiveContextMenu(null);
  };

  // Share Session (Copy link)
  const handleShareSession = (session) => {
    const shareUrl = `${window.location.origin}/dashboard?chatId=${session.sessionId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Conversation share link copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy share link:", err);
    });
    setActiveContextMenu(null);
  };

  // Create Project Workspace
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const projectId = "proj-" + Date.now();
    try {
      const userId = user?.uid || 'default_user';
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          name: newProjectName.trim()
        })
      });
      if (response.ok) {
        setNewProjectName('');
        setShowNewProjectModal(false);
        fetchHistory();
      }
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  // Delete Project Workspace
  const handleDeleteProject = async (projectId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Move any chats inside this project back to root (projectId: null)
        const chatsInProject = sessions.filter(s => s.projectId === projectId);
        for (const chat of chatsInProject) {
          await syncSession(chat.sessionId, chat.title, chat.messages, chat.pinned, chat.archived, null);
        }
        fetchHistory();
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

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

    // Generate or retrieve current session ID & Title
    const isNew = !activeChat;
    const currentChatId = activeChat || ("chat-" + Date.now() + Math.floor(Math.random() * 1000));
    const fileToSend = attachedFile;
    const currentTitle = chatTitle || (fileToSend ? fileToSend.name.replace(/\.[^/.]+$/, '') : (inputText.substring(0, 30) || 'New Chat'));

    if (isNew) {
      setActiveChat(currentChatId);
      setChatTitle(currentTitle);
    }

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: inputText,
      file: fileToSend ? fileToSend.name : null,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setAttachedFile(null);
    setIsProcessing(true);
    setProcessingStatus('Initializing...');

    // Optimistically update conversation history in the sidebar immediately (like ChatGPT)
    if (isNew) {
      const optSession = {
        type: "session",
        sessionId: currentChatId,
        userId: user?.uid || "default_user",
        title: currentTitle,
        messages: updatedMessages,
        pinned: false,
        archived: false,
        projectId: null,
        timestamp: Date.now()
      };
      setSessions(prev => [optSession, ...prev]);
    } else {
      setSessions(prev => prev.map(s => {
        if (s.sessionId === currentChatId) {
          return {
            ...s,
            messages: updatedMessages,
            timestamp: Date.now()
          };
        }
        return s;
      }));
    }

    // Immediately sync user prompt to DB
    await syncSession(currentChatId, currentTitle, updatedMessages, false, false, null);

    if (!fileToSend) {
      try {
        setProcessingStatus('Thinking...');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/api/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg.text })
          }
        );

        if (!response.ok) throw new Error('Failed to connect to Legal Q&A Agent');
        const data = await response.json();

        const finalMessages = [...updatedMessages, {
          id: Date.now() + 1,
          role: 'agent',
          type: 'text',
          text: data.response
        }];
        setMessages(finalMessages);
        setSessions(prev => prev.map(s => {
          if (s.sessionId === currentChatId) {
            return { ...s, messages: finalMessages };
          }
          return s;
        }));
        // Sync final Q&A response to DB
        await syncSession(currentChatId, currentTitle, finalMessages, false, false, null);
      } catch (err) {
        console.error("Chat error:", err);
        const finalMessages = [...updatedMessages, {
          id: Date.now() + 1,
          role: 'agent',
          type: 'text',
          text: `⚠️ Error: ${err.message || 'Failed to connect to Legal Q&A Agent'}`
        }];
        setMessages(finalMessages);
        setSessions(prev => prev.map(s => {
          if (s.sessionId === currentChatId) {
            return { ...s, messages: finalMessages };
          }
          return s;
        }));
        await syncSession(currentChatId, currentTitle, finalMessages, false, false, null);
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
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

                setMessages(prev => {
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
                  const finalMsgList = [...prev, cardMsg];
                  syncSession(currentChatId, currentTitle, finalMsgList, false, false, null);
                  return finalMsgList;
                });
              }
              else if (data.processing_status === 'clause_analyzed') {
                setMessages(prev => {
                  const finalMsgList = prev.map(msg => {
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
                  syncSession(currentChatId, currentTitle, finalMsgList, false, false, null);
                  return finalMsgList;
                });
              }
              else if (data.processing_status === 'complete') {
                setProcessingStatus('');
                if (data.court_name) setDetectedJurisdiction(data.court_name);
                setMessages(prev => {
                  const finalMsgList = prev.map(msg => {
                    if (msg.id === 'current-analysis-card') {
                      return {
                        ...msg,
                        id: Date.now() + 2,
                        data: {
                          ...msg.data,
                          ...data,
                          ipc_sections: data.ipc_sections || msg.data.ipc_sections
                        }
                      };
                    }
                    return msg;
                  });
                  syncSession(currentChatId, currentTitle, finalMsgList, false, false, null);
                  return finalMsgList;
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
      setMessages(prev => {
        const finalMsgList = [...prev, {
          id: Date.now() + 3, role: 'agent', type: 'text',
          text: `Error analyzing document: ${err.message}`,
        }];
        syncSession(currentChatId, currentTitle, finalMsgList, false, false, null);
        return finalMsgList;
      });
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
          <div className="msg-bubble msg-bubble--agent"><p>{renderTextWithLinks(msg.text)}</p></div>
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
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)} title="Collapse sidebar" style={{ color: '#aaa' }}>
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div className="sidebar-divider" />

        <button className="new-doc-btn" onClick={handleNewChat}>
          <Plus size={16} /> New Analysis / Chat
        </button>

        {/* Search Conversation Bar */}
        <div className="sidebar-search-container">
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: '#666' }} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              className="sidebar-search-input"
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                style={{ position: 'absolute', right: '10px', top: '9px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '10px' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="sidebar-scroll">
          {/* Projects Section */}
          <div className="projects-section" style={{ marginBottom: '20px' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', marginBottom: '8px' }}>
              <span className="history-group-label" style={{ margin: 0 }}>Projects / Workspaces</span>
              <button 
                onClick={() => setShowNewProjectModal(true)} 
                title="Create New Project"
                style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <FolderPlus size={14} />
              </button>
            </div>
            
            {projects.map(proj => {
              const chatsInProj = sessions.filter(s => s.projectId === proj.projectId);
              const isCollapsed = !!projectsCollapsed[proj.projectId];
              return (
                <div key={proj.projectId} className="project-group">
                  <div className="project-header" onClick={() => setProjectsCollapsed(prev => ({ ...prev, [proj.projectId]: !prev[proj.projectId] }))}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Folder size={13} style={{ color: '#d62828', transform: isCollapsed ? 'none' : 'rotate(10deg)', transition: 'transform 0.2s' }} />
                      <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#eee' }}>{proj.name}</span>
                      <span style={{ fontSize: '10px', color: '#666' }}>({chatsInProj.length})</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.projectId); }} 
                      title="Delete Project Workspace"
                      style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '11px' }}
                    >
                      ✕
                    </button>
                  </div>
                  {!isCollapsed && chatsInProj.map(chat => (
                    <div 
                      key={chat.sessionId} 
                      className={`history-item ${activeChat === chat.sessionId ? 'history-item--active' : ''}`}
                      style={{ paddingLeft: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <button 
                        onClick={() => handleSelectChat(chat)} 
                        className="history-item-btn"
                      >
                        <MessageSquare size={12} />
                        <span className="history-title" style={{ fontSize: '12px' }}>{chat.title}</span>
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Grouped Dynamic Chats */}
          {Object.entries(groupChatsByDate(sessions, searchQuery)).map(([group, items]) => (
            <div key={group} className="history-group">
              <span className="history-group-label">{group}</span>
              {items.map(item => {
                const isEditing = editingSessionId === item.sessionId;
                return (
                  <div 
                    key={item.sessionId} 
                    className={`history-item ${activeChat === item.sessionId ? 'history-item--active' : ''}`}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={() => handleRenameSession(item.sessionId, editingTitle)}
                        onKeyDown={e => e.key === 'Enter' && handleRenameSession(item.sessionId, editingTitle)}
                        autoFocus
                        style={{
                          background: '#111',
                          border: '1px solid #7b61ff',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '12px',
                          padding: '2px 6px',
                          width: '80%'
                        }}
                      />
                    ) : (
                      <button
                        className="history-item-btn"
                        onClick={() => handleSelectChat(item)}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', textAlign: 'left', flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: 0, overflow: 'hidden' }}
                      >
                        {item.pinned ? <Pin size={13} style={{ transform: 'rotate(45deg)', color: '#fbbf24' }} /> : <MessageSquare size={13} />}
                        <span className="history-title">{item.title}</span>
                      </button>
                    )}

                    <div className="chat-item-actions" style={{ display: 'flex', alignItems: 'center' }}>
                      <button 
                        onClick={() => setActiveContextMenu(activeContextMenu === item.sessionId ? null : item.sessionId)}
                        style={{ background: 'transparent', border: 'none', color: '#777', cursor: 'pointer', padding: '4px' }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      
                      {activeContextMenu === item.sessionId && (
                        <div 
                          className="context-menu-dropdown" 
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '32px',
                            background: '#0d0d0d',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            padding: '6px',
                            zIndex: 100,
                            width: '160px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.8)'
                          }}
                        >
                          <button 
                            className="dropdown-item" 
                            onClick={() => { setEditingSessionId(item.sessionId); setEditingTitle(item.title); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Edit3 size={11} /> Rename
                          </button>
                          
                          <button 
                            className="dropdown-item" 
                            onClick={() => handleTogglePin(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Pin size={11} /> {item.pinned ? 'Unpin' : 'Pin'}
                          </button>

                          <button 
                            className="dropdown-item" 
                            onClick={() => setMovingSessionId(movingSessionId === item.sessionId ? null : item.sessionId)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Folder size={11} /> Move to Project...
                          </button>

                          {movingSessionId === item.sessionId && (
                            <div style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }}>
                              <button 
                                onClick={() => handleMoveToProject(item, null)}
                                style={{ fontSize: '10px', background: 'transparent', border: 'none', color: '#999', textAlign: 'left', cursor: 'pointer' }}
                              >
                                [None]
                              </button>
                              {projects.map(p => (
                                <button 
                                  key={p.projectId} 
                                  onClick={() => handleMoveToProject(item, p.projectId)}
                                  style={{ fontSize: '10px', background: 'transparent', border: 'none', color: '#999', textAlign: 'left', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}

                          <button 
                            className="dropdown-item" 
                            onClick={() => handleShareSession(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <ExternalLink size={11} /> Share
                          </button>

                          <button 
                            className="dropdown-item" 
                            onClick={() => handleExportSession(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Download size={11} /> Export
                          </button>

                          <button 
                            className="dropdown-item" 
                            onClick={() => handleToggleArchive(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Archive size={11} /> Archive
                          </button>

                          <button 
                            className="dropdown-item" 
                            onClick={() => handleDuplicateSession(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Copy size={11} /> Duplicate
                          </button>

                          <button 
                            className="dropdown-item dropdown-item--danger" 
                            onClick={() => handleDeleteSession(item.sessionId)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Archived Chats Toggle Section */}
          <div className="projects-section" style={{ marginTop: '10px' }}>
            <button 
              className="history-item"
              onClick={() => setArchivedOpen(!archivedOpen)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
              type="button"
            >
              <Archive size={16} className="history-icon" />
              <span className="history-title" style={{ fontSize: '13.5px', fontWeight: '600', color: '#aaa' }}>Archived Chats ({sessions.filter(s => s.archived).length})</span>
            </button>
            {archivedOpen && (
              <div style={{ paddingLeft: '14px', borderLeft: '1px dashed #222', marginTop: '6px' }}>
                {sessions.filter(s => s.archived).length === 0 ? (
                  <span style={{ fontSize: '10px', color: '#555', padding: '6px 8px', display: 'block' }}>No archived chats.</span>
                ) : (
                  sessions.filter(s => s.archived).map(chat => (
                    <div key={chat.sessionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                      <span style={{ fontSize: '11px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{chat.title}</span>
                      <button 
                        onClick={() => handleToggleArchive(chat)}
                        style={{ fontSize: '9px', background: '#222', border: '1px solid #333', borderRadius: '4px', color: '#eee', padding: '2px 6px', cursor: 'pointer' }}
                      >
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
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
          <div className="qdrant-status-container">
            <span className="qdrant-status-dot" style={{ backgroundColor: qdrantStatus === 'connected' ? '#10b981' : '#ef4444', boxShadow: qdrantStatus === 'connected' ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
            <span style={{ color: qdrantStatus === 'connected' ? '#10b981' : '#ef4444' }}>
              Qdrant DB: {qdrantStatus === 'connected' ? `Synced (${qdrantPoints} pts)` : 'Connecting...'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="lex-main">

        {/* Top bar */}
        <header className="lex-topbar">
          {!sidebarOpen && (
            <button className="sidebar-toggle sidebar-toggle--open" onClick={() => setSidebarOpen(true)} title="Expand sidebar" style={{ color: '#aaa', marginRight: '12px' }}>
              <PanelLeft size={18} />
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
        <div className="input-wrapper" style={{ position: 'relative' }}>
          <div id="robot-portal-dock" style={{ position: 'absolute', left: '-130px', bottom: '10px', zIndex: 10 }} />
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

      {/* ── New Project Modal ── */}
      {showNewProjectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)'
        }}>
          <form onSubmit={handleCreateProject} style={{
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '24px',
            width: '320px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600' }}>Create New Project Workspace</h3>
            <input 
              type="text" 
              placeholder="Project name..." 
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#fff',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                onClick={() => setShowNewProjectModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#ccc',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                style={{
                  background: '#7b61ff',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
