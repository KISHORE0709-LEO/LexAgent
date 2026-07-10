import React from 'react';
import './Features.css';
import RevealOnScroll from './RevealOnScroll';

const Features = () => {
  return (
    <section className="features-section" id="features">
      <RevealOnScroll className="fade-in" delay={100}>
        <div className="features-header">
          <div className="section-label">PLATFORM FEATURES</div>
          <h2 className="features-headline">Five Systems. One Mission.</h2>
          <p className="features-subtitle">Every feature is built to reduce judge workload while keeping the judge fully in control.</p>
        </div>
      </RevealOnScroll>

      <div className="features-container">
        {/* Feature 1 */}
        <div className="feature-block">
          <RevealOnScroll className="slide-left" style={{ flex: 1 }}>
            <div className="feature-content fade-in visible">
              <div className="feature-tag">FEATURE 01</div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 className="feature-title">Smart Case Summariser</h3>
              <p className="feature-desc">
                500 pages of case documents &mdash; charge sheets, FIRs, witness statements &mdash; 
                condensed into a clean 1-page brief in under 60 seconds. Powered by OCR + BART/Pegasus NLP models. 
                Judges arrive at hearings fully prepared.
              </p>
            </div>
          </RevealOnScroll>
          
          <RevealOnScroll className="slide-right" style={{ flex: 1 }} delay={200}>
            <div className="feature-visual fade-in visible">
              <div className="mockup-card">
                <div className="mockup-header">
                  <span className="case-id">Case #2024-CR-4871</span>
                  <span className="badge-green">Summary Ready</span>
                </div>
                <div className="mockup-progress">
                  <span className="progress-text">Summarising...</span>
                  <div className="progress-bar"><div className="progress-fill" style={{width: '100%'}}></div></div>
                </div>
                <div className="mockup-body">
                  <div className="field-group">
                    <div className="field-label">Parties:</div>
                    <div className="field-placeholder medium"></div>
                  </div>
                  <div className="field-group">
                    <div className="field-label">Key Facts:</div>
                    <div className="field-placeholder long"></div>
                    <div className="field-placeholder long"></div>
                    <div className="field-placeholder short"></div>
                  </div>
                  <div className="field-group">
                    <div className="field-label">Legal Questions:</div>
                    <div className="field-placeholder medium"></div>
                    <div className="field-placeholder short"></div>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Feature 2 */}
        <div className="feature-block reverse">
          <RevealOnScroll className="slide-right" style={{ flex: 1 }}>
            <div className="feature-content fade-in visible">
              <div className="feature-tag">FEATURE 02</div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              <h3 className="feature-title">Intelligent Precedent Finder</h3>
              <p className="feature-desc">
                Semantic vector search across lakhs of Indian judgements using Sentence Transformers. 
                Surfaces the top 5 most relevant past cases in under 15 seconds &mdash; with similarity scores 
                and outcome summaries.
              </p>
            </div>
          </RevealOnScroll>
          
          <RevealOnScroll className="slide-left" style={{ flex: 1 }} delay={200}>
            <div className="feature-visual fade-in visible">
              <div className="mockup-list">
                <div className="mockup-list-item">
                  <div className="mockup-list-left">
                    <span className="case-name">State vs. Sharma (2018)</span>
                    <span className="similarity-score">94% match</span>
                  </div>
                  <span className="pill-convicted">Convicted</span>
                </div>
                <div className="mockup-list-item">
                  <div className="mockup-list-left">
                    <span className="case-name">Rao vs. Union of India (2012)</span>
                    <span className="similarity-score">89% match</span>
                  </div>
                  <span className="pill-acquitted">Acquitted</span>
                </div>
                <div className="mockup-list-item">
                  <div className="mockup-list-left">
                    <span className="case-name">Gupta Properties C.A. (2021)</span>
                    <span className="similarity-score">82% match</span>
                  </div>
                  <span className="pill-convicted">Convicted</span>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Feature 3 */}
        <div className="feature-block">
          <RevealOnScroll className="slide-left" style={{ flex: 1 }}>
            <div className="feature-content fade-in visible">
              <div className="feature-tag">FEATURE 03</div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <h3 className="feature-title">Judgement Draft Generator</h3>
              <p className="feature-desc">
                RAG pipeline combines the case summary, retrieved precedents, and IPC/CrPC sections 
                to generate a fully structured judgement draft. Facts &rarr; Arguments &rarr; Legal Analysis &rarr; Order. 
                Drafting time reduced by 80%. Every AI reasoning step is logged and visible.
              </p>
            </div>
          </RevealOnScroll>
          
          <RevealOnScroll className="slide-right" style={{ flex: 1 }} delay={200}>
            <div className="feature-visual fade-in visible">
              <div className="mockup-editor">
                <div className="editor-banner">AI Draft &mdash; Pending Judge Review</div>
                <div className="editor-content">
                  <div className="editor-section">I. FACTS OF THE CASE</div>
                  <div className="editor-lines">
                    <div className="editor-line"></div>
                    <div className="editor-line medium"></div>
                  </div>
                  <div className="editor-section">II. ARGUMENTS</div>
                  <div className="editor-lines">
                    <div className="editor-line"></div>
                    <div className="editor-line long"></div>
                    <div className="editor-line short"></div>
                  </div>
                  <div className="editor-section">III. LEGAL ANALYSIS</div>
                  <div className="editor-lines">
                    <div className="editor-line"></div>
                    <div className="editor-line short"></div>
                  </div>
                  <div className="editor-section">IV. ORDER</div>
                  <div className="editor-lines">
                    <div className="editor-line"></div>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Feature 4 */}
        <div className="feature-block reverse">
          <RevealOnScroll className="slide-right" style={{ flex: 1 }}>
            <div className="feature-content fade-in visible">
              <div className="feature-tag">FEATURE 04</div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <h3 className="feature-title">Smart Hearing Scheduler</h3>
              <p className="feature-desc">
                Analyses case readiness using NJDG data. Checks document completeness, party notifications, 
                and pending requirements. Schedules hearings only when a case is 100% ready. 
                Eliminates unnecessary adjournments automatically.
              </p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll className="slide-left" style={{ flex: 1 }} delay={200}>
            <div className="feature-visual fade-in visible">
              <div className="mockup-calendar">
                <div className="calendar-dates">
                  <div className="calendar-date not-ready">
                    <span className="c-date">12 Oct</span>
                    <span className="c-status">NOT READY</span>
                  </div>
                  <div className="calendar-date ready">
                    <span className="c-date">21 Nov</span>
                    <span className="c-status">SCHEDULED ✓</span>
                  </div>
                </div>
                <div className="calendar-checklist">
                  <div className="checklist-item checked">✓ Documents filed</div>
                  <div className="checklist-item checked">✓ Parties notified</div>
                  <div className="checklist-item pending">✗ Advocate confirmation pending</div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Feature 5 */}
        <div className="feature-block">
          <RevealOnScroll className="slide-left" style={{ flex: 1 }}>
            <div className="feature-content fade-in visible">
              <div className="feature-tag">FEATURE 05</div>
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              <h3 className="feature-title">Secure Virtual Hearing + Biometric Verification</h3>
              <p className="feature-desc">
                Full virtual courtroom with facial recognition and voice biometric verification before entry. 
                AI liveness detection prevents spoofing. WebRTC-powered secure video. 
                All session logs stored immutably in Delta Lake.
              </p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll className="slide-right" style={{ flex: 1 }} delay={200}>
            <div className="feature-visual fade-in visible">
              <div className="mockup-video-grid">
                <div className="video-tiles">
                  <div className="video-tile">
                    <div className="video-badge verified">VERIFIED ✓</div>
                    <div className="video-placeholder">Judge</div>
                  </div>
                  <div className="video-tile">
                    <div className="video-badge verified">VERIFIED ✓</div>
                    <div className="video-placeholder">Counsel A</div>
                  </div>
                  <div className="video-tile">
                    <div className="video-badge verifying"><div className="spinner"></div>Verifying...</div>
                    <div className="video-placeholder">Counsel B</div>
                  </div>
                  <div className="video-tile">
                    <div className="video-badge verified">VERIFIED ✓</div>
                    <div className="video-placeholder">Witness</div>
                  </div>
                </div>
                <div className="video-footer">Session Secured &middot; AES-256 Encrypted</div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

      </div>
    </section>
  );
};

export default Features;
