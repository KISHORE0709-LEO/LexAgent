import React, { useEffect, useRef, useState } from 'react';
import './Metrics.css';

const Metrics = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
      }
    }, { threshold: 0.2 });

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section className="metrics-section" ref={sectionRef}>
      <div className="section-padding">
        <div className="metrics-grid">
          <div className={`metric-item ${isVisible ? 'animate-up' : ''}`} style={{ transitionDelay: '0s' }}>
            <div className="metric-number">55.8M</div>
            <div className="metric-label">Cases tracked</div>
          </div>
          <div className={`metric-item ${isVisible ? 'animate-up' : ''}`} style={{ transitionDelay: '0.2s' }}>
            <div className="metric-number">80%</div>
            <div className="metric-label">Drafting time saved</div>
          </div>
          <div className={`metric-item ${isVisible ? 'animate-up' : ''}`} style={{ transitionDelay: '0.4s' }}>
            <div className="metric-number">15s</div>
            <div className="metric-label">Precedent search time</div>
          </div>
          <div className={`metric-item ${isVisible ? 'animate-up' : ''}`} style={{ transitionDelay: '0.6s' }}>
            <div className="metric-number">324 yrs</div>
            <div className="metric-label">Backlog targeted</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Metrics;
