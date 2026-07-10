import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Upload, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  Phone, 
  Mail, 
  MessageSquare, 
  Lock,
  Eye,
  EyeOff,
  Search,
  FileText,
  User,
  LogOut
} from 'lucide-react';
import './SilentJustice.css';

const SilentJustice = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const fileInputRef = useRef(null);

  const handleLogout = async () => {
    await logout();
  };
  
  const [step, setStep] = useState('report'); // 'report', 'evaluating', 'evaluation_result', 'submitting', 'success', 'track'
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [isAuthorityMode, setIsAuthorityMode] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [trackedCase, setTrackedCase] = useState(null);
  const [evalResult, setEvalResult] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    location: '',
    description: ''
  });

  const [authorityCases, setAuthorityCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    if (isAuthorityMode) {
      setLoadingCases(true);
      fetch(`${BACKEND_URL}/silent-justice/authority/cases`)
        .then(res => res.json())
        .then(data => {
          if(data.status === 'success') {
            setAuthorityCases(data.cases || []);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingCases(false));
    }
  }, [isAuthorityMode, BACKEND_URL]);

  const updateCaseStatus = async (updateCaseId, newStatus) => {
    try {
      await fetch(`${BACKEND_URL}/silent-justice/authority/cases/${updateCaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const res = await fetch(`${BACKEND_URL}/silent-justice/authority/cases`);
      const data = await res.json();
      if(data.status === 'success') setAuthorityCases(data.cases || []);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const generateCaseId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SJ-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location || !formData.description) {
      alert("Please fill in location and description.");
      return;
    }
    if (!isAnonymous && !formData.contact) {
      alert("Contact details are required for Full Support Mode.");
      return;
    }
    setStep('evaluating');
    
    try {
      const evalRes = await fetch(`${BACKEND_URL}/silent-justice/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: formData.description,
          location: formData.location,
          evidence_list: files.map(f => f.name)
        })
      });
      if (!evalRes.ok) throw new Error('Evaluation failed');
      const data = await evalRes.json();
      setEvalResult(data);
      setStep('evaluation_result');
    } catch (err) {
      console.error(err);
      // Fallback to direct submission if evaluation fails
      handleProceed();
    }
  };

  const handleProceed = async () => {
    setStep('submitting');
    
    try {
      const reportRes = await fetch(`${BACKEND_URL}/silent-justice/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isAnonymous })
      });
      if (!reportRes.ok) throw new Error('Report submission failed');
      
      const reportData = await reportRes.json();
      const newId = reportData.case_id;
      setCaseId(newId);

      // Upload evidence
      for (const file of files) {
        const fileData = new FormData();
        fileData.append('file', file);
        await fetch(`${BACKEND_URL}/silent-justice/evidence/${newId}`, {
          method: 'POST',
          body: fileData
        });
      }

      setStep('success');
    } catch (error) {
      console.error(error);
      alert('Error submitting report. Please try again safely.');
      setStep('report');
    }
  };

  const handleTrack = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/silent-justice/track/${trackingId}`);
      if (!res.ok) {
        alert('Case ID not found. Please check and try again.');
        return;
      }
      const data = await res.json();
      setTrackedCase(data.case);
      setCaseId(trackingId);
      setStep('track');
    } catch (error) {
      console.error(error);
      alert('Error tracking case.');
    }
  };

  const getStatusStep = (status) => {
    const statuses = ['Submitted', 'Under Review', 'Contacted', 'In Progress', 'Closed'];
    return statuses.indexOf(status);
  };

  if (isAuthorityMode) {
    return (
      <div className="sj-container">
        <div className="sj-background">
          <div className="sj-orb sj-orb-1"></div>
          <div className="sj-orb sj-orb-2"></div>
          <div className="sj-grid"></div>
        </div>
        
        <nav className="la-navbar">
          <div className="la-logo" onClick={() => navigate('/public-dashboard')}>
            <img src="/Logo.png" alt="Logo" />
            <span>MANDAMUS</span>
          </div>

          <div className="la-nav-capsule">
            <button 
              className="la-nav-link"
              onClick={() => navigate('/public-dashboard')}
            >
              Public Dashboard
            </button>
            <button 
              className="la-nav-link"
              onClick={() => navigate('/modern-advisor')}
            >
              Legal Advisor
            </button>
            <button 
              className="la-nav-link active"
              onClick={() => navigate('/vault')}
            >
              Silent Justice
            </button>
          </div>

          <div className="la-nav-right">
            <div className="la-user-info">
              <span className="la-user-name">{user?.displayName || 'User'}</span>
              <div className="la-avatar">
                <User size={18} />
              </div>
            </div>
            <button className="la-logout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        <main className="sj-content">
          <header className="sj-header">
            <div className="sj-badge">Verified Authority Access</div>
            <h1 className="sj-title">Assigned Reports</h1>
            <p className="sj-subtitle">Review sensitive cases and coordinate support privately.</p>
          </header>

          <div className="sj-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {loadingCases ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <ShieldAlert size={48} style={{ marginBottom: '20px', opacity: 0.5 }} />
                <h3>Secure Connection Active</h3>
                <p>Fetching encrypted reports from the vault...</p>
              </div>
            ) : authorityCases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <ShieldAlert size={48} style={{ marginBottom: '20px', opacity: 0.5 }} />
                <h3>Secure Connection Active</h3>
                <div className="sj-case-id-box" style={{ maxWidth: '400px', margin: '20px auto' }}>
                  <p style={{ fontSize: '0.9rem' }}>No new reports at this moment.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {authorityCases.map(c => (
                  <div key={c.case_id} style={{ background: '#111', border: '1px solid #333', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ color: '#d62828' }}>{c.case_id}</h3>
                      <select 
                        className="sj-select" 
                        style={{ width: 'auto', padding: '5px 10px' }}
                        value={c.status}
                        onChange={(e) => updateCaseStatus(c.case_id, e.target.value)}
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}><strong>Date:</strong> {c.date}</p>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}><strong>Anonymous:</strong> {c.isAnonymous ? 'Yes' : 'No'}</p>
                    {!c.isAnonymous && (
                      <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}><strong>Contact:</strong> {c.name} ({c.contact})</p>
                    )}
                    <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px' }}><strong>Description:</strong> {c.description}</p>
                    
                    {c.files && c.files.length > 0 && (
                      <div>
                        <strong style={{ color: '#aaa', fontSize: '0.9rem' }}>Evidence Links (S3):</strong>
                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
                          {c.files.map((f, i) => (
                            <li key={i} style={{ marginBottom: '5px', fontSize: '0.85rem' }}>
                              <a href={`#${f.s3_key}`} style={{ color: '#d62828', textDecoration: 'none' }}>
                                <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                {f.filename}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="sj-container">
      <div className="sj-background">
        <div className="sj-orb sj-orb-1"></div>
        <div className="sj-orb sj-orb-2"></div>
        <div className="sj-grid"></div>
      </div>

      <nav className="la-navbar">
        <div className="la-logo" onClick={() => navigate('/public-dashboard')}>
          <img src="/Logo.png" alt="Logo" />
          <span>MANDAMUS</span>
        </div>

        <div className="la-nav-capsule">
          <button 
            className="la-nav-link"
            onClick={() => navigate('/public-dashboard')}
          >
            Public Dashboard
          </button>
          <button 
            className="la-nav-link"
            onClick={() => navigate('/modern-advisor')}
          >
            Legal Advisor
          </button>
          <button 
            className="la-nav-link active"
            onClick={() => navigate('/vault')}
          >
            Silent Justice
          </button>
        </div>

        <div className="la-nav-right">
          <div className="la-user-info">
            <span className="la-user-name">{user?.displayName || 'User'}</span>
            <div className="la-avatar">
              <User size={18} />
            </div>
          </div>
          <button className="la-logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="sj-content">
        {step === 'evaluating' && (
          <div className="sj-card sj-success-card">
            <Search size={48} color="#d62828" style={{ marginBottom: '20px', animation: 'pulse 1.5s infinite' }} />
            <h2 className="sj-title" style={{ fontSize: '2rem' }}>Evaluating Report...</h2>
            <p className="sj-subtitle">Analyzing details to find the best authority and reviewing evidence strength.</p>
          </div>
        )}

        {step === 'evaluation_result' && evalResult && (
          <div className="sj-card sj-success-card" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
            <h2 className="sj-title" style={{ fontSize: '1.8rem', textAlign: 'center', width: '100%' }}>Case Evaluation</h2>
            <p className="sj-subtitle" style={{ textAlign: 'center', width: '100%', marginBottom: '30px' }}>
              We understand you are dealing with a difficult situation. Here is our secure assessment.
            </p>
            
            <div style={{ background: '#111', padding: '20px', borderRadius: '8px', width: '100%', marginBottom: '20px' }}>
              <h4 style={{ color: '#d62828', marginBottom: '10px' }}>Issue & Severity</h4>
              <p style={{ marginBottom: '5px' }}><strong>Type:</strong> {evalResult.case_category}</p>
              <p><strong>Severity:</strong> <span style={{ color: evalResult.severity_level === 'High' || evalResult.severity_level === 'Critical' ? '#d62828' : '#f77f00' }}>{evalResult.severity_level}</span></p>
            </div>

            <div style={{ background: '#111', padding: '20px', borderRadius: '8px', width: '100%', marginBottom: '20px' }}>
              <h4 style={{ color: '#d62828', marginBottom: '10px' }}>Extracted Details</h4>
              <p style={{ marginBottom: '5px' }}><strong>Dates:</strong> {evalResult.extracted_dates?.length ? evalResult.extracted_dates.join(', ') : 'None detected'}</p>
              <p><strong>People:</strong> {evalResult.people_involved?.length ? evalResult.people_involved.join(', ') : 'None detected'}</p>
            </div>

            <div style={{ background: '#111', padding: '20px', borderRadius: '8px', width: '100%', marginBottom: '30px' }}>
              <h4 style={{ color: '#d62828', marginBottom: '10px' }}>Evidence Feedback</h4>
              <p>{evalResult.evidence_feedback}</p>
            </div>

            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button className="sj-back-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('report')}>
                <ArrowLeft size={16} /> Add More Details
              </button>
              <button className="sj-submit-btn" style={{ flex: 2, marginTop: 0 }} onClick={handleProceed}>
                <Lock size={16} /> PROCEED & ENCRYPT
              </button>
            </div>
          </div>
        )}

        {step === 'submitting' && (
          <div className="sj-card sj-success-card">
            <ShieldAlert size={48} color="#d62828" style={{ marginBottom: '20px', animation: 'pulse 1.5s infinite' }} />
            <h2 className="sj-title" style={{ fontSize: '2rem' }}>Securing Report...</h2>
            <p className="sj-subtitle">Encrypting your evidence and routing to the vault.</p>
          </div>
        )}

        {step === 'report' && (
          <>
            <header className="sj-header">
              <div className="sj-badge">End-to-End Encrypted</div>
              <h1 className="sj-title">Silent Justice</h1>
              <p className="sj-subtitle">
                Your safety is our priority. Report sensitive issues with absolute privacy and control.
              </p>
            </header>

            <form className="sj-card" onSubmit={handleSubmit}>
              <div className="sj-form-group">
                <div 
                  className={`sj-checkbox-group ${isAnonymous ? 'active' : ''}`}
                  onClick={() => setIsAnonymous(!isAnonymous)}
                >
                  <input 
                    type="checkbox" 
                    className="sj-checkbox" 
                    checked={isAnonymous}
                    onChange={() => {}} 
                  />
                  <div className="sj-checkbox-label">
                    <span style={{ display: 'block', fontWeight: '800' }}>Anonymous Mode (Limited Help)</span>
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Hide identity, contact optional. Full Support Mode requires contact info.</span>
                  </div>
                </div>
              </div>

              {!isAnonymous && (
                <div className="sj-form-group">
                  <label className="sj-label">Full Name</label>
                  <input 
                    type="text" 
                    name="name"
                    className="sj-input" 
                    placeholder="John Doe" 
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              <div className="sj-row">
                <div className="sj-form-group">
                  <label className="sj-label">Contact Details {!isAnonymous ? '(Required)' : '(Optional)'}</label>
                  <input 
                    type="text" 
                    name="contact"
                    className="sj-input" 
                    placeholder="Phone number" 
                    required={!isAnonymous}
                    value={formData.contact}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="sj-form-group">
                  <label className="sj-label">Current Location (Required)</label>
                  <input 
                    type="text" 
                    name="location"
                    className="sj-input" 
                    placeholder="City or Area" 
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="sj-form-group">
                <label className="sj-label">Description of the Issue</label>
                <textarea 
                  name="description"
                  className="sj-textarea" 
                  placeholder="Describe the situation in detail. Include dates, locations, and involved parties if possible."
                  required
                  value={formData.description}
                  onChange={handleInputChange}
                ></textarea>
              </div>

              <div className="sj-form-group">
                <label className="sj-label">Upload Evidence (Images, Audio, Docs)</label>
                <div className="sj-upload-zone" onClick={() => fileInputRef.current.click()}>
                  <input 
                    type="file" 
                    multiple 
                    hidden 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                  />
                  <Upload className="sj-upload-icon" size={32} />
                  <div className="sj-upload-text">
                    <h4>Click to upload or drag & drop</h4>
                    <p>Files are encrypted before transmission</p>
                  </div>
                </div>
                {files.length > 0 && (
                  <div className="sj-file-list">
                    {files.map((file, index) => (
                      <div key={index} className="sj-file-item">
                        <FileText size={16} />
                        <span>{file.name}</span>
                        <X 
                          size={14} 
                          className="sj-file-remove" 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>



              <button type="submit" className="sj-submit-btn">
                <Lock size={20} />
                SECURE SUBMISSION
              </button>

              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <p style={{ color: '#555', fontSize: '0.85rem' }}>
                  Already have a case? <span 
                    style={{ color: '#d62828', cursor: 'pointer', fontWeight: '600' }}
                    onClick={() => setStep('track-input')}
                  >Track Status</span>
                </p>
              </div>
            </form>
          </>
        )}

        {step === 'track-input' && (
          <div className="sj-card sj-success-card">
            <Search size={48} color="#d62828" style={{ marginBottom: '20px' }} />
            <h2 className="sj-title" style={{ fontSize: '2rem' }}>Track Your Case</h2>
            <p className="sj-subtitle">Enter your unique Case ID to view current status and updates.</p>
            
            <div className="sj-form-group" style={{ marginTop: '40px' }}>
              <input 
                type="text" 
                className="sj-input" 
                placeholder="Enter Case ID (e.g., SJ-XXXXXXX)" 
                style={{ textAlign: 'center', fontSize: '1.2rem', textTransform: 'uppercase' }}
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
              />
            </div>
            
            <button className="sj-submit-btn" onClick={handleTrack}>
              VIEW STATUS
            </button>
            
            <button 
              className="sj-back-btn" 
              style={{ width: '100%', marginTop: '15px', justifyContent: 'center' }}
              onClick={() => setStep('report')}
            >
              Back to Report
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="sj-card sj-success-card">
            <div className="sj-success-icon">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="sj-title" style={{ fontSize: '2rem' }}>Report Secured</h2>
            
            <div className="sj-case-id-box" style={{ margin: '20px 0' }}>
              <span className="sj-case-id-label">YOUR UNIQUE CASE ID</span>
              <div className="sj-case-id-value">{caseId}</div>
            </div>

            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '30px' }}>
              <ShieldAlert size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
              Please save this ID. It is required to track your status.
            </p>

            <div style={{ background: '#111', padding: '20px', borderRadius: '12px', width: '100%', marginBottom: '30px', border: '1px solid #333' }}>
              <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '15px' }}>
                ✅ Your case has been analyzed.<br/>
                🔒 Your data is securely stored.<br/>
                📞 We recommend the following verified support channels:
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {evalResult?.support_options?.map((support, idx) => (
                  <div key={idx} style={{ background: '#222', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', color: '#fff', fontSize: '1.1rem' }}>{support.name}</div>
                      <div style={{ color: '#d62828', fontSize: '0.8rem', fontWeight: '800', marginTop: '5px', textTransform: 'uppercase' }}>{support.type}</div>
                    </div>
                    <button className="sj-submit-btn" style={{ width: 'auto', padding: '8px 16px', margin: 0, fontSize: '0.9rem' }} onClick={() => alert(`${support.contact_action}ing ${support.contact_value}...`)}>
                      {support.contact_action}
                    </button>
                  </div>
                )) || (
                  <div style={{ background: '#222', padding: '15px', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
                    Local Women's Helpline (181)
                  </div>
                )}
              </div>
            </div>

            <button className="sj-back-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStep('track')}>
              TRACK STATUS
            </button>
          </div>
        )}

        {step === 'track' && (trackedCase || caseId) && (
          <div className="sj-card">
            <h2 className="sj-title" style={{ fontSize: '2rem', textAlign: 'center' }}>Case Progress</h2>
            <div className="sj-case-id-box" style={{ padding: '20px', marginBottom: '40px' }}>
              <span className="sj-case-id-label" style={{ textAlign: 'center' }}>CASE ID: {caseId || trackingId}</span>
            </div>

            <div className="sj-status-stepper">
              {['Submitted', 'Review', 'Contact', 'Active', 'Closed'].map((label, i) => {
                const currentStatus = (trackedCase?.status || 'Submitted');
                const currentIndex = getStatusStep(currentStatus);
                const isCompleted = i < currentIndex;
                const isActive = i === currentIndex;
                
                return (
                  <div key={label} className={`sj-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="sj-step-dot">
                      {isCompleted ? <CheckCircle2 size={16} /> : i + 1}
                    </div>
                    <div className="sj-step-label">{label}</div>
                  </div>
                );
              })}
            </div>

            <div className="sj-track-section">
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1, padding: '20px', background: '#111', borderRadius: '12px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#d62828' }}>Current Status</h4>
                  <p>{trackedCase?.status || 'Submitted'}</p>
                </div>
                <div style={{ flex: 1, padding: '20px', background: '#111', borderRadius: '12px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#d62828' }}>Assigned To</h4>
                  <p>{trackedCase?.primary_connection?.name || 'Legal Aid Cell - Women\'s Wing'}</p>
                  <div style={{ fontSize: '0.75rem', color: '#d62828', fontWeight: '800', marginTop: '5px' }}>
                    {trackedCase?.primary_connection?.type || 'AUTHORITY'} • {trackedCase?.primary_connection?.status || 'Active'}
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '20px', padding: '20px', background: '#111', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '10px', color: '#d62828' }}>Latest Update</h4>
                <p style={{ color: '#888' }}>
                  {trackedCase?.status === 'Submitted' 
                    ? 'Your report has been safely received. A verified legal advisor will review your case securely and provide updates via the vault.'
                    : `Case status has been updated to: ${trackedCase?.status}. The assigned unit is reviewing your details.`
                  }
                </p>
              </div>

              {trackedCase?.evidence_analysis && trackedCase.evidence_analysis.length > 0 && (
                <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(214, 40, 40, 0.05)', border: '1px solid rgba(214, 40, 40, 0.2)', borderRadius: '12px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#d62828', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={16} /> Evidence Intelligence
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {trackedCase.evidence_analysis.map((analysis, i) => (
                      <div key={i} style={{ borderLeft: '2px solid #d62828', paddingLeft: '15px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '600', marginBottom: '5px' }}>{analysis.filename}</div>
                        <p style={{ color: '#aaa', fontSize: '0.85rem', lineHeight: '1.4' }}>{analysis.analysis}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                <button className="sj-back-btn" style={{ flex: 1, justifyContent: 'center' }}>
                  <MessageSquare size={16} /> Pause Communication
                </button>
                <button 
                  className="sj-back-btn" 
                  style={{ flex: 1, justifyContent: 'center', borderColor: 'rgba(214, 40, 40, 0.3)', color: '#d62828' }}
                  onClick={() => {
                    if(window.confirm('Are you sure you want to withdraw this report? All data will be permanently deleted.')) {
                      localStorage.removeItem(caseId || trackingId);
                      navigate('/public-dashboard');
                    }
                  }}
                >
                  Withdraw Report
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <div 
        className="sj-authority-toggle" 
        onClick={() => setIsAuthorityMode(true)}
      >
        <Lock size={14} /> Authority View
      </div>
    </div>
  );
};

export default SilentJustice;
