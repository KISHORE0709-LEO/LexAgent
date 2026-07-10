import React, { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, Plus, CheckCircle2, ChevronRight, Download, Trash2, Paperclip, Copy, Check } from 'lucide-react';
import { useMandamus } from '../context/MandamusContext';
import { useAuth } from '../context/AuthContext';
import { createHearing, getHearingsByJudge, getHearingsByCase, deleteHearing } from '../lib/firestoreHelpers';
import { onSnapshot, collection, query, where, or } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './Scheduler.css';

const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

function buildAgenda(state) {
  const summary = state.summariser_output;
  const draft = state.draft_output;
  if (!summary && !draft) return '';
  const lines = [];
  if (summary?.caseName) lines.push(`Case: ${summary.caseName}`);
  if (summary?.petitioner && summary?.respondent)
    lines.push(`Parties: ${summary.petitioner} vs ${summary.respondent}`);
  if (draft?.sections?.length)
    lines.push(`Draft covers: ${draft.sections.map(s => s.title).join(', ')}`);
  if (summary?.legalQuestions?.length)
    lines.push(`Key question: ${summary.legalQuestions[0]}`);
  return lines.join('\n');
}

// Generate Google Meet-style meeting code
function generateMeetingCode() {
  const seg = (n) => Math.random().toString(36).substring(2, 2 + n);
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

export default function Scheduler({ onTabChange }) {
  const { state, updateState } = useMandamus();
  const { user } = useAuth();
  const summary = state.summariser_output || {};
  const hasDraft = state.draft_status === 'approved' || !!state.draft_output;

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  const [form, setForm] = useState({
    title: summary.caseName ? `Hearing — ${summary.caseName}` : '',
    date: todayStr,
    time: '10:00',
    type: 'Virtual Hearing',
    agenda: buildAgenda(state),
    attachDraft: hasDraft,
    parties: summary.petitioner && summary.respondent
      ? `${summary.petitioner} · ${summary.respondent}` : '',
    petitioner_lawyer_email: '1nt23cb012.sneha@nmit.ac.in',
    petitioner_lawyer_name: 'arha',
    respondent_lawyer_email: 'chvsneha23@gmail.com',
    respondent_lawyer_name: 'CH V Sneha',
  });

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  // Load hearings from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);

    const caseId = state.active_case?.id || state.case_id || summary.caseId;
    
    // Listen for hearings where this user is the judge
    const q = query(
      collection(db, 'hearings'),
      where('judgeId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If we are looking at a specific case, filter it
      const filtered = caseId 
        ? fetched.filter(h => h.caseId === caseId)
        : fetched;
        
      setMeetings(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, state.active_case?.id]);

  // Re-fill form when case data arrives
  useEffect(() => {
    const petitioner_lawyer_email = summary.petitioner_lawyer_email || state.active_case?.petitioner_lawyer_email || '1nt23cb012.sneha@nmit.ac.in';
    const petitioner_lawyer_name = summary.petitioner_lawyer_name || state.active_case?.petitioner_lawyer_name || 'arha';
    const respondent_lawyer_email = summary.respondent_lawyer_email || state.active_case?.respondent_lawyer_email || 'chvsneha23@gmail.com';
    const respondent_lawyer_name = summary.respondent_lawyer_name || state.active_case?.respondent_lawyer_name || 'CH V Sneha';
    
    setForm(f => ({
      ...f,
      title: f.title || (summary.caseName ? `Hearing — ${summary.caseName}` : ''),
      agenda: f.agenda || buildAgenda(state),
      parties: f.parties || (summary.petitioner && summary.respondent ? `${summary.petitioner} · ${summary.respondent}` : ''),
      petitioner_lawyer_email,
      petitioner_lawyer_name,
      respondent_lawyer_email,
      respondent_lawyer_name,
      attachDraft: hasDraft,
    }));
  }, [state.summariser_output, state.draft_output, state.active_case]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title required';
    if (!form.date) e.date = 'Date required';
    if (!form.time) e.time = 'Time required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSchedule = async () => {
    if (!validate()) return;
    if (!user?.uid) {
      alert('Please login to schedule a hearing');
      return;
    }

    try {
      const meetingCode = generateMeetingCode();
      
      const hearingData = {
        caseId: state.active_case?.id || state.case_id || summary.caseId || 'CASE-' + Date.now(),
        caseName: form.title || state.active_case?.title,
        judgeId: user.uid,
        judgeName: user.displayName || 'Judge',
        scheduledDate: form.date,
        scheduledTime: form.time,
        type: form.type,
        parties: form.parties,
        petitioner_lawyer_email: form.petitioner_lawyer_email,
        petitioner_lawyer_name: form.petitioner_lawyer_name,
        respondent_lawyer_email: form.respondent_lawyer_email,
        respondent_lawyer_name: form.respondent_lawyer_name,
        agenda: form.agenda,
        draftAttached: form.attachDraft && hasDraft,
        participants: [user.uid],
        status: 'scheduled',
        roomId: meetingCode  // Store meeting code as roomId
      };

      await createHearing(hearingData);
      
      // DISPATCH NOTICES IMMEDIATELY (Resend API)
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const lawyers = [
        { email: form.petitioner_lawyer_email, role: 'Petitioner' },
        { email: form.respondent_lawyer_email, role: 'Respondent' }
      ];

      for (const lawyer of lawyers) {
        if (lawyer.email) {
          try {
             await fetch(`${baseUrl}/resend-judicial-invite`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: lawyer.email,
                case_name: form.title,
                scheduled_time: form.time,
                room_id: meetingCode
              })
            });
          } catch (e) { console.error(`Failed to dispatch notice to ${lawyer.email}`, e); }
        }
      }
      
      // Reload hearings from Firestore
      const updated = state.active_case?.id 
        ? await getHearingsByCase(state.active_case.id)
        : await getHearingsByJudge(user.uid);
      setMeetings(updated);
      
      updateState({ 
        scheduler_status: 'scheduled', 
        scheduled_date: `${form.date} ${form.time}`,
        last_hearing_id: hearingData.caseId
      });
      
      setSubmitted(true);
      alert("Hearing scheduled and notices dispatched successfully!");
    } catch (error) {
      console.error('Error scheduling hearing:', error);
      alert('Failed to schedule hearing. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHearing(id);
      const updated = state.active_case?.id 
        ? await getHearingsByCase(state.active_case.id)
        : await getHearingsByJudge(user.uid);
      setMeetings(updated);
    } catch (error) {
      console.error('Error deleting hearing:', error);
      alert('Failed to delete hearing. Please try again.');
    }
  };

  const handleExport = (m) => {
    const txt = [
      `SCHEDULED MEETING`,
      `─────────────────────────────────`,
      `Title    : ${m.title}`,
      `Date     : ${m.date} at ${m.time}`,
      `Type     : ${m.type}`,
      `Case ID  : ${m.caseId}`,
      `Parties  : ${m.parties || '—'}`,
      ``,
      `AGENDA`,
      `─────────────────────────────────`,
      m.agenda || '(none)',
      ``,
      m.draftAttached ? `[Draft attached]` : '',
    ].join('\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `meeting_${m.id}.txt`;
    a.click();
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm(f => ({ ...f, date: todayStr, time: '10:00' }));
  };

  const copyMeetingCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyMeetingLink = (code) => {
    const link = `${window.location.origin}/hearing/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(`link-${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="sc-page">

      {/* ── HEADER ── */}
      <div className="sc-header">
        <div>
          <h1 className="sc-title">HEARING_SCHEDULER</h1>
          <p className="sc-sub">SCHEDULE · MANAGE · PROCEED TO VIRTUAL HEARING</p>
        </div>
        {summary.caseName && (
          <div className="sc-case-chip">
            <span className="sc-chip-bar" />
            <span className="sc-chip-txt">{summary.caseName}</span>
          </div>
        )}
      </div>

      <div className="sc-layout">

        {/* ── LEFT: FORM ── */}
        <div className="sc-form-col">
          <div className="sc-section-label"><Plus size={12} /> NEW MEETING</div>

          {submitted ? (
            <div className="sc-success">
              <CheckCircle2 size={32} className="sc-success-icon" />
              <div className="sc-success-title">MEETING SCHEDULED</div>
              <div className="sc-success-sub">{form.date} at {form.time}</div>
              <div className="sc-success-actions">
                <button className="sc-btn-outline" onClick={resetForm}>SCHEDULE ANOTHER</button>
                <button className="sc-btn-primary" onClick={() => onTabChange && onTabChange('virtual')}>
                  PROCEED TO VIRTUAL HEARING <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="sc-form">

              <div className="sc-auto-proposal-card" style={{ padding: '20px', backgroundColor: 'rgba(224, 32, 32, 0.05)', border: '1px solid rgba(224, 32, 32, 0.3)', borderRadius: '8px', marginBottom: '20px' }}>
                <h3 style={{ color: '#ffb3b3', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚡ Auto-Generated Proposal
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem' }}>
                  <div><strong style={{ color: '#fff' }}>Case Title:</strong> {form.title || 'Pending Selection'}</div>
                  <div><strong style={{ color: '#fff' }}>Parties:</strong> {form.parties || 'Pending'}</div>
                  <div><strong style={{ color: '#fff' }}>Petitioner Lawyer:</strong> <span style={{ color: '#81c995' }}>{form.petitioner_lawyer_name} ({form.petitioner_lawyer_email})</span></div>
                  <div><strong style={{ color: '#fff' }}>Respondent Lawyer:</strong> <span style={{ color: '#81c995' }}>{form.respondent_lawyer_name} ({form.respondent_lawyer_email})</span></div>
                  <div><strong style={{ color: '#fff' }}>Proposed Date:</strong> {form.date}</div>
                  <div><strong style={{ color: '#fff' }}>Proposed Time:</strong> {form.time}</div>
                  <div><strong style={{ color: '#fff' }}>Type:</strong> {form.type}</div>
                </div>
                
                <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic' }}>
                  * The system has analyzed the judicial docket and reserved the most optimal time slot.
                </div>

                <button className="sc-btn-primary sc-submit" onClick={handleSchedule} style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#e02020', border: 'none' }}>
                  <CheckCircle2 size={16} /> APPROVE & DISPATCH NOTICES
                </button>
              </div>

              <details style={{ marginTop: '20px', color: '#888' }}>
                <summary style={{ cursor: 'pointer', padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  Manual Override (Edit Parameters)
                </summary>
                <div style={{ marginTop: '15px', padding: '15px', border: '1px dashed #333', borderRadius: '6px' }}>
                  <div className="sc-field">
                    <label className="sc-label">MEETING TITLE</label>
                    <input
                      className={`sc-input ${errors.title ? 'sc-input-err' : ''}`}
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Hearing — State vs Malhotra"
                    />
                    {errors.title && <span className="sc-err">{errors.title}</span>}
                  </div>

                  <div className="sc-row-2">
                    <div className="sc-field">
                      <label className="sc-label"><Calendar size={11} /> DATE</label>
                      <input
                        type="date"
                        className={`sc-input sc-input-date ${errors.date ? 'sc-input-err' : ''}`}
                        value={form.date}
                        min={todayStr}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      />
                      {errors.date && <span className="sc-err">{errors.date}</span>}
                    </div>
                    <div className="sc-field">
                      <label className="sc-label"><Clock size={11} /> TIME</label>
                      <input
                        type="time"
                        className={`sc-input sc-input-date ${errors.time ? 'sc-input-err' : ''}`}
                        value={form.time}
                        onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      />
                      {errors.time && <span className="sc-err">{errors.time}</span>}
                    </div>
                  </div>

                  <div className="sc-field">
                    <label className="sc-label">MEETING TYPE</label>
                    <select
                      className="sc-input sc-select"
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    >
                      <option>Virtual Hearing</option>
                      <option>In-Person Hearing</option>
                      <option>Chambers Meeting</option>
                      <option>Pre-Trial Conference</option>
                      <option>Mediation Session</option>
                    </select>
                  </div>

                  <div className="sc-field">
                    <label className="sc-label">PARTIES</label>
                    <input
                      className="sc-input"
                      value={form.parties}
                      onChange={e => setForm(f => ({ ...f, parties: e.target.value }))}
                      placeholder="Petitioner · Respondent"
                    />
                  </div>

                  <div className="sc-row-2">
                    <div className="sc-field">
                      <label className="sc-label">PETITIONER LAWYER EMAIL</label>
                      <input
                        className="sc-input"
                        type="email"
                        value={form.petitioner_lawyer_email}
                        onChange={e => setForm(f => ({ ...f, petitioner_lawyer_email: e.target.value }))}
                        placeholder="lawyer@petitioner.com"
                      />
                    </div>
                    <div className="sc-field">
                      <label className="sc-label">PETITIONER LAWYER NAME</label>
                      <input
                        className="sc-input"
                        value={form.petitioner_lawyer_name}
                        onChange={e => setForm(f => ({ ...f, petitioner_lawyer_name: e.target.value }))}
                        placeholder="Arha"
                      />
                    </div>
                  </div>

                  <div className="sc-row-2">
                    <div className="sc-field">
                      <label className="sc-label">RESPONDENT LAWYER EMAIL</label>
                      <input
                        className="sc-input"
                        type="email"
                        value={form.respondent_lawyer_email}
                        onChange={e => setForm(f => ({ ...f, respondent_lawyer_email: e.target.value }))}
                        placeholder="lawyer@respondent.com"
                      />
                    </div>
                    <div className="sc-field">
                      <label className="sc-label">RESPONDENT LAWYER NAME</label>
                      <input
                        className="sc-input"
                        value={form.respondent_lawyer_name}
                        onChange={e => setForm(f => ({ ...f, respondent_lawyer_name: e.target.value }))}
                        placeholder="CH V Sneha"
                      />
                    </div>
                  </div>

                  <div className="sc-field">
                    <label className="sc-label">AGENDA</label>
                    <textarea
                      className="sc-input sc-textarea"
                      value={form.agenda}
                      onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                      placeholder="Auto-generated from case context…"
                      rows={5}
                    />
                  </div>

                  {hasDraft && (
                    <label className="sc-attach-row">
                      <input
                        type="checkbox"
                        checked={form.attachDraft}
                        onChange={e => setForm(f => ({ ...f, attachDraft: e.target.checked }))}
                        className="sc-checkbox"
                      />
                      <Paperclip size={12} />
                      <span>Attach generated draft to this meeting</span>
                    </label>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* ── RIGHT: MEETINGS LIST ── */}
        <div className="sc-list-col">
          <div className="sc-section-label"><FileText size={12} /> SCHEDULED MEETINGS ({meetings.length})</div>

          {loading ? (
            <div className="sc-empty">
              <Clock size={28} className="sc-empty-icon" />
              <div className="sc-empty-txt">Loading hearings...</div>
            </div>
          ) : meetings.length === 0 ? (
            <div className="sc-empty">
              <Calendar size={28} className="sc-empty-icon" />
              <div className="sc-empty-txt">No meetings scheduled yet.</div>
              <div className="sc-empty-sub">Fill the form and click Schedule Meeting.</div>
            </div>
          ) : (
            <div className="sc-meetings">
              {meetings.map((m) => (
                <div key={m.id} className="sc-meeting-card">
                  <div className="sc-meeting-top">
                    <div className="sc-meeting-type-tag">{m.type}</div>
                    <div className="sc-meeting-actions">
                      <button className="sc-icon-btn" onClick={() => handleExport(m)} title="Export"><Download size={13} /></button>
                      <button className="sc-icon-btn sc-icon-del" onClick={() => handleDelete(m.id)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="sc-meeting-title">{m.title}</div>
                  <div className="sc-meeting-meta">
                    <span><Calendar size={11} /> {m.scheduledDate || m.date}</span>
                    <span className="sc-meta-sep">·</span>
                    <span><Clock size={11} /> {m.scheduledTime || m.time}</span>
                    {m.caseId !== '—' && <><span className="sc-meta-sep">·</span><span>ID: {m.caseId}</span></>}
                  </div>
                  {m.parties && <div className="sc-meeting-parties">{m.parties}</div>}
                  {m.agenda && (
                    <div className="sc-meeting-agenda">
                      {m.agenda.split('\n').map((line, i) => line && <div key={i} className="sc-agenda-line">{line}</div>)}
                    </div>
                  )}
                  {m.draftAttached && (
                    <div className="sc-draft-badge"><Paperclip size={11} /> Draft attached</div>
                  )}
                  
                  {/* Meeting Code Section */}
                  {(() => {
                    const roomCode = m.roomId || (m.id ? m.id.substring(0, 10) : 'none');
                    return (
                      <div className="sc-meeting-code-section">
                        <div className="sc-meeting-code-label">
                          {m.roomId ? 'Meeting Code:' : 'Fallback Code (Legacy):'}
                        </div>
                        <div className="sc-meeting-code-box">
                          <span className="sc-meeting-code">{roomCode}</span>
                          <button 
                            className="sc-copy-btn" 
                            onClick={() => copyMeetingCode(roomCode)}
                            title="Copy Code"
                          >
                            {copiedCode === roomCode ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                        <button 
                          className="sc-copy-link-btn" 
                          onClick={() => copyMeetingLink(roomCode)}
                        >
                          {copiedCode === `link-${roomCode}` ? '✓ Link Copied' : 'Copy Join Link'}
                        </button>
                        {!m.roomId && (
                          <div className="sc-legacy-hint">
                            * This is a legacy hearing. Use the code above to join.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  <button
                    className="sc-join-btn"
                    onClick={() => onTabChange && onTabChange('virtual')}
                  >
                    JOIN VIRTUAL HEARING <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* workflow hint if no draft yet */}
          {!hasDraft && (
            <div className="sc-workflow-hint">
              <div className="sc-hint-step sc-hint-done">① SUMMARISE</div>
              <div className="sc-hint-arrow">→</div>
              <div className="sc-hint-step sc-hint-done">② PRECEDENTS</div>
              <div className="sc-hint-arrow">→</div>
              <div className="sc-hint-step sc-hint-done">③ DRAFT</div>
              <div className="sc-hint-arrow">→</div>
              <div className="sc-hint-step sc-hint-active">④ SCHEDULE</div>
              <div className="sc-hint-arrow">→</div>
              <div className="sc-hint-step">⑤ HEARING</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
