import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Spline from '@splinetool/react-spline';
import './MandamusGuide.css';

const guideMessages = {
  // LANDING CONTEXTS
  landing: {
    title: "WELCOME_TO_MANDAMUS",
    text: "I am your judicial intelligence assistant. We are here to accelerate justice. Scroll down to see how we solve the case pendency crisis.",
    next: "Login to access the Intelligence Enclave."
  },
  login: {
    title: "SECURE_ACCESS",
    text: "Please enter your credentials. Our platform uses enterprise-grade encryption to protect sensitive legal data.",
    next: "Accessing the dashboard..."
  },
  about: {
    title: "OUR_MISSION",
    text: "Mandamus is built on the 'Judge-in-the-Loop' philosophy. We augment human legal reasoning, we don't replace it.",
    next: "Explore our Neural Architecture."
  },
  // DASHBOARD CONTEXTS
  agent: {
    title: "NEURAL_AGENT",
    text: "Welcome! Upload your case PDF here. My neural engine will distill it into a structured brief and evaluate clause risks in under 60 seconds.",
    next: "Interact with the Legal Agent."
  },
  precedent: {
    title: "PRECEDENT_FINDER",
    text: "Enter your query to scan lakhs of judgments. I'll find the Top 5 matches with semantic similarity scores for your strategy.",
    next: "Select cases to use them in your final draft."
  },
  draft: {
    title: "DRAFT_GENERATOR",
    text: "Here you build the legal document. I've enabled Forensic Versioning—every edit you make is tracked and restorable in the history enclave.",
    next: "Approve the draft to unlock the hearing scheduler."
  },
  scheduler: {
    title: "SMART_SCHEDULER",
    text: "Awaiting approval? Once approved, pick a slot. My engine ensures hearings only happen when all parties are technically ready.",
    next: "Final step: The Virtual Hearing Enclave."
  },
  virtual: {
    title: "VIRTUAL_HEARING",
    text: "Digital Courtroom active. System check: AES-256 encryption secure. Biometric verification initialized. Good luck with the session.",
    next: "The full judicial pipeline is now under your control."
  }
};

const MandamusGuide = ({ activeFeature }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState(guideMessages.landing);
  const [domReady, setDomReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDomReady(true);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/login') return;

    // Determine context based on route + activeFeature
    let context = 'landing';

    if (path === '/login') context = 'login';
    else if (path === '/about') context = 'about';
    else if (path === '/dashboard') context = activeFeature || 'agent';

    if (guideMessages[context]) {
      setMessage(guideMessages[context]);
      setIsVisible(true);
      
      const timer = setTimeout(() => setIsVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, activeFeature]);

  if (location.pathname === '/login') return null;

  const isDashboard = location.pathname === '/dashboard';

  const content = (
    <div className={`mandamus-guide-container ${isDashboard ? 'guide-inline' : ''}`}>
      {isVisible && (
        <div className="guide-bubble">
          <div className="guide-header">
            <span className="guide-title">{message.title}</span>
            <button className="guide-close" onClick={() => setIsVisible(false)}>×</button>
          </div>
          <p className="guide-text">{message.text}</p>
          <div className="guide-footer">
            <span className="guide-hint">NEXT: {message.next}</span>
          </div>
        </div>
      )}
      
      <div className="robot-wrapper" onClick={() => setIsVisible(!isVisible)}>
        <Spline 
          scene="https://prod.spline.design/rU2-Ks0SC0T5od9B/scene.splinecode" 
          onLoad={() => console.log('Robot Guide Initialized')}
        />
      </div>
    </div>
  );

  if (isDashboard && domReady) {
    const dock = document.getElementById('robot-portal-dock');
    if (dock) {
      return createPortal(content, dock);
    }
  }

  return content;
};

export default MandamusGuide;
