import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, MessageSquare, Settings, LogOut, Paperclip, Send,
  BrainCircuit, X, FileText, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight, Mic, MicOff, Link, MoreHorizontal,
  Folder, Scale, User, Search, Pin, Archive, Trash2, Edit3,
  Copy, Download, FolderPlus, ExternalLink, PanelLeft, PanelLeftClose, Volume2, Square
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
  const audioRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [chatTitle, setChatTitle] = useState('');
  const [detectedJurisdiction, setDetectedJurisdiction] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const recognitionRef = useRef(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Dynamic history and project states
  const [sessions, setSessions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState(null); // sessionId
  const [activeProjectId, setActiveProjectId] = useState(null); // which project new chats go into
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeContextMenu, setActiveContextMenu] = useState(null); // sessionId
  const [movingSessionId, setMovingSessionId] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setInputText(text);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Your browser does not support speech recognition.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      const langMap = {
        "English": "en-IN",
        "Hindi": "hi-IN",
        "Telugu": "te-IN",
        "Tamil": "ta-IN",
        "Kannada": "kn-IN"
      };
      recognitionRef.current.lang = langMap[selectedLanguage] || "en-US";
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };
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

  // Sync session state with the database (fire-and-forget, NO fetchHistory call)
  const syncSession = useCallback(async (sessionId, title, messagesList, pinned, archived, projectId) => {
    if (!sessionId) return;
    try {
      const userId = user?.uid || 'default_user';
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sessions`, {
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
      // Do NOT call fetchHistory() here — it causes a full sidebar re-render
      // that swallows clicks. State is updated optimistically by each handler.
    } catch (err) {
      console.error("Error syncing session:", err);
    }
  }, [user]);

  // Selects an existing chat from history
  const handleSelectChat = (session) => {
    setActiveChat(session.sessionId);
    setMessages(session.messages || []);
    setChatTitle(session.title || '');
    setActiveProjectId(session.projectId || null); // keep project context in sync
    // Scan messages to find detected jurisdiction
    const analysisMsg = session.messages?.find(m => m.type === 'analysis_card');
    if (analysisMsg && analysisMsg.data?.court_name) {
      setDetectedJurisdiction(analysisMsg.data.court_name);
    } else {
      setDetectedJurisdiction('');
    }
  };

  // Pinned/Unpinned Chat — update local state instantly, sync to DB in background
  const handleTogglePin = (session) => {
    const newPinned = !session.pinned;
    setSessions(prev => prev.map(s =>
      s.sessionId === session.sessionId ? { ...s, pinned: newPinned } : s
    ));
    setActiveContextMenu(null);
    syncSession(session.sessionId, session.title, session.messages, newPinned, session.archived, session.projectId);
  };

  // Archive/Unarchive Chat — update local state instantly, sync to DB in background
  const handleToggleArchive = (session) => {
    const newArchived = !session.archived;
    setSessions(prev => prev.map(s =>
      s.sessionId === session.sessionId ? { ...s, archived: newArchived } : s
    ));
    if (activeChat === session.sessionId && newArchived) handleNewChat();
    setActiveContextMenu(null);
    syncSession(session.sessionId, session.title, session.messages, session.pinned, newArchived, session.projectId);
  };

  // Move to Project — update local state instantly, sync to DB in background
  const handleMoveToProject = (session, projectId) => {
    setSessions(prev => prev.map(s =>
      s.sessionId === session.sessionId ? { ...s, projectId } : s
    ));
    setMovingSessionId(null);
    setActiveContextMenu(null);
    syncSession(session.sessionId, session.title, session.messages, session.pinned, session.archived, projectId);
  };

  // Rename Session — update local state instantly, sync to DB in background
  const handleRenameSession = (sessionId, newTitle) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session || !newTitle.trim()) return;
    const trimmed = newTitle.trim();
    setSessions(prev => prev.map(s =>
      s.sessionId === sessionId ? { ...s, title: trimmed } : s
    ));
    if (activeChat === sessionId) setChatTitle(trimmed);
    setEditingSessionId(null);
    setEditingTitle('');
    setActiveContextMenu(null);
    syncSession(sessionId, trimmed, session.messages, session.pinned, session.archived, session.projectId);
  };

  // Duplicate Session — add to local state instantly, sync to DB in background
  const handleDuplicateSession = (session) => {
    const newSessionId = "session-" + Date.now() + Math.floor(Math.random() * 1000);
    const newSession = {
      ...session,
      sessionId: newSessionId,
      title: `Copy of ${session.title}`,
      pinned: false,
      archived: false,
      timestamp: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveContextMenu(null);
    syncSession(newSessionId, newSession.title, session.messages || [], false, false, session.projectId);
  };

  // Delete Session — remove from local state instantly, then delete from DB
  const handleDeleteSession = async (sessionId) => {
    // Optimistic update: remove immediately
    setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    if (activeChat === sessionId) handleNewChat();
    setActiveContextMenu(null);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sessions/${sessionId}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Error deleting session:", err);
    }
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
    const newProject = {
      type: "project",
      projectId,
      userId: user?.uid || 'default_user',
      name: newProjectName.trim(),
      timestamp: Date.now()
    };
    // Optimistic update
    setProjects(prev => [...prev, newProject]);
    setNewProjectName('');
    setShowNewProjectModal(false);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId: newProject.userId, name: newProject.name })
      });
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  // Delete Project Workspace
  const handleDeleteProject = async (projectId) => {
    // Optimistic update: remove project and unlink its chats
    setProjects(prev => prev.filter(p => p.projectId !== projectId));
    setSessions(prev => prev.map(s => s.projectId === projectId ? { ...s, projectId: null } : s));
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/projects/${projectId}`, { method: 'DELETE' });
      // Persist the unlinking for each chat in background
      const chatsInProject = sessions.filter(s => s.projectId === projectId);
      for (const chat of chatsInProject) {
        syncSession(chat.sessionId, chat.title, chat.messages, chat.pinned, chat.archived, null);
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); } catch (e) { console.error(e); }
  };

  const handlePlayAudio = async (text) => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      } else {
        console.error("TTS failed", await response.text());
        setIsPlayingAudio(false);
      }
    } catch (err) {
      console.error(err);
      setIsPlayingAudio(false);
    }
  };

  const handleNewChat = (projectId = null) => {
    setMessages([]);
    setInputText('');
    setAttachedFiles([]);
    setChatTitle('');
    setDetectedJurisdiction('');
    setActiveChat(null);
    setActiveProjectId(projectId);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
    e.target.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && attachedFiles.length === 0) return;

    // Generate or retrieve current session ID & Title
    const isNew = !activeChat;
    const currentChatId = activeChat || ("chat-" + Date.now() + Math.floor(Math.random() * 1000));
    const filesToSend = [...attachedFiles];
    const currentTitle = chatTitle || (filesToSend.length > 0 ? filesToSend[0].name.replace(/\.[^/.]+$/, '') : (inputText.substring(0, 30) || 'New Chat'));

    if (isNew) {
      setActiveChat(currentChatId);
      setChatTitle(currentTitle);
    }

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: inputText,
      files: filesToSend.map(f => f.name),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setAttachedFiles([]);
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
        projectId: activeProjectId,
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
    await syncSession(currentChatId, currentTitle, updatedMessages, false, false, activeProjectId);

    if (filesToSend.length === 0) {
      try {
        setProcessingStatus('Thinking...');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/api/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `(Respond in ${selectedLanguage}) ` + userMsg.text })
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
      filesToSend.forEach(file => {
        formData.append('files', file);
      });
      if (user?.uid) formData.append('user_id', user.uid);
      formData.append('language', selectedLanguage);

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
            {msg.files && msg.files.map((fname, i) => (
              <div key={i} className="file-badge">
                <FileText size={13} />
                <span>{fname}</span>
              </div>
            ))}
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
          <div className="msg-bubble msg-bubble--agent lex-response">
            <div className="lex-response-body">{renderTextWithLinks(msg.text)}</div>
            <div className="lex-response-footer">
              <button
                onClick={() => handlePlayAudio(msg.text)}
                className="audio-play-btn"
                title={isPlayingAudio ? 'Stop Audio' : 'Read Aloud'}
              >
                {isPlayingAudio ? <Square size={13} fill="currentColor" /> : <Volume2 size={13} />}
                <span>{isPlayingAudio ? 'Stop' : 'Read Aloud'}</span>
              </button>
            </div>
          </div>
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
              <div className="analysis-card__header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BrainCircuit size={15} />
                  <span>Case Breakdown — {data.case_id}</span>
                </div>
                {data.eli5_summary && (
                  <button 
                    onClick={() => handlePlayAudio(data.eli5_summary)}
                    className="audio-play-btn"
                    title={isPlayingAudio ? 'Stop Audio' : 'Read Aloud'}
                  >
                    {isPlayingAudio ? <Square size={13} fill="currentColor" /> : <Volume2 size={13} />}
                    <span>{isPlayingAudio ? 'Stop Audio' : 'Read Aloud'}</span>
                  </button>
                )}
              </div>
              <div className="analysis-card__body">
                {data.requires_counselling && (
                  <div style={{ background: 'rgba(255, 77, 77, 0.1)', borderLeft: '3px solid #ff4d4d', padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>
                    <p style={{ color: '#ff4d4d', margin: 0, fontSize: '13px', fontWeight: 'bold' }}>⚠️ Human Counseling Recommended</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '12px' }}>This situation appears sensitive. Consider seeking professional legal or psychological counseling.</p>
                  </div>
                )}
                <div className="meta-row">
                  <span className="meta-label">Jurisdiction</span>
                  <span className="jurisdiction-pill">{data.court_name}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Parties</span>
                  <span>{data.petitioner} vs. {data.respondent}</span>
                </div>
                <p className="summary-text" style={{ fontWeight: '600' }}>{data.plain_summary}</p>
                {data.eli5_summary && (
                  <div style={{ background: '#1c1c24', padding: '12px', borderRadius: '6px', marginTop: '12px', marginBottom: '12px', borderLeft: '3px solid #ff4d4d' }}>
                    <span style={{ fontSize: '11px', color: '#ff4d4d', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Plain Language Explanation</span>
                    <p className="summary-text" style={{ margin: 0 }}>{data.eli5_summary}</p>
                  </div>
                )}
                {Array.isArray(data.red_flags) && data.red_flags.length > 0 && (
                  <div className="facts-section" style={{ marginTop: '16px' }}>
                    <span className="facts-label" style={{ color: '#ff4d4d' }}>⚠️ Critical Red Flags Identified</span>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', color: '#ff6b6b' }}>
                      {data.red_flags.map((flag, i) => (
                        <li key={i} style={{ marginBottom: '6px', fontSize: '13px' }}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(data.actionable_steps) && data.actionable_steps.length > 0 && (
                  <div className="facts-section" style={{ marginTop: '16px' }}>
                    <span className="facts-label" style={{ color: '#ff4d4d' }}>Actionable Next Steps & Helplines</span>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                      {data.actionable_steps.map((action, i) => (
                        <li key={i} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px' }}>
                          <div style={{ fontWeight: '500', color: '#fff', fontSize: '13px', marginBottom: '6px' }}>{action.step}</div>
                          {action.phone_numbers?.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#ff4d4d', marginBottom: '4px' }}>📞 {action.phone_numbers.join(', ')}</div>
                          )}
                          {action.links?.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#ff6b6b' }}>🔗 {action.links.join(', ')}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(data.key_facts) && data.key_facts.length > 0 && (
                  <div className="facts-section">
                    <span className="facts-label">Key Facts</span>
                    <ul>{data.key_facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  </div>
                )}
                {Array.isArray(data.follow_up_questions) && data.follow_up_questions.length > 0 && (
                  <div className="facts-section" style={{ marginTop: '16px' }}>
                    <span className="facts-label" style={{ color: '#ff4d4d' }}>Suggested Follow-up Questions</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {data.follow_up_questions.map((q, i) => (
                        <button 
                          key={i} 
                          onClick={() => {
                            setInputText(q);
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }}
                          style={{
                            background: 'rgba(123, 97, 255, 0.1)',
                            border: '1px solid rgba(123, 97, 255, 0.3)',
                            color: '#e2d9ff',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
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
                    {(() => {
                      // Live counts from ipc_sections when executive_summary not yet available
                      const clauses = data.ipc_sections || [];
                      const high = data.executive_summary?.high_risk_count ?? clauses.filter(c => c.riskLevel?.toLowerCase() === 'high').length;
                      const medium = data.executive_summary?.medium_risk_count ?? clauses.filter(c => c.riskLevel?.toLowerCase() === 'medium').length;
                      const low = data.executive_summary?.low_risk_count ?? clauses.filter(c => c.riskLevel?.toLowerCase() === 'low').length;
                      return (
                        <>
                          <span className="compliance-pill compliance-pill--high">High: {high}</span>
                          <span className="compliance-pill compliance-pill--medium">Medium: {medium}</span>
                          <span className="compliance-pill compliance-pill--low">Low: {low}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="compliance-meter">
                  <div className="compliance-circle">
                    {(() => {
                      const clauses = data.ipc_sections || [];
                      const score = data.executive_summary?.overall_compliance_score ??
                        (clauses.length > 0
                          ? Math.max(50, Math.round(100 - (clauses.filter(c => c.riskLevel?.toLowerCase() === 'high').length / clauses.length) * 40 - (clauses.filter(c => c.riskLevel?.toLowerCase() === 'medium').length / clauses.length) * 15))
                          : null);
                      return (
                        <span className="compliance-circle-score" style={{
                          color: score == null ? '#555' : score >= 80 ? '#10b981' : score >= 60 ? '#fbbf24' : '#ff4d4d'
                        }}>
                          {score != null ? `${score}%` : '--'}
                        </span>
                      );
                    })()}
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
          <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} title="Go to Home">
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
          <div className="proj-section">
            <div className="proj-section-header">
              <span className="proj-section-label">Workspaces</span>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="proj-new-btn"
                title="New Workspace"
              >
                <FolderPlus size={13} />
                <span>New</span>
              </button>
            </div>

            {projects.length === 0 && (
              <div className="proj-empty">
                <Folder size={18} style={{ opacity: 0.3 }} />
                <span>No workspaces yet</span>
              </div>
            )}

            {projects.map(proj => {
              const chatsInProj = sessions.filter(s => s.projectId === proj.projectId);
              const isOpen = !projectsCollapsed[proj.projectId];
              const isActiveProject = activeProjectId === proj.projectId;
              return (
                <div key={proj.projectId} className={`proj-card ${isActiveProject ? 'proj-card--active' : ''}`}>
                  {/* Project Header Row */}
                  <div
                    className="proj-card-header"
                    onClick={() => setProjectsCollapsed(prev => ({ ...prev, [proj.projectId]: !prev[proj.projectId] }))}
                  >
                    <div className="proj-card-left">
                      <div className={`proj-card-icon ${isActiveProject ? 'proj-card-icon--active' : ''}`}>
                        <Folder size={12} />
                      </div>
                      <span className="proj-card-name">{proj.name}</span>
                      <span className="proj-card-count">{chatsInProj.length}</span>
                    </div>
                    <div className="proj-card-actions">
                      <button
                        className="proj-action-btn"
                        onClick={(e) => { e.stopPropagation(); handleNewChat(proj.projectId); }}
                        title={`New chat in ${proj.name}`}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        className="proj-action-btn proj-action-btn--delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.projectId); }}
                        title="Delete workspace"
                      >
                        <X size={11} />
                      </button>
                      <span className={`proj-chevron ${isOpen ? 'proj-chevron--open' : ''}`}>
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Chat List */}
                  <div className={`proj-dropdown ${isOpen ? 'proj-dropdown--open' : ''}`}>
                    {chatsInProj.length === 0 ? (
                      <div className="proj-dropdown-empty">
                        <MessageSquare size={11} style={{ opacity: 0.4 }} />
                        <span>No chats yet — click + to start</span>
                      </div>
                    ) : (
                      chatsInProj.map(chat => (
                        <button
                          key={chat.sessionId}
                          className={`proj-chat-item ${activeChat === chat.sessionId ? 'proj-chat-item--active' : ''}`}
                          onClick={() => handleSelectChat(chat)}
                        >
                          <MessageSquare size={11} className="proj-chat-icon" />
                          <span className="proj-chat-title">{chat.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grouped Dynamic Chats */}
          {Object.entries(useMemo(() => groupChatsByDate(sessions, searchQuery), [sessions, searchQuery])).map(([group, items]) => (
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
          {/* Show active project pill */}
          {activeProjectId && (() => {
            const proj = projects.find(p => p.projectId === activeProjectId);
            return proj ? (
              <span style={{
                marginLeft: '10px', fontSize: '11px', fontWeight: '600',
                background: 'rgba(214,40,40,0.12)', border: '1px solid rgba(214,40,40,0.3)',
                color: '#ff6b6b', borderRadius: '20px', padding: '2px 10px',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <Folder size={10} /> {proj.name}
              </span>
            ) : null;
          })()}
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
            accept="image/*,.pdf,.docx,.txt"
            multiple
          />

          {attachedFiles.length > 0 && (
            <div className="attached-files-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '0 15px', marginBottom: '10px' }}>
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="attached-pill">
                  <FileText size={13} />
                  <span>{file.name}</span>
                  <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}><X size={12} /></button>
                </div>
              ))}
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

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="language-selector"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                padding: '4px 8px',
                marginRight: '8px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Telugu">Telugu</option>
              <option value="Tamil">Tamil</option>
              <option value="Kannada">Kannada</option>
            </select>

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
              onClick={toggleRecording}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? <MicOff size={19} /> : <Mic size={19} />}
              {isRecording && <span className="mic-pulse" />}
            </button>

            <button
              type="submit"
              className={`send-btn ${(inputText.trim() || attachedFiles.length > 0) && !isProcessing ? 'send-btn--active' : ''}`}
              disabled={(!inputText.trim() && attachedFiles.length === 0) || isProcessing}
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
