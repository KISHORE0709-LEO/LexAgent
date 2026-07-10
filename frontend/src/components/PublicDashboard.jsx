import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ShieldAlert, LogOut, User, MessageSquare, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import './PublicDashboard.css';

const PublicDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const dashboardItems = [
    {
      id: 'advisor',
      title: 'Legal Advisor',
      description: 'Get guided help, draft legal documents, and receive AI-powered counsel in plain language.',
      icon: <MessageSquare size={24} />,
      action: () => navigate('/modern-advisor'),
      color: 'var(--primary-red)',
      badge: 'AI ASSISTED'
    },
    {
      id: 'vault',
      title: 'Silent Justice',
      description: 'A highly secure, anonymous space for sensitive filings. Identity protected by zero-knowledge encryption.',
      icon: <ShieldCheck size={24} />,
      action: () => navigate('/vault'),
      color: '#ffffff',
      badge: 'SECURE VAULT',
      variant: 'dark'
    }
  ];

  return (
    <div className="public-dashboard">
      <div className="pd-background">
        <div className="pd-orb pd-orb-1"></div>
        <div className="pd-orb pd-orb-2"></div>
        <div className="pd-grid"></div>
      </div>

      <nav className="pd-navbar">
        <div className="pd-logo" onClick={() => navigate('/')}>
          <img src="/Logo.png" alt="Logo" />
          <span>MANDAMUS</span>
        </div>
        <div className="pd-nav-right">
          <div className="pd-user-info">
            <span className="pd-user-name">{user?.displayName || 'Public User'}</span>
            <div className="pd-avatar">
              <User size={18} />
            </div>
          </div>
          <button className="pd-logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="pd-content">
        <header className="pd-header">
          <div className="pd-status-badge">
            <Scale size={14} />
            SECURE ACCESS GRANTED
          </div>
          <h1 className="pd-title">Universal Legal Access</h1>
          <p className="pd-subtitle">
            Welcome to your secure judicial workspace. Choose a module below to begin your legal journey.
          </p>
        </header>

        <div className="pd-cards-container">
          {dashboardItems.map((item) => (
            <div 
              key={item.id} 
              className={`pd-card ${item.variant === 'dark' ? 'pd-card-dark' : ''}`}
              onClick={item.action}
            >
              <div className="pd-card-badge">{item.badge}</div>
              <div className="pd-card-icon-wrapper" style={{ color: item.color }}>
                {item.icon}
              </div>
              <div className="pd-card-body">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <button className="pd-card-btn">
                ENTER MODULE
                <ShieldAlert size={16} />
              </button>
              <div className="pd-card-glow"></div>
            </div>
          ))}
        </div>
      </main>

      <footer className="pd-footer">
        <p>&copy; 2026 MANDAMUS Judicial Framework. All rights reserved.</p>
        <div className="pd-footer-links">
          <span>Privacy Protocol</span>
          <span>Security Whitepaper</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicDashboard;
