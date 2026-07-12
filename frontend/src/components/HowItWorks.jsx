import React from 'react';
import './HowItWorks.css';
import RevealOnScroll from './RevealOnScroll';

const HowItWorks = () => {
  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="section-padding">
        <RevealOnScroll className="fade-in">
          <div className="hiw-header">
            <h2 className="hiw-headline">How LexAgent Works</h2>
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
                <p className="step-desc">Case PDFs uploaded securely. Mastra orchestrates specialized agents for fact extraction.</p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll className="scale-up" delay={400} style={{ flex: 1 }}>
              <div className="hiw-step step-down">
                <div className="step-circle glow">2</div>
                <h4 className="step-title">Analyze</h4>
                <p className="step-desc">Qdrant vector memory instantly retrieves relevant precedents using Gemini 1.5 embeddings.</p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll className="scale-up" delay={600} style={{ flex: 1 }}>
              <div className="hiw-step step-up">
                <div className="step-circle glow">3</div>
                <h4 className="step-title">Generate</h4>
                <p className="step-desc">Amazon Bedrock drafts responses. Enkrypt AI Input/Output guards prevent hallucinations.</p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll className="scale-up" delay={800} style={{ flex: 1 }}>
              <div className="hiw-step step-down">
                <div className="step-circle glow">4</div>
                <h4 className="step-title">Review</h4>
                <p className="step-desc">Real-time SSE streaming delivers insights. The Judge reviews and edits—nothing is approved without human sign-off.</p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
