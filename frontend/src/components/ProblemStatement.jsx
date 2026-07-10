import React from 'react';
import './ProblemStatement.css';
import RevealOnScroll from './RevealOnScroll';

const ProblemStatement = () => {
  return (
    <section className="problem-section" id="problem">
      <div className="section-padding">
        <RevealOnScroll className="fade-in">
          <h3 className="section-label">THE CRISIS</h3>
          <h2 className="problem-headline">
            India's courts are overwhelmed.<br />
            Every judge handles 100+ cases with zero AI assistance.
          </h2>
        </RevealOnScroll>
        
        <div className="problem-grid">
          <RevealOnScroll className="scale-up" delay={0}>
            <div className="problem-card">
              <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <div className="card-highlight">500+ pages</div>
              <div className="card-text">per case file, read manually every single time</div>
            </div>
          </RevealOnScroll>
          
          <RevealOnScroll className="scale-up" delay={150}>
            <div className="problem-card">
              <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4"></path>
                <path d="M12 18v4"></path>
                <path d="M4.93 10.93l2.83 2.83"></path>
                <path d="M16.24 16.24l2.83 2.83"></path>
                <path d="M2 12h4"></path>
                <path d="M18 12h4"></path>
                <path d="M4.93 13.07l2.83-2.83"></path>
                <path d="M16.24 7.76l2.83-2.83"></path>
              </svg>
              <div className="card-highlight">1,80,000 cases</div>
              <div className="card-text">pending for over 30 years with no resolution</div>
            </div>
          </RevealOnScroll>
          
          <RevealOnScroll className="scale-up" delay={300}>
            <div className="problem-card">
              <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1v22"></path>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <div className="card-highlight">2%+ GDP lost</div>
              <div className="card-text">annually due to judicial delays impacting businesses</div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
};


export default ProblemStatement;
