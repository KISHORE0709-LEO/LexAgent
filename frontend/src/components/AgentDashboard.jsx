import React, { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Settings, LogOut, Paperclip, Send, BrainCircuit, X, FileText, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AgentDashboard.css';

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, processingStatus]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
    }
    // reset input so the same file can be selected again if removed
    e.target.value = null; 
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    // 1. Add user message to chat
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: inputText,
      file: attachedFile ? attachedFile.name : null
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    const fileToSend = attachedFile;
    setAttachedFile(null);
    setIsProcessing(true);
    setProcessingStatus("Initializing connection...");

    // If there is no file, we just simulate a standard text response for now (since backend expects files)
    if (!fileToSend) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'agent',
          type: 'text',
          text: "I am currently optimized to analyze legal documents using our Qdrant and Enkrypt AI pipeline. Please attach a PDF or DOCX contract using the paperclip icon for a full risk analysis."
        }]);
        setIsProcessing(false);
        setProcessingStatus("");
      }, 1000);
      return;
    }

    // 2. Call backend streaming API
    try {
      const formData = new FormData();
      formData.append('files', fileToSend);
      if (user?.uid) formData.append('user_id', user.uid);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/summarise`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to connect to Legal Agent API");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop(); 
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.processing_status === 'failed') {
                  throw new Error(data.error);
                } else if (data.processing_status === 'complete') {
                  setProcessingStatus("");
                  // Add the massive response as a rich card
                  setMessages(prev => [...prev, {
                    id: Date.now() + 2,
                    role: 'agent',
                    type: 'analysis_card',
                    data: data
                  }]);
                } else {
                  setProcessingStatus(`Status: ${data.processing_status.toUpperCase()}...`);
                }
              } catch (e) {
                if (e.message && !e.message.includes("JSON")) {
                  throw e;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setProcessingStatus("");
      setMessages(prev => [...prev, {
        id: Date.now() + 3,
        role: 'agent',
        type: 'text',
        text: `Error analyzing document: ${err.message}`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.role === 'user') {
      return (
        <div className="message-content">
          {msg.text && <p>{msg.text}</p>}
          {msg.file && (
            <div className="attached-file-badge" style={{ display: 'inline-flex', marginTop: msg.text ? '10px' : '0' }}>
              <FileText size={14} /> {msg.file}
            </div>
          )}
        </div>
      );
    }

    if (msg.type === 'text') {
      return <div className="message-content"><p>{msg.text}</p></div>;
    }

    if (msg.type === 'analysis_card') {
      const { data } = msg;
      return (
        <div className="message-content w-full">
          <p>Analysis complete. I have processed the document through our Jurisdiction-Aware Retrieval and Enkrypt AI Safety Pipeline.</p>
          
          {/* Main Summary Card */}
          <div className="agent-card">
            <div className="card-header">
              <BrainCircuit size={18} color="#e02020" />
              <span className="card-title">Case Breakdown: {data.case_id}</span>
            </div>
            <div className="card-body">
              <p><strong>Jurisdiction:</strong> {data.court_name}</p>
              <p><strong>Parties:</strong> {data.petitioner} vs. {data.respondent}</p>
              <p style={{ marginTop: '10px', color: '#aaa' }}>{data.plain_summary}</p>
              
              <div style={{ marginTop: '15px' }}>
                <strong style={{ color: '#fff', fontSize: '13px', textTransform: 'uppercase' }}>Key Facts Extracted:</strong>
                <ul style={{ marginTop: '8px', color: '#ccc', fontSize: '14px' }}>
                  {data.key_facts?.map((fact, idx) => <li key={idx}>{fact}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Flagged Clauses Card */}
          {data.ipc_sections && data.ipc_sections.length > 0 && (
            <div className="agent-card" style={{ borderColor: '#331111', backgroundColor: '#1a0d0d' }}>
              <div className="card-header">
                <AlertTriangle size={18} color="#ff4444" />
                <span className="card-title" style={{ color: '#ff4444' }}>Clause Risk Assessment</span>
              </div>
              <div className="card-body">
                <p style={{ color: '#aaa', fontSize: '13px' }}>The following clauses were benchmarked against Qdrant precedents in {data.court_name}. Enkrypt AI guards were applied to drafting suggestions.</p>
                {data.ipc_sections.map((clause, idx) => {
                  const isBlocked = clause.description.includes("[ENKRYPT AI BLOCKED]");
                  return (
                    <div key={idx} className="clause-box">
                      <div className="clause-box-header">
                        {clause.section.includes("HIGH") ? <span className="risk-high">{clause.section}</span> : <span className="risk-medium">{clause.section}</span>}
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#ddd' }}>
                        {clause.description}
                      </p>
                      {isBlocked && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4444', fontSize: '12px', fontWeight: 'bold' }}>
                          <X size={14} /> Output Guard Blocked Hallucinated Suggestion
                        </div>
                      )}
                      {!isBlocked && clause.description.includes("[AI Suggestion]") && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>
                          <CheckCircle2 size={14} /> AI Suggestion Passed Safety Guard
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="agent-dashboard-layout">
      {/* SIDEBAR */}
      <div className="agent-sidebar">
        <button className="new-chat-btn" onClick={() => { setMessages([]); setInputText(""); setAttachedFile(null); }}>
          <Plus size={18} /> New Analysis
        </button>
        
        <div className="history-section">
          <div className="history-title">Recent Chats</div>
          <div className="history-item">
            <MessageSquare size={14} />
            <span>Employment Contract Review</span>
          </div>
          <div className="history-item">
            <MessageSquare size={14} />
            <span>NDA Benchmarking (NY)</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="footer-btn">
            <Settings size={16} /> Settings
          </button>
          <button className="footer-btn" onClick={handleLogout}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="agent-main">
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-logo">
                <BrainCircuit size={64} color="#e02020" />
              </div>
              <h1 className="welcome-title">How can I assist you today?</h1>
              <p className="welcome-subtitle">Upload a legal contract to begin jurisdiction-aware clause analysis and risk benchmarking powered by Qdrant and Enkrypt AI.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="chat-message">
                <div className={`chat-avatar ${msg.role === 'user' ? 'avatar-user' : 'avatar-agent'}`}>
                  {msg.role === 'user' ? 'U' : <BrainCircuit size={20} />}
                </div>
                {renderMessageContent(msg)}
              </div>
            ))
          )}

          {isProcessing && (
            <div className="chat-message">
              <div className="chat-avatar avatar-agent">
                <BrainCircuit size={20} />
              </div>
              <div className="message-content">
                <div className="status-streamer">
                  <div className="pulsing-dot" />
                  <span>{processingStatus || 'Analyzing...'}</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* INPUT BAR */}
        <div className="input-area-wrapper">
          <form className="input-box" onSubmit={handleSubmit}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".pdf,.docx,.txt"
            />
            <button 
              type="button" 
              className="attach-btn" 
              onClick={() => fileInputRef.current?.click()}
              title="Attach Document"
            >
              <Paperclip size={20} />
            </button>
            
            {attachedFile && (
              <div className="attached-file-badge">
                <FileText size={14} />
                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedFile.name}</span>
                <button type="button" onClick={removeAttachedFile}><X size={14} /></button>
              </div>
            )}

            <input 
              type="text" 
              className="chat-input"
              placeholder="Message Legal Agent or attach a contract to analyze..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
            />
            
            <button 
              type="submit" 
              className="send-btn" 
              disabled={(!inputText.trim() && !attachedFile) || isProcessing}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
