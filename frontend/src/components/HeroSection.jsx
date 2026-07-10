import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroSection.css';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-tag">JUDICIAL AI PLATFORM</div>
          <h1 className="hero-headline">
            Justice Delayed<br />
            Is Justice Denied.
          </h1>
          <p className="hero-subheadline">
            Mandamus gives judges the tools to change that &mdash; today.
          </p>
          <div className="hero-cta-group">
            <button 
              className="btn-primary" 
              style={{ borderRadius: '24px' }}
              onClick={() => navigate('/login')}
            >
              Explore the Platform
            </button>
            <button 
              className="btn-transparent" 
              style={{ borderRadius: '24px' }}
              onClick={() => navigate('/how-it-works')}
            >
              See How It Works
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

