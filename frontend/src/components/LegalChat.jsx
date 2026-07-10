import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import './LegalChat.css';

const LegalChat = ({ summary, context = 'analysis' }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `SYSTEM_ACTIVE: I am your legal intelligence assistant. How can I assist with this ${context}?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          summary: summary,
          history: messages
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '[ERROR]: Connection to neural core failed.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="legal-chat-container">
      <div className="legal-chat-header">
        <div className="legal-chat-status" />
        <span>LEGAL_AI_SESSION_v2.0</span>
      </div>
      <div className="legal-chat-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`legal-chat-msg ${m.role === 'assistant' ? 'legal-msg-ai' : 'legal-msg-user'}`}>
            <div className="legal-msg-icon">
              {m.role === 'assistant' ? <Bot size={10} /> : <User size={10} />}
            </div>
            <div className="legal-msg-content">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="legal-chat-msg legal-msg-ai">
            <div className="legal-msg-icon"><Loader2 size={10} className="dg-spin" /></div>
            <div className="legal-msg-content">PROCESSING_THOUGHTS...</div>
          </div>
        )}
      </div>
      <div className="legal-chat-input-wrap">
        <input 
          className="legal-chat-input" 
          placeholder="ASK ME ANYTHING..." 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="legal-chat-send" onClick={handleSend} disabled={loading}>
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};

export default LegalChat;
