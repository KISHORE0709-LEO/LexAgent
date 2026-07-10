import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  Gavel, 
  FileText, 
  ShieldAlert, 
  Users, 
  Activity, 
  Clock, 
  Plus, 
  Briefcase,
  Trash2,
  ChevronRight,
  Bell,
  CheckCircle2,
  RefreshCw,
  LayoutDashboard,
  Eye,
  UserPlus,
  AlertCircle,
  SkipForward,
  Cpu,
  Binary,
  CloudLightning,
  Sparkles,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); 
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  
  // Data State
  const [cases, setCases] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({
    totalCases: 0, pendingCases: 0, activeJudges: 0, activeLawyers: 0
  });

  // Quick View State
  const [quickView, setQuickView] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '', type: 'criminal', petitioner: '', respondent: '',
    filedDate: new Date().toISOString().split('T')[0],
    hearingDate: '', undertrial: false, priority: 'Medium', file: null
  });
  const [extractedData, setExtractedData] = useState({ text: '', method: '', metadata: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStage, setSubmittingStage] = useState(''); 
  const [formMessage, setFormMessage] = useState('');
  const [showCorsAlert, setShowCorsAlert] = useState(false);

  // Assignment Logic State
  const [assigningCase, setAssigningCase] = useState(null);
  const [assignmentData, setAssignmentData] = useState({
    judge: '', petitionerLawyer: '', respondentLawyer: ''
  });

  // 1. Real-time Listeners
  useEffect(() => {
    setIsLoading(true);
    const unsubscribeCases = onSnapshot(query(collection(db, 'cases'), orderBy('createdAt', 'desc')), (snapshot) => {
      const casesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCases(casesList);
      setStats(prev => ({
        ...prev,
        totalCases: casesList.length,
        pendingCases: casesList.filter(c => (c.status || '').toLowerCase() === 'unassigned').length
      }));
      setLastSync(new Date());
      setIsLoading(false);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersList);
      setStats(prev => ({
        ...prev,
        activeJudges: usersList.filter(u => u.role === 'judge').length,
        activeLawyers: usersList.filter(u => u.role === 'lawyer').length
      }));
      setLastSync(new Date());
    });

    return () => {
      unsubscribeCases();
      unsubscribeUsers();
    };
  }, []);

  // 2. Dynamic Analytics
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = months.map(m => ({ name: m, cases: 0 }));
    cases.forEach(c => {
      if (c.createdAt) {
        try {
          const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
          if (date && !isNaN(date.getTime())) counts[date.getMonth()].cases += 1;
        } catch(e) {}
      }
    });
    return counts;
  }, [cases]);

  const pieData = useMemo(() => [
    { name: 'Criminal', value: cases.filter(c => (c.type || '').toLowerCase() === 'criminal').length || 0 },
    { name: 'Civil', value: cases.filter(c => (c.type || '').toLowerCase() === 'civil').length || 0 },
  ], [cases]);

  const COLORS = ['#e02020', '#333'];

  // 3. Logic Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : (type === 'file' ? files[0] : value) }));
  };

  const handleAiAutoFill = async () => {
    if (!formData.file) {
      setFormMessage('Please upload a PDF for AI analysis first.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmittingStage('AI ANALYZING DOCUMENT...');
    
    try {
      const ocrFormData = new FormData();
      ocrFormData.append('file', formData.file);
      ocrFormData.append('user_id', user?.uid || 'admin');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/extract-text`, {
        method: 'POST',
        body: ocrFormData
      });
      
      const result = await response.json();
      if (result.status === 'success' || result.status === 'partial_success') {
        const meta = result.metadata;
        setFormData(prev => ({
          ...prev,
          title: meta.title || prev.title,
          petitioner: meta.petitioner || prev.petitioner,
          respondent: meta.respondent || prev.respondent,
          type: meta.type || prev.type
        }));
        setExtractedData({
          text: result.text,
          method: result.method,
          metadata: meta
        });
        setFormMessage('Neural auto-fill complete.');
      } else {
        setFormMessage('AI extraction failed. Manual entry required.');
      }
    } catch (err) {
      setFormMessage('Connection to AI Enclave failed.');
    } finally {
      setIsSubmitting(false);
      setSubmittingStage('');
    }
  };

  const generateStructuredCaseText = (data, extData) => {
    const header = `IN THE HIGH COURT OF JUDICATURE
CASE TITLE: ${(data.title || "Untitled").toUpperCase()}
PETITIONER: ${(data.petitioner || "Unknown").toUpperCase()}
RESPONDENT: ${(data.respondent || "Unknown").toUpperCase()}
CASE TYPE: ${(data.type || "criminal").toUpperCase()}
PRIORITY: ${(data.priority || "Medium").toUpperCase()} ${data.undertrial ? '(UNDERTRIAL)' : ''}

1. BRIEF FACTS OF THE CASE:
   The present matter concerns allegations raised against the respondent and is submitted before this Hon’ble Court for judicial review. Record filed on ${data.filedDate}.

2. PROCEDURAL HISTORY:
   The matter was filed before the competent judicial authority and preliminary proceedings have commenced. Jurisdiction established under ${data.type} law protocols.

3. GROUNDS:
   a) Judicial examination required regarding the specific circumstances of the filing.
   b) Documentary evidence submitted to the central judicial archive.
   c) Relief sought under applicable legal provisions as specified in the neural brief.

4. PRAYER:
   The petitioner respectfully requests judicial intervention and appropriate legal remedies. Hearing target set for ${data.hearingDate || 'TBD'}.

--------------------------------------------------
NEURAL EXTRACTION LOGS (Method: ${extData.method || "Manual Sync"}):
--------------------------------------------------
${extData.text || "[No searchable text layers found. Verify document integrity.]"}

[SYSTEM GENERATED DOCUMENT - MANDAMUS PROTOCOL V4.1]`;
    return header;
  };

  const handleRegistrationSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setFormMessage('');
    setShowCorsAlert(false);

    let fileUrl = '';
    let docArray = [];
    
    // STEP 1: Sync to Cloud Storage (with CORS fail-safe)
    if (formData.file) {
      setSubmittingStage('SYNCING TO CLOUD ENCLAVE...');
      try {
        const fileRef = ref(storage, `case_documents/${Date.now()}_${formData.file.name}`);
        const uploadPromise = uploadBytes(fileRef, formData.file).then(async (snap) => {
          return await getDownloadURL(snap.ref);
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("CORS_TIMEOUT")), 8000)
        );

        fileUrl = await Promise.race([uploadPromise, timeoutPromise]);
        if (fileUrl) {
          docArray.push({ name: formData.file.name, url: fileUrl, type: 'pdf', timestamp: new Date().toISOString() });
        } else {
          docArray.push({ name: formData.file.name, url: "PENDING_HANDSHAKE", type: 'pdf', timestamp: new Date().toISOString() });
        }
      } catch (err) {
        setShowCorsAlert(true);
        docArray.push({ name: formData.file.name, url: "PENDING_HANDSHAKE", type: 'pdf', timestamp: new Date().toISOString() });
      }
    }

    // STEP 2: Finalize Record
    setSubmittingStage('FINALIZING JUDICIAL RECORD...');
    try {
      const caseText = generateStructuredCaseText(formData, extractedData);
      const caseData = {
        title: formData.title || "Untitled Case",
        type: formData.type || "civil",
        petitioner: formData.petitioner || "Unknown",
        respondent: formData.respondent || "Unknown",
        filedDate: formData.filedDate || new Date().toISOString().split('T')[0],
        hearingDate: formData.hearingDate || "",
        undertrial: formData.undertrial || false,
        priority: formData.priority || "Medium",
        
        documentUrl: fileUrl || "PENDING_HANDSHAKE",
        documents: docArray,
        case_text: caseText,
        
        status: "unassigned",
        pipeline_stage: "summarise",
        
        assigned_judge_email: "",
        assigned_judge_name: "",
        petitioner_lawyer_email: "",
        petitioner_lawyer_name: "",
        respondent_lawyer_email: "",
        respondent_lawyer_name: "",
        
        createdAt: serverTimestamp(),
        createdBy: user?.email || 'admin'
      };

      await addDoc(collection(db, 'cases'), caseData);
      setFormMessage('Judicial Record Established Successfully.');
      
      setFormData({
        title: '', type: 'criminal', petitioner: '', respondent: '',
        filedDate: new Date().toISOString().split('T')[0],
        hearingDate: '', undertrial: false, priority: 'Medium', file: null
      });
      setExtractedData({ text: '', method: '', metadata: null });
    } catch (error) {
      setFormMessage('Handshake failure. Retrying...');
    } finally {
      setIsSubmitting(false);
      setSubmittingStage('');
    }
  };

  const handleAssignmentUpdate = async (caseId) => {
    try {
      const j = allUsers.find(u => u.email === assignmentData.judge);
      const pl = allUsers.find(u => u.email === assignmentData.petitionerLawyer);
      const rl = allUsers.find(u => u.email === assignmentData.respondentLawyer);

      await updateDoc(doc(db, 'cases', caseId), {
        assigned_judge_email: j?.email || "",
        assigned_judge_name: j?.displayName || j?.email || "",
        petitioner_lawyer_email: pl?.email || "",
        petitioner_lawyer_name: pl?.displayName || pl?.email || "",
        respondent_lawyer_email: rl?.email || "",
        respondent_lawyer_name: rl?.displayName || rl?.email || "",
        status: "assigned"
      });
      setAssigningCase(null);
    } catch (e) { console.error(e); }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      const u = allUsers.find(x => x.id === userId);
      if (u?.email) await updateDoc(doc(db, 'users_by_email', u.email.toLowerCase()), { role: newRole });
    } catch (e) { console.error(e); }
  };

  const deleteCase = async (id) => { if (window.confirm("Purge record from enclave?")) await deleteDoc(doc(db, 'cases', id)); };

  const renderQuickView = () => {
    if (!quickView) return null;
    let data = [];
    let title = "";
    if (quickView === 'cases') { data = cases.slice(0, 5); title = "Recent Active Docket"; }
    else if (quickView === 'pending') { data = cases.filter(c => c.status === 'unassigned').slice(0, 5); title = "Awaiting Assignment"; }
    else if (quickView === 'judges') { data = allUsers.filter(u => u.role === 'judge'); title = "Authorized Judges"; }
    else if (quickView === 'lawyers') { data = allUsers.filter(u => u.role === 'lawyer'); title = "Legal Counsel"; }

    return (
      <div className="quick-view-section glass-card view-fade">
        <div className="quick-view-header">
          <h3><Eye size={18} /> {title}</h3>
          <button onClick={() => setQuickView(null)} className="close-qv">CLOSE</button>
        </div>
        <table className="qv-table">
          <thead>
            {quickView.includes('cases') || quickView === 'pending' ? (
              <tr><th>Case Title</th><th>Priority</th><th>Status</th></tr>
            ) : (
              <tr><th>Official Name</th><th>Email Access</th></tr>
            )}
          </thead>
          <tbody>
            {data.length === 0 ? <tr><td colSpan="3">No records in enclave.</td></tr> : data.map((item, idx) => (
              <tr key={idx}>
                {quickView.includes('cases') || quickView === 'pending' ? (
                  <>
                    <td>{item.title}</td>
                    <td><span className={`badge ${(item.priority || 'Medium').toLowerCase()}`}>{item.priority}</span></td>
                    <td><span className="stage-chip">{item.status}</span></td>
                  </>
                ) : (
                  <>
                    <td>{item.displayName || 'Official'}</td>
                    <td>{item.email}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return (
          <div className="view-fade">
            <div className="view-header">
              <h1>Judicial Command Center <span className="version-tag">v4.1</span></h1>
              <div className="header-meta">
                <div className="pulse-indicator"></div>
                LIVE SYNC: {lastSync.toLocaleTimeString()} | ENCRYPTED SESSION
              </div>
            </div>
            <div className="stats-grid">
              <div className={`stat-card glass-card ${quickView === 'cases' ? 'active-qv' : ''}`} onClick={() => setQuickView('cases')}>
                <div className="stat-icon"><FileText size={24} /></div>
                <div className="stat-content"><span className="stat-val">{stats.totalCases}</span><span className="stat-lbl">Total Docket</span></div>
              </div>
              <div className={`stat-card glass-card ${quickView === 'pending' ? 'active-qv' : ''}`} onClick={() => setQuickView('pending')}>
                <div className="stat-icon"><Clock size={24} /></div>
                <div className="stat-content"><span className="stat-val">{stats.pendingCases}</span><span className="stat-lbl">Unassigned</span></div>
              </div>
              <div className={`stat-card glass-card ${quickView === 'judges' ? 'active-qv' : ''}`} onClick={() => setQuickView('judges')}>
                <div className="stat-icon"><Gavel size={24} /></div>
                <div className="stat-content"><span className="stat-val">{stats.activeJudges}</span><span className="stat-lbl">Judges</span></div>
              </div>
              <div className={`stat-card glass-card ${quickView === 'lawyers' ? 'active-qv' : ''}`} onClick={() => setQuickView('lawyers')}>
                <div className="stat-icon"><Briefcase size={24} /></div>
                <div className="stat-content"><span className="stat-val">{stats.activeLawyers}</span><span className="stat-lbl">Counsel</span></div>
              </div>
            </div>
            {renderQuickView()}
            <div className="charts-row">
              <div className="chart-box glass-card">
                <h3>Case Velocity</h3>
                <ResponsiveContainer width="100%" height={300}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="name" stroke="#555" fontSize={12} /><YAxis stroke="#555" fontSize={12} /><Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #e02020' }} /><Bar dataKey="cases" fill="#e02020" /></BarChart></ResponsiveContainer>
              </div>
              <div className="chart-box glass-card">
                <h3>Case Spread</h3>
                <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value">{pieData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #e02020' }} /></PieChart></ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      case 'registration':
        return (
          <div className="view-fade">
            <h2 className="section-title"><Plus size={24} /> Establish Judicial Record</h2>
            <div className="glass-card registration-wrapper">
              <form onSubmit={handleRegistrationSubmit} className="admin-form">
                
                <div className="form-row">
                  <div className="form-group full">
                    <label>Primary Affidavit (PDF)</label>
                    <div className="file-box-v2">
                      <div className="file-input-wrapper">
                        <FileText size={20} />
                        <input type="file" name="file" accept=".pdf" onChange={handleInputChange} />
                        <span>{formData.file ? formData.file.name : "Upload official documentation..."}</span>
                      </div>
                      <button 
                        type="button" 
                        className="ai-autofill-btn" 
                        onClick={handleAiAutoFill}
                        disabled={!formData.file || isSubmitting}
                      >
                        <Sparkles size={16} /> AI AUTO-FILL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row"><div className="form-group full"><label>Case Title / Caption</label><input type="text" name="title" required value={formData.title} onChange={handleInputChange} placeholder="e.g. State of Karnataka vs Rahul Kumar" /></div></div>
                <div className="form-row">
                  <div className="form-group"><label>Jurisdiction</label><select name="type" value={formData.type} onChange={handleInputChange}><option value="criminal">Criminal</option><option value="civil">Civil</option></select></div>
                  <div className="form-group"><label>Priority Matrix</label><select name="priority" value={formData.priority} onChange={handleInputChange}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Petitioner / Plaintiff</label><input type="text" name="petitioner" required value={formData.petitioner} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>Respondent / Defendant</label><input type="text" name="respondent" required value={formData.respondent} onChange={handleInputChange} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Filing Date</label><input type="date" name="filedDate" required value={formData.filedDate} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>Target Hearing Date</label><input type="date" name="hearingDate" value={formData.hearingDate} onChange={handleInputChange} /></div>
                </div>
                <div className="form-row"><div className="form-group checkbox-group"><input type="checkbox" name="undertrial" id="undertrial" checked={formData.undertrial} onChange={handleInputChange} /><label htmlFor="undertrial">Mark as Undertrial Matter</label></div></div>
                
                {showCorsAlert && (
                  <div className="cors-warning-box">
                    <AlertCircle size={18} />
                    <span>Warning: Cloud storage blocked. AI has successfully parsed document layers for your brief.</span>
                    <button type="button" className="bypass-btn" onClick={handleRegistrationSubmit}>PROCEED <SkipForward size={14} /></button>
                  </div>
                )}

                {formMessage && <div className={`form-feedback-v2 ${formMessage.includes('error') || formMessage.includes('fail') ? 'error' : 'success'}`}>{formMessage}</div>}
                
                <button type="submit" className="admin-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="btn-loader">
                      <CloudLightning size={16} className="spinner" /> {submittingStage}
                    </span>
                  ) : 'ESTABLISH RECORD'}
                </button>
              </form>
            </div>
          </div>
        );
      case 'assignment':
        return (
          <div className="view-fade">
            <h2 className="section-title"><UserPlus size={24} /> Judicial Authority Assignment Hub</h2>
            <div className="assignment-grid">
              {cases.length === 0 ? <p className="empty-msg">No active docket.</p> : cases.map(c => (
                <div key={c.id} className="assignment-card glass-card">
                  <div className="assign-header">
                    <h3>{c.title || 'Untitled'}</h3>
                    <span className={`status-indicator ${c.status === 'assigned' ? 'assigned' : 'unassigned'}`}>
                      {c.status === 'assigned' ? 'TEAM ASSIGNED' : 'AWAITING TEAM'}
                    </span>
                  </div>
                  
                  <div className="assign-current-state">
                    <div className="state-item">
                      <span className="state-lbl">Presiding Judge:</span>
                      <span className={`state-val ${!c.assigned_judge_email ? 'unassigned' : ''}`}>
                        {c.assigned_judge_name || 'Unassigned'} 
                        {c.assigned_judge_email && <small>{c.assigned_judge_email}</small>}
                      </span>
                    </div>
                    <div className="state-item">
                      <span className="state-lbl">Petitioner Counsel:</span>
                      <span className={`state-val ${!c.petitioner_lawyer_email ? 'unassigned' : ''}`}>
                        {c.petitioner_lawyer_name || 'Unassigned'}
                      </span>
                    </div>
                    <div className="state-item">
                      <span className="state-lbl">Respondent Counsel:</span>
                      <span className={`state-val ${!c.respondent_lawyer_email ? 'unassigned' : ''}`}>
                        {c.respondent_lawyer_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="assign-fields">
                    <div className="assign-field">
                      <label>Select Presiding Officer</label>
                      <select 
                        disabled={assigningCase?.id !== c.id}
                        value={assigningCase?.id === c.id ? assignmentData.judge : (c.assigned_judge_email || '')}
                        onChange={(e) => setAssignmentData({...assignmentData, judge: e.target.value})}
                      >
                        <option value="">-- Choose Judge --</option>
                        {allUsers.filter(u => u.role === 'judge').map(j => <option key={j.id} value={j.email}>{j.displayName} ({j.email})</option>)}
                      </select>
                    </div>
                    <div className="assign-field">
                      <label>Select Petitioner Counsel</label>
                      <select 
                        disabled={assigningCase?.id !== c.id}
                        value={assigningCase?.id === c.id ? assignmentData.petitionerLawyer : (c.petitioner_lawyer_email || '')}
                        onChange={(e) => setAssignmentData({...assignmentData, petitionerLawyer: e.target.value})}
                      >
                        <option value="">-- Choose Lawyer --</option>
                        {allUsers.filter(u => u.role === 'lawyer').map(l => <option key={l.id} value={l.email}>{l.displayName} ({l.email})</option>)}
                      </select>
                    </div>
                    <div className="assign-field">
                      <label>Select Respondent Counsel</label>
                      <select 
                        disabled={assigningCase?.id !== c.id}
                        value={assigningCase?.id === c.id ? assignmentData.respondentLawyer : (c.respondent_lawyer_email || '')}
                        onChange={(e) => setAssignmentData({...assignmentData, respondentLawyer: e.target.value})}
                      >
                        <option value="">-- Choose Lawyer --</option>
                        {allUsers.filter(u => u.role === 'lawyer').map(l => <option key={l.id} value={l.email}>{l.displayName} ({l.email})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="assign-actions">
                    {assigningCase?.id === c.id ? (
                      <div className="action-row">
                        <button className="confirm-btn" onClick={() => handleAssignmentUpdate(c.id)}>SAVE ASSIGNMENT</button>
                        <button className="cancel-btn" onClick={() => setAssigningCase(null)}>ABORT</button>
                      </div>
                    ) : (
                      <button className="edit-btn" onClick={() => { 
                        setAssigningCase(c); 
                        setAssignmentData({ 
                          judge: c.assigned_judge_email || '', 
                          petitionerLawyer: c.petitioner_lawyer_email || '', 
                          respondentLawyer: c.respondent_lawyer_email || '' 
                        }); 
                      }}>ASSIGN TEAM</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'monitoring':
        return (
          <div className="view-fade">
            <h2 className="section-title"><Activity size={24} /> Docket Monitoring</h2>
            <div className="glass-card table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Node</th><th>Jurisdiction</th><th>Judge</th><th>Stage</th><th>Purge</th></tr></thead>
                <tbody>{cases.map(c => (<tr key={c.id}><td><div className="case-cell"><strong>{c.title}</strong><span>ID: {c.id.substring(0, 8)}</span></div></td><td>{c.type}</td><td>{c.assigned_judge_name || 'PENDING'}</td><td><span className="stage-chip">{c.pipeline_stage}</span></td><td><button className="delete-btn" onClick={() => deleteCase(c.id)}><Trash2 size={16} /></button></td></tr>))}</tbody>
              </table>
            </div>
          </div>
        );
      case 'roles':
        return (
          <div className="view-fade">
            <h2 className="section-title"><Users size={24} /> Role Management</h2>
            <div className="glass-card table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Profile</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>{allUsers.map(u => (<tr key={u.id}><td><div className="user-cell"><div className="user-avatar">{u.displayName?.[0] || 'U'}</div><div><strong>{u.displayName}</strong><span>{u.email}</span></div></div></td><td><select className="role-picker" value={u.role || 'citizen'} disabled={u.email === 'admin@mandamus.gov'} onChange={(e) => updateUserRole(u.id, e.target.value)}><option value="citizen">Citizen</option><option value="judge">Judge</option><option value="lawyer">Lawyer</option><option value="admin">Admin</option></select></td><td><span className="status-badge">AUTHENTICATED</span></td></tr>))}</tbody>
              </table>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="admin-root">
      <div className="admin-nav-wrapper">
        <div className="admin-logo" onClick={() => setActiveTab('analytics')} style={{ cursor: 'pointer' }}>
          <img src="/Logo.png" alt="Mandamus" /><span>MANDAMUS</span>
        </div>
        <nav className="admin-capsule">
          <button className={`admin-nav-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><LayoutDashboard size={14} /> Dashboard</button>
          <button className={`admin-nav-btn ${activeTab === 'registration' ? 'active' : ''}`} onClick={() => setActiveTab('registration')}><Plus size={14} /> Register</button>
          <button className={`admin-nav-btn ${activeTab === 'assignment' ? 'active' : ''}`} onClick={() => setActiveTab('assignment')}><UserPlus size={14} /> Assignment</button>
          <button className={`admin-nav-btn ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}><Activity size={14} /> Monitoring</button>
          <button className={`admin-nav-btn ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}><Users size={14} /> Roles</button>
        </nav>
        <div className="admin-user-actions">
          <div className="admin-profile-chip"><div className="admin-avatar">{user?.displayName?.[0] || 'A'}</div><div className="admin-details"><span>{user?.displayName || 'Admin'}</span></div></div>
          <button className="admin-logout-btn" onClick={logout}><LogOut size={18} /></button>
        </div>
      </div>
      <div className="admin-container">{renderTabContent()}</div>
    </div>
  );
};

export default AdminDashboard;
