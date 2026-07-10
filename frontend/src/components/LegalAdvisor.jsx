import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { 
  Send, 
  Paperclip, 
  Search, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Download, 
  FileText, 
  ArrowRight,
  User,
  Bot,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  LogOut
} from 'lucide-react';
import './LegalAdvisor.css';

const LegalAdvisor = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [input, setInput] = useState('');
  const [activeModule, setActiveModule] = useState('advisor');
  const scrollRef = useRef(null);

  const handleLogout = async () => {
    await logout();
  };

  const [messages, setMessages] = useState([
    {
      role: 'user',
      content: 'My landlord in Bandra is refusing to return my security deposit of ₹1,50,000 even though the lease ended 15 days ago and there were no damages. He isn\'t answering my calls now. What can I do?',
      time: '14:02 PM'
    },
    {
      role: 'assistant',
      time: '14:03 PM',
      isAnalysis: true,
      caseId: '#4409-TX',
      laws: [
        { name: 'Maharashtra Rent Control Act, 1999', highlighted: true },
        { name: 'Model Tenancy Act', highlighted: true }
      ],
      rights: [
        'Right to full refund if no damages are documented.',
        'Right to a detailed invoice for any deductions made.',
        'Right to interest on delayed payments (depending on specific clauses).'
      ],
      steps: [
        { title: 'Legal Notice', content: 'Send a formal legal notice through a registered advocate. This is a mandatory precursor to most litigation.' },
        { title: 'Rent Authority', content: 'If the notice is ignored, file a petition with the Rent Authority/Rent Court under Section 21 of the Model Tenancy Act.' },
        { title: 'Small Causes Court', content: 'In Mumbai, specific deposit disputes can be escalated to the Court of Small Causes.' }
      ]
    }
  ]);

  const recentInquiries = [
    { title: 'Wrongful Termination', time: '2 DAYS AGO' },
    { title: 'Cyber Defamation Case', time: '1 WEEK AGO' }
  ];

  const commonTopics = [
    'Filing an FIR',
    'Property Disputes',
    'Consumer Rights',
    'Family Court Law'
  ];

  const documentChecklist = [
    { name: 'Original Lease Agreement', checked: true },
    { name: 'Security Deposit Receipt', checked: true },
    { name: 'Notice Period Communication', checked: false },
    { name: 'Move-out Inspection Report', checked: false },
    { name: 'Electricity Bill (Final)', checked: false }
  ];

  return (
    <div className="legal-advisor-page">
      {/* Background */}
      <div className="la-background">
        <div className="la-orb la-orb-1"></div>
        <div className="la-orb la-orb-2"></div>
        <div className="la-grid"></div>
      </div>

      {/* Navbar */}
      <nav className="la-navbar">
        <div className="la-logo" onClick={() => navigate('/public-dashboard')}>
          <img src="/Logo.png" alt="Logo" />
          <span>MANDAMUS</span>
        </div>

        <div className="la-nav-capsule">
          <button 
            className="la-nav-link"
            onClick={() => navigate('/public-dashboard')}
          >
            Public Dashboard
          </button>
          <button 
            className={`la-nav-link ${activeModule === 'advisor' ? 'active' : ''}`}
            onClick={() => navigate('/modern-advisor')}
          >
            Legal Advisor
          </button>
          <button 
            className={`la-nav-link ${activeModule === 'vault' ? 'active' : ''}`}
            onClick={() => navigate('/vault')}
          >
            Silent Justice
          </button>
        </div>

        <div className="la-nav-right">
          <div className="la-user-info">
            <span className="la-user-name">{user?.displayName || 'User'}</span>
            <div className="la-avatar">
              <User size={18} />
            </div>
          </div>
          <button className="la-logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <div className="la-container">
        {/* Left Sidebar */}
        <aside className="la-sidebar-left">
          <div className="la-section">
            <div className="la-section-header">
              <Clock size={16} />
              <h3>Recent Inquiries</h3>
            </div>
            <div className="la-inquiry-list">
              {recentInquiries.map((item, i) => (
                <div key={i} className={`la-inquiry-card ${i === 0 ? 'active' : ''}`}>
                  <h4>{item.title}</h4>
                  <span>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="la-section">
            <div className="la-section-header">
              <Activity size={16} />
              <h3>Common Topics</h3>
            </div>
            <div className="la-topics-list">
              {commonTopics.map((topic, i) => (
                <div key={i} className={`la-topic-item ${topic === 'Property Disputes' ? 'active' : ''}`}>
                  <span>{topic}</span>
                  {topic === 'Property Disputes' && <ArrowRight size={14} />}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="la-main-chat">
          <header className="la-chat-header">
            <div className="la-bot-info">
              <div className="la-bot-text">
                <h3>Nyaya AI Counsel</h3>
                <div className="la-bot-status">
                  <span className="status-dot"></span>
                  SYSTEM: ACTIVE • JURISDICTION: MUMBAI
                </div>
              </div>
            </div>
            <button className="la-export-btn">
              <Download size={14} />
              EXPORT TRANSCRIPT
            </button>
          </header>

          <div className="la-chat-content">
            <div className="la-chat-messages" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`la-msg-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                  {msg.role === 'user' ? (
                    <div className="la-user-msg">
                      <p>{msg.content}</p>
                      <span className="la-msg-time">{msg.time}</span>
                    </div>
                  ) : (
                    <div className="la-assistant-analysis">
                      <div className="la-analysis-header">
                        <Zap size={14} />
                        LEGAL ANALYSIS: CASE ID {msg.caseId}
                      </div>
                      
                      <div className="la-analysis-section">
                        <h4>Applicable Laws</h4>
                        <p>
                          Under the <span className="highlight">Maharashtra Rent Control Act, 1999</span> and 
                          the <span className="highlight">Model Tenancy Act</span>, a landlord is legally obligated to 
                          refund the security deposit within one month of the tenant vacating the premises, after making any legitimate 
                          deductions for repairs or unpaid dues.
                        </p>
                      </div>

                      <div className="la-analysis-section">
                        <h4>Your Rights</h4>
                        <ul className="la-rights-list">
                          {msg.rights.map((right, ri) => (
                            <li key={ri}>
                              <CheckCircle2 size={14} />
                              {right}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="la-analysis-section la-steps-section">
                        <h4>Step-by-Step Procedure</h4>
                        <div className="la-steps-list">
                          {msg.steps.map((step, si) => (
                            <div key={si} className="la-step-item">
                              <div className="la-step-number">{si + 1}</div>
                              <div className="la-step-content">
                                <strong>{step.title}:</strong> {step.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <span className="la-msg-time">{msg.time}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Spline Robot */}
            <div className="la-spline-robot">
              <iframe 
                src='https://my.spline.design/untitled-48c1a66136f37f8f3eb7e2dfc88c1e0e/' 
                frameBorder='0' 
                width='100%' 
                height='100%'
                title="AI Assistant"
              />
            </div>
          </div>

          <div className="la-chat-input-container">
            <div className="la-input-wrapper">
              <input 
                type="text" 
                placeholder="Describe your situation or ask a follow-up question..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <div className="la-input-actions">
                <button className="la-attach-btn"><Paperclip size={18} /></button>
                <button className="la-send-btn"><Send size={18} /></button>
              </div>
            </div>
            <div className="la-quick-actions">
              <button className="la-qa-btn">Draft Legal Notice</button>
              <button className="la-qa-btn">Download Reference Acts</button>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="la-sidebar-right">
          <div className="la-section">
            <div className="la-section-header">
              <FileText size={16} />
              <h3>Checklist</h3>
              <span className="la-badge">2/5 Ready</span>
            </div>
            <p className="la-section-desc">Documents required for Rent Tribunal filing:</p>
            <div className="la-checklist">
              {documentChecklist.map((item, i) => (
                <div key={i} className={`la-check-item ${item.checked ? 'checked' : ''}`}>
                  <div className="la-checkbox">
                    {item.checked && <CheckCircle2 size={12} />}
                  </div>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="la-section">
            <div className="la-section-header">
              <MapPin size={16} />
              <h3>Find Jurisdiction</h3>
            </div>
            <div className="la-search-box">
              <MapPin size={14} />
              <input type="text" defaultValue="Bandra West, Mumbai" />
            </div>
            <div className="la-venue-card">
              <span className="la-venue-tag">PRIMARY VENUE</span>
              <h4>Small Causes Court, Bandra</h4>
              <p>Court No. 12, Floor 3</p>
            </div>
          </div>

          <div className="la-section">
            <div className="la-live-feed">
              <div className="la-feed-thumb">
                <div className="la-feed-overlay">
                  <div className="la-live-indicator">
                    <span className="dot"></span>
                    LIVE DISTRICT FEED
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LegalAdvisor;
