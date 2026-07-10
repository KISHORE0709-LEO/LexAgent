import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import Spline from '@splinetool/react-spline';
import { 
  Send, 
  FileText, 
  MessageSquare, 
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  LogOut,
  User,
  AlertTriangle,
  Plus,
  Volume2,
  Square,
  Loader2,
  Trash2,
  Edit2,
  Globe,
  Mic
} from 'lucide-react';

const ModernLegalAssistant = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isListening, setIsListening] = useState(false);
  const languages = [
    { name: 'English', code: 'English' },
    { name: 'Hindi (हिंदी)', code: 'Hindi' },
    { name: 'Telugu (తెలుగు)', code: 'Telugu' },
    { name: 'Kannada (ಕನ್ನಡ)', code: 'Kannada' },
    { name: 'Tamil (தமிழ்)', code: 'Tamil' },
    { name: 'Malayalam (മലയാളം)', code: 'Malayalam' }
  ];
  const [silentMode, setSilentMode] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState({ severity: 'Medium', domain: 'General Legal Assistance' });
  const [history, setHistory] = useState([]);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const scrollRef = React.useRef(null);
  
  // TTS State
  const [playingId, setPlayingId] = useState(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [audioInstance, setAudioInstance] = useState(null);

  const handleTTS = async (text, msgId) => {
    // If clicking same message while playing, STOP it
    if (playingId === msgId) {
      if (audioInstance) {
        audioInstance.pause();
        audioInstance.currentTime = 0;
      }
      setPlayingId(null);
      setAudioInstance(null);
      return;
    }

    // Stop previous audio
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.currentTime = 0;
    }

    setIsTtsLoading(true);
    setPlayingId(msgId);

    try {
      // 1. Fetch the audio as base64 JSON
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/legal-assistant/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 1000) }), // ElevenLabs limit safety
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'TTS failed');
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // 2. Play base64 audio directly
      const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
      setAudioInstance(audio);
      
      audio.play().catch(e => {
        console.error("Playback failed:", e);
        setPlayingId(null);
      });

      audio.onended = () => {
        setPlayingId(null);
        setAudioInstance(null);
      };

    } catch (err) {
      console.error("TTS Error:", err);
      alert(`Audio Error: ${err.message}`);
      setPlayingId(null);
    } finally {
      setIsTtsLoading(false);
    }
  };

  const [autoPlayNext, setAutoPlayNext] = useState(false);

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    const langMap = {
      'English': 'en-US',
      'Hindi': 'hi-IN',
      'Telugu': 'te-IN',
      'Kannada': 'kn-IN',
      'Tamil': 'ta-IN',
      'Malayalam': 'ml-IN'
    };
    
    recognition.lang = langMap[selectedLanguage] || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setAutoPlayNext(true); // Flag to auto-play the next AI response
      
      // Auto-submit after 500ms so user can see what was captured
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }, 500);
    };

    recognition.onerror = (event) => {
      console.error("Speech Error:", event.error);
      setIsListening(false);
      if (event.error === 'network') {
        alert("Speech Recognition Error: Network connection lost. Please check your internet or try again.");
      } else if (event.error === 'not-allowed') {
        alert("Speech Recognition Error: Microphone access denied. Please enable microphone permissions.");
      } else {
        alert(`Speech Recognition Error: ${event.error}`);
      }
    };

    recognition.start();
  };

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#e02020', 
              textDecoration: 'none', 
              fontWeight: '600',
              borderBottom: '1px solid rgba(224, 32, 32, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.target.style.borderBottomColor = '#e02020'; e.target.style.background = 'rgba(224, 32, 32, 0.05)'; }}
            onMouseLeave={(e) => { e.target.style.borderBottomColor = 'rgba(224, 32, 32, 0.3)'; e.target.style.background = 'transparent'; }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setThreadId(null);
    setLastAnalysis({ severity: 'Medium', domain: 'General Legal Assistance' });
  };

  // Fetch history on mount
  React.useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/legal-assistant/history/${user.uid}`);
        const data = await response.json();
        if (data.history) setHistory(data.history);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [user]);

  // Auto-scroll to bottom whenever messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleDeleteChat = async (e, threadIdToDel) => {
    e.stopPropagation();
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/legal-assistant/history/${user.uid}/${threadIdToDel}`, {
        method: 'DELETE'
      });
      setHistory(prev => prev.filter(t => t.id !== threadIdToDel));
      if (threadId === threadIdToDel) {
         handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleRenameSubmit = async (e, threadIdToRename) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/legal-assistant/history/${user.uid}/${threadIdToRename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle })
      });
      setHistory(prev => prev.map(t => t.id === threadIdToRename ? { ...t, query: editTitle } : t));
      setEditingThreadId(null);
    } catch (err) {
      console.error("Failed to rename chat:", err);
    }
  };

  const startEditing = (e, thread) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditTitle(thread.query);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleHistoryClick = async (thread) => {
    setThreadId(thread.id);
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/legal-assistant/messages/${user.uid}/${thread.id}`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput('');
    
    // Add user message to UI
    const userMessage = { role: 'user', content: userQuery };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/legal-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userQuery, 
          user_id: user?.uid || 'guest',
          thread_id: threadId,
          messages: messages,
          language: selectedLanguage
        }),
      });

      const data = await response.json();
      
      // Update threadId if it's a new conversation
      if (data.thread_id) setThreadId(data.thread_id);

      const botMessage = { 
        role: 'assistant', 
        data: data
      };

      setMessages(prev => [...prev, botMessage]);
      setLastAnalysis({ severity: data.severity, domain: data.domain });

      // Handle Auto-Play for Voice mode
      if (autoPlayNext) {
        handleTTS(data.explanation, messages.length + 1);
        setAutoPlayNext(false);
      }

      // Refresh history sidebar
      if (user?.uid) {
        const hRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/legal-assistant/history/${user.uid}`);
        const hData = await hRes.json();
        if (hData.history) setHistory(hData.history);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        data: {
          query: userQuery,
          explanation: "Sorry, the AI Legal Assistant is currently unavailable. Please try again later.",
          laws: [],
          rights: [],
          steps: [],
          severity: 'Medium',
          domain: 'System'
        } 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = (query) => {
    setInput(query);
  };

  const handleLoadChat = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/legal-assistant/messages/${user.uid}`);
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePanicExit = () => {
    window.location.href = 'https://www.google.com';
  };

  const getSeverityColor = (sev) => {
    switch(sev) {
      case 'Critical': return '#ff0000';
      case 'High': return '#ff4d00';
      case 'Medium': return '#e02020';
      case 'Low': return '#00ff88';
      default: return '#e02020';
    }
  };

  return (
    <div style={{ minHeight: '100vh', height: '100vh', background: '#000', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Background - Hidden for complete black aesthetic */}


      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100px', background: 'transparent', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => navigate('/public-dashboard')}>
          <img src="/Logo.png" alt="Logo" style={{ height: '40px' }} />
          <span style={{ fontSize: '28px', fontWeight: '800', color: '#fff', letterSpacing: '1px' }}>MANDAMUS</span>
        </div>

        {/* Central Capsule Navigation */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '2.5rem', padding: '0 2rem', height: '64px', background: 'rgba(20, 20, 20, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '32px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
          <button 
            onClick={() => navigate('/public-dashboard')}
            style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'color 0.25s ease', padding: 0 }}
            onMouseEnter={(e) => e.target.style.color = '#e02020'}
            onMouseLeave={(e) => e.target.style.color = '#fff'}
          >
            Public Dashboard
          </button>
          <button 
            onClick={() => navigate('/modern-advisor')}
            style={{ background: 'transparent', color: '#e02020', border: 'none', fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'color 0.25s ease', padding: 0 }}
          >
            Legal Assistant
          </button>
          <button 
            onClick={() => navigate('/vault')}
            style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'color 0.25s ease', padding: 0 }}
            onMouseEnter={(e) => e.target.style.color = '#e02020'}
            onMouseLeave={(e) => e.target.style.color = '#fff'}
          >
            Silent Justice
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '100px' }}>
            <Globe size={16} color="#e02020" />
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code} style={{ background: '#111', color: '#fff' }}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '100px' }}>
            <span style={{ fontSize: '16px', fontWeight: '500', color: '#fff' }}>{user?.displayName || 'User'}</span>
            <div style={{ width: '32px', height: '32px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <User size={18} />
            </div>
          </div>

          <button onClick={handleLogout} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '24px', fontSize: '16px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content - Two Column Layout */}
      <div style={{ position: 'relative', zIndex: 1, height: 'calc(100vh - 130px)', display: 'grid', gridTemplateColumns: '75% 25%', gap: '32px', maxWidth: '1500px', margin: '110px auto 20px', padding: '0 40px', overflow: 'hidden' }}>
        
        {/* LEFT SECTION - AI Response Card */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#111', borderRadius: '24px', border: '2px solid #e02020', boxShadow: '0 0 20px rgba(224, 32, 32, 0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>AI Legal Assistant</h2>
              <p style={{ fontSize: '14px', color: '#888' }}>Get instant legal guidance and understand your rights</p>
            </div>

            {/* Body - Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              {/* Scrollable Content Area */}
              <div 
                ref={scrollRef}
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '32px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#e02020 #1a1a1a'
                }} className="custom-scrollbar"
              >
                
                {messages.length === 0 && !isLoading ? (
                  // Empty State
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                    <div>
                      <p style={{ fontSize: '18px', color: '#888', lineHeight: '1.6' }}>
                        Describe your legal issue to get guidance
                      </p>
                    </div>
                  </div>
                ) : (
                  // Map through messages
                  <div>
                    {messages.map((msg, index) => (
                      <div key={index} style={{ marginBottom: '48px' }}>
                        {msg.role === 'user' ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                            <div style={{ maxWidth: '80%', padding: '16px 20px', background: '#1a1a1a', borderRadius: '16px 16px 0 16px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                              <p style={{ color: '#fff', fontSize: '15px', lineHeight: '1.6' }}>{msg.content}</p>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Bot Intro */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e02020', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' }}>
                                  <MessageSquare size={20} color="#fff" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', letterSpacing: '1px' }}>MANDAMUS ADVISOR</span>
                                  <span style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>{msg.data.domain || 'General'}</span>
                                </div>
                                <button 
                                  onClick={() => handleTTS(msg.data.explanation, index)}
                                  style={{ 
                                    background: 'rgba(224, 32, 32, 0.1)', 
                                    border: '1px solid rgba(224, 32, 32, 0.3)', 
                                    borderRadius: '8px', 
                                    padding: '6px 12px', 
                                    color: '#fff', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    marginLeft: '12px'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(224, 32, 32, 0.2)'; e.currentTarget.style.borderColor = '#e02020'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(224, 32, 32, 0.1)'; e.currentTarget.style.borderColor = 'rgba(224, 32, 32, 0.3)'; }}
                                >
                                  {isTtsLoading && playingId === index ? (
                                    <Loader2 size={14} className="btn-spinner" style={{ animation: 'authSpin 1s linear infinite' }} />
                                  ) : playingId === index ? (
                                    <Square size={14} fill="#fff" />
                                  ) : (
                                    <Volume2 size={14} />
                                  )}
                                  <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>
                                    {playingId === index ? 'STOP' : 'LISTEN'}
                                  </span>
                                </button>
                              </div>
                              <div style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.5)', borderRadius: '20px', border: `1px solid ${getSeverityColor(msg.data.severity || 'Medium')}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getSeverityColor(msg.data.severity || 'Medium'), boxShadow: `0 0 10px ${getSeverityColor(msg.data.severity || 'Medium')}` }} />
                                <span style={{ fontSize: '11px', fontWeight: '800', color: getSeverityColor(msg.data.severity || 'Medium') }}>{(msg.data.severity || 'Medium').toUpperCase()}</span>
                              </div>
                            </div>

                            {/* Response Card Inner */}
                            <div style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              {/* Explanation */}
                              <p style={{ color: '#ccc', lineHeight: '1.8', fontSize: '15px', marginBottom: '32px' }}>
                                {renderTextWithLinks(msg.data.explanation)}
                              </p>

                              {/* Grid for Laws and Rights */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                <div>
                                  <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#e02020', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Applicable Laws</h4>
                                  <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {(msg.data.laws || []).map((law, idx) => (
                                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <CheckCircle size={14} style={{ color: '#e02020', marginTop: '2px' }} />
                                        <span style={{ color: '#bbb', fontSize: '13px' }}>{renderTextWithLinks(law)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#e02020', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Rights</h4>
                                  <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {(msg.data.rights || []).map((right, idx) => (
                                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <CheckCircle size={14} style={{ color: '#e02020', marginTop: '2px' }} />
                                        <span style={{ color: '#bbb', fontSize: '13px' }}>{renderTextWithLinks(right)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* Step-by-Step */}
                              <div>
                                <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#e02020', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Step-by-Step Procedure</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {(msg.data.steps || []).map((step, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                      <span style={{ width: '28px', height: '28px', background: '#e02020', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>
                                        {idx + 1}
                                      </span>
                                      <div>
                                        <strong style={{ color: '#fff', fontSize: '14px', display: 'block', marginBottom: '4px' }}>{step.title}</strong>
                                        <span style={{ color: '#999', fontSize: '13px', lineHeight: '1.5' }}>{renderTextWithLinks(step.content)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Suggested Questions */}
                              {msg.data.suggested_questions && msg.data.suggested_questions.length > 0 && (
                                <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                  {msg.data.suggested_questions.map((q, qidx) => (
                                    <button 
                                      key={qidx}
                                      onClick={() => handleSuggestedQuery(q)}
                                      style={{ padding: '8px 16px', background: 'rgba(224, 32, 32, 0.1)', color: '#fff', border: '1px solid rgba(224, 32, 32, 0.3)', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                      onMouseEnter={(e) => { e.target.style.background = 'rgba(224, 32, 32, 0.2)'; e.target.style.borderColor = '#e02020'; }}
                                      onMouseLeave={(e) => { e.target.style.background = 'rgba(224, 32, 32, 0.1)'; e.target.style.borderColor = 'rgba(224, 32, 32, 0.3)'; }}
                                    >
                                      {q}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', background: 'rgba(224, 32, 32, 0.05)', borderRadius: '20px', border: '1px dashed #e02020' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div className="btn-spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(224, 32, 32, 0.3)', borderTopColor: '#e02020', borderRadius: '50%', animation: 'authSpin 1s linear infinite' }}></div>
                          <p style={{ fontSize: '14px', color: '#e02020', letterSpacing: '1.5px', fontWeight: '800' }}>ANALYZING LEGAL FRAMEWORK...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input Box (INSIDE CARD - STICKY BOTTOM) */}
              <div style={{ padding: '20px 32px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.3)' }}>
                <form onSubmit={handleQuery}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? "Listening..." : "Describe your situation or ask a follow-up question..."}
                      style={{ width: '100%', padding: '14px 100px 14px 20px', fontSize: '15px', color: '#fff', background: '#1a1a1a', border: `1px solid ${isListening ? '#e02020' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '12px', outline: 'none', transition: 'all 0.3s ease' }}
                    />
                    <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={handleVoiceInput}
                        style={{ padding: '10px', background: isListening ? '#ff0000' : 'rgba(255, 255, 255, 0.05)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', animation: isListening ? 'pulse 1.5s infinite' : 'none' }}
                      >
                        <Mic size={18} />
                      </button>
                      <button type="submit" style={{ padding: '10px', background: '#e02020', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT SECTION - Sidebar */}
        <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px', scrollbarWidth: 'thin', scrollbarColor: '#e02020 #1a1a1a' }} className="custom-scrollbar">
          
          {/* New Chat Button */}
          <button 
            onClick={handleNewChat}
            style={{ width: '100%', padding: '16px', background: '#e02020', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: '800', letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s ease', boxShadow: '0 4px 20px rgba(224, 32, 32, 0.3)' }}
            onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 25px rgba(224, 32, 32, 0.4)'; }}
            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(224, 32, 32, 0.3)'; }}
          >
            <Plus size={20} /> NEW CONSULTATION
          </button>

          {/* Consultation History */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', background: '#111', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '20px', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px', paddingLeft: '8px' }}>
              Recents
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
              {history.length > 0 ? history.map((item, idx) => (
                <div key={idx} 
                  onClick={() => handleHistoryClick(item)}
                  className="history-item-container"
                  style={{ 
                    padding: '12px 16px', 
                    background: threadId === item.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => { if (threadId !== item.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={(e) => { if (threadId !== item.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  {editingThreadId === item.id ? (
                    <form onSubmit={(e) => handleRenameSubmit(e, item.id)} style={{ flex: 1, display: 'flex' }}>
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        onBlur={() => setEditingThreadId(null)}
                        style={{ width: '100%', background: '#000', color: '#fff', border: '1px solid #e02020', borderRadius: '4px', padding: '4px 8px', fontSize: '13px', outline: 'none' }}
                      />
                    </form>
                  ) : (
                    <p style={{ 
                      fontSize: '14px', 
                      color: threadId === item.id ? '#fff' : '#ccc', 
                      fontWeight: threadId === item.id ? '600' : '500', 
                      lineHeight: '1.4', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      margin: 0,
                      flex: 1
                    }}>
                      {item.query}
                    </p>
                  )}
                  
                  {/* Action Buttons (visible on hover via CSS) */}
                  {editingThreadId !== item.id && (
                    <div className="history-actions" style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={(e) => startEditing(e, item)}
                        style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                        title="Rename"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteChat(e, item.id)}
                        style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#e02020'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )) : (
                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.3 }}>
                  <p style={{ fontSize: '12px', fontWeight: '600' }}>No previous consultations</p>
                </div>
              )}
            </div>
          </div>

          {/* Severity & Domain Indicators (Smaller, at bottom of sidebar) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ padding: '10px', background: 'rgba(224, 32, 32, 0.1)', color: getSeverityColor(lastAnalysis.severity || 'Medium'), border: `1px solid ${getSeverityColor(lastAnalysis.severity || 'Medium')}`, borderRadius: '8px', textAlign: 'center', fontWeight: '800', fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>
              SEVERITY: {(lastAnalysis.severity || 'Medium').toUpperCase()}
            </div>
            <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', fontWeight: '600' }}>
              DOMAIN: <span style={{ color: '#fff' }}>{(lastAnalysis.domain || 'General').toUpperCase()}</span>
            </div>
          </div>



        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .history-item-container .history-actions {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .history-item-container:hover .history-actions {
          opacity: 1;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e02020;
          border-radius: 4px;
          transition: background 0.3s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ff3030;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(224, 32, 32, 0.4); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(224, 32, 32, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(224, 32, 32, 0); }
        }
        @keyframes authSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ModernLegalAssistant;
