import React from 'react';
import './TechStack.css';

const techData = [
  { name: 'Mastra Agents', desc: 'Parallel extraction and reasoning orchestration.' },
  { name: 'Qdrant Vector DB', desc: 'Ultra-fast semantic search for precedents.' },
  { name: 'Gemini 1.5 Pro', desc: 'Advanced legal analysis and embedding generation.' },
  { name: 'Amazon Bedrock', desc: 'Secure, scalable drafting of legal documents.' },
  { name: 'Enkrypt AI', desc: 'Input/Output guardrails preventing LLM hallucinations.' },
  { name: 'ElevenLabs', desc: 'Low-latency text-to-speech for accessibility.' },
  { name: 'Firebase', desc: 'Secure authentication and persistent user state.' },
  { name: 'Hono.js', desc: 'Blazing fast Edge API avoiding serverless limits.' },
  { name: 'React.js', desc: 'High-performance interactive judge frontend.' },
  { name: 'Vercel + Render', desc: 'Split-architecture deployment for scale.' }
];

const TechStack = () => {
  return (
    <section className="tech-stack-section" id="tech-stack">
      <div className="section-padding">
        <div className="tech-header">
          <h2 className="tech-headline">Built on Enterprise-Grade AI Infrastructure</h2>
          <p className="tech-subtitle">Agentic architecture. Scalable to 25,000+ judges. Guardrails built-in.</p>
        </div>
        
        <div className="tech-grid">
          {techData.map((tech, index) => (
            <div className="tech-card" key={index}>
              <div className="tech-icon-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <h4 className="tech-name">{tech.name}</h4>
              <p className="tech-desc">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStack;
