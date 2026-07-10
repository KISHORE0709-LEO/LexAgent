import React from 'react';
import './TechStack.css';

const techData = [
  { name: 'Delta Lake', desc: 'Secure, scalable, and immutable storage for court data.' },
  { name: 'Apache Spark', desc: 'Distributed computing for large-scale legal datasets.' },
  { name: 'Spark NLP', desc: 'Medical and legal-grade natural language processing.' },
  { name: 'Sentence Transformers', desc: 'Generating embeddings for case comparisons.' },
  { name: 'Databricks Vector Search', desc: 'Ultra-fast similarity search at scale.' },
  { name: 'MLflow', desc: 'Lifecycle management for judicial AI models.' },
  { name: 'RAG Pipeline', desc: 'Retrieval Augmented Generation for drafting.' },
  { name: 'Unity Catalog', desc: 'Fine-grained governance and data access control.' },
  { name: 'React.js', desc: 'High-performance interactive judge frontend.' },
  { name: 'Tesseract OCR', desc: 'Optical character recognition for scanned records.' }
];

const TechStack = () => {
  return (
    <section className="tech-stack-section" id="tech-stack">
      <div className="section-padding">
        <div className="tech-header">
          <h2 className="tech-headline">Built on Enterprise-Grade Infrastructure</h2>
          <p className="tech-subtitle">Databricks-native. Scalable to 25,000+ judges. 55M+ records.</p>
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
