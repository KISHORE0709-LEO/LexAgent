import React from 'react';
import './HowItWorks.css';
import RevealOnScroll from './RevealOnScroll';

const HowItWorks = () => {
  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="section-padding">
        <RevealOnScroll className="fade-in">
          <div className="hiw-header">
            <h2 className="hiw-headline">How Mandamus Works</h2>
            <p className="hiw-subtitle">Four stages. From raw case data to judge-approved output.</p>
          </div>
        </RevealOnScroll>

        <div className="hiw-flow-container">
          {/* Animated Glowing Wave Background */}
          <RevealOnScroll className="fade-in" delay={100}>
            <svg className="hiw-animated-wave" preserveAspectRatio="none" viewBox="0 0 1000 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 100C150 100 250 20 500 20C750 20 850 180 1000 180" stroke="rgba(214, 40, 40, 0.4)" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 10" className="wave-dashed" />
              <path d="M0 100C150 100 250 20 500 20C750 20 850 180 1000 180" stroke="url(#paint0_linear)" strokeWidth="8" strokeLinecap="round" className="wave-solid" />
              <defs>
                <linearGradient id="paint0_linear" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="transparent" offset="0%" />
                  <stop stopColor="var(--primary-red)" offset="50%" />
                  <stop stopColor="transparent" offset="100%" />
                </linearGradient>
              </defs>
            </svg>
          </RevealOnScroll>

          <div className="hiw-flow">
            <RevealOnScroll className="scale-up" delay={200} style={{ flex: 1 }}>
              <div className="hiw-step step-up">
                <div className="step-circle glow">1</div>
                <h4 className="step-title">Ingest</h4>
                <p className="step-desc">Case files ingested via Auto Loader into Delta Lake. OCR converts scanned PDFs.</p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll className="scale-up" delay={400} style={{ flex: 1 }}>
              <div className="hiw-step step-down">
                <div className="step-circle glow">2</div>
                <h4 className="step-title">Analyse</h4>
                <p className="step-desc">NLP summarises documents. Vector embeddings retrieve similar precedents.</p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll className="scale-up" delay={600} style={{ flex: 1 }}>
              <div className="hiw-step step-up">
                <div className="step-circle glow">3</div>
                <h4 className="step-title">Generate</h4>
                <p className="step-desc">RAG pipeline produces structured draft with confidence score and citations.</p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll className="scale-up" delay={800} style={{ flex: 1 }}>
              <div className="hiw-step step-down">
                <div className="step-circle glow">4</div>
                <h4 className="step-title">Review</h4>
                <p className="step-desc">Judge reviews, edits, approves. Immutable audit trail logged. Nothing approved without human sign-off.</p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
