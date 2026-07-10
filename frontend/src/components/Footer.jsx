import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="footer-container">

        <div className="footer-grid">

          <div className="footer-brand-col">
            <div className="footer-logo">
              <img src="/Logo.png" alt="Mandamus Logo" className="footer-logo-icon" />
              <span className="footer-logo-text">MANDAMUS</span>
            </div>
            <p className="footer-desc">
              AI-powered judicial assistance platform solving the court backlog crisis. Enhancing the rule of law through technology.
            </p>
            <div className="footer-hackathon-credits">
              <span className="credit-badge">Built for Justice</span>
              <span className="credit-team">Team Kalki &middot; NMIT</span>
            </div>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Platform</h4>
            <a href="#features">Smart Summariser</a>
            <a href="#features">Precedent Finder</a>
            <a href="#features">Draft Generator</a>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Systems</h4>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Hearing Scheduler</a>
            <a href="#features">Virtual Courtroom</a>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Legal</h4>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#ethics">AI Ethics Framework</a>
          </div>

        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Mandamus. Mandamus is a decision-support tool. All judgements require mandatory human judicial review and approval. AI assists &mdash; judges decide.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
