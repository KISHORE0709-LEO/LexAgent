import React, { useState } from 'react';
import { User, Edit2, Check, X, Shield, LogOut, Activity, Bell, Camera } from 'lucide-react';
import { auth } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import './ProfilePage.css';

const stats = [
  { val: '124', label: 'CASES_HANDLED' },
  { val: '89%', label: 'EFFICIENCY_RATE' },
  { val: '12',  label: 'PENDING_REVIEW' },
  { val: '47',  label: 'DRAFTS_FILED' },
];

const activity = [
  { action: 'Draft approved', case: 'STATE VS. MALHOTRA', time: '2h ago' },
  { action: 'Precedent search', case: 'KRYPTON CORP [CR-2024]', time: '5h ago' },
  { action: 'Hearing scheduled', case: 'NEXUS V. DATACORP', time: '1d ago' },
  { action: 'Summary generated', case: 'SOL-7 SYSTEMS (2039)', time: '2d ago' },
];

export default function ProfilePage() {
  const user = auth.currentUser;
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [role, setRole] = useState('Magistrate · District Court');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="pp-page">

      {/* ── HEADER ── */}
      <div className="pp-header">
        <div>
          <h1 className="pp-title">USER_PROFILE</h1>
          <p className="pp-sub">JUDICIAL OFFICER IDENTITY · SESSION MANAGEMENT · AUDIT TRAIL</p>
        </div>
        <button className="pp-logout-btn" onClick={handleLogout}>
          <LogOut size={14} /> TERMINATE_SESSION
        </button>
      </div>

      <div className="pp-grid">

        {/* ── LEFT: IDENTITY CARD ── */}
        <div className="pp-card pp-identity">

          {/* Avatar */}
          <div className="pp-avatar-wrap">
            <div className="pp-avatar">
              {user?.photoURL
                ? <img src={user.photoURL} alt="avatar" />
                : <User size={40} />}
            </div>
            <div className="pp-avatar-badge"><Camera size={11} /></div>
          </div>

          {/* Name + edit */}
          {editing ? (
            <div className="pp-edit-row">
              <input
                className="pp-name-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoFocus
              />
              <button className="pp-edit-confirm" onClick={handleSave} disabled={saving}>
                <Check size={14} />
              </button>
              <button className="pp-edit-cancel" onClick={() => { setEditing(false); setDisplayName(user?.displayName || ''); }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="pp-name-row">
              <h2 className="pp-name">{user?.displayName || 'Judicial Officer'}</h2>
              <button className="pp-edit-btn" onClick={() => setEditing(true)}><Edit2 size={13} /></button>
            </div>
          )}

          {saved && <div className="pp-saved-msg">✓ Profile updated</div>}

          <div className="pp-role">{role}</div>
          <div className="pp-email">{user?.email}</div>

          <div className="pp-divider" />

          {/* Identity fields */}
          <div className="pp-field">
            <span className="pp-field-label">DISPLAY_NAME</span>
            <span className="pp-field-val">{user?.displayName || '—'}</span>
          </div>
          <div className="pp-field">
            <span className="pp-field-label">EMAIL_ADDRESS</span>
            <span className="pp-field-val">{user?.email}</span>
          </div>
          <div className="pp-field">
            <span className="pp-field-label">AUTH_PROVIDER</span>
            <span className="pp-field-val pp-field-green">
              {user?.providerData?.[0]?.providerId === 'google.com' ? 'GOOGLE_OAUTH2' : 'EMAIL_PASSWORD'}
            </span>
          </div>
          <div className="pp-field">
            <span className="pp-field-label">ACCOUNT_CREATED</span>
            <span className="pp-field-val">
              {user?.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
          <div className="pp-field">
            <span className="pp-field-label">LAST_LOGIN</span>
            <span className="pp-field-val">
              {user?.metadata?.lastSignInTime
                ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>

          <div className="pp-divider" />

          <div className="pp-field">
            <span className="pp-field-label">EMAIL_VERIFIED</span>
            <span className={`pp-field-val ${user?.emailVerified ? 'pp-field-green' : 'pp-field-red'}`}>
              {user?.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}
            </span>
          </div>
          <div className="pp-field">
            <span className="pp-field-label">SESSION_STATUS</span>
            <span className="pp-field-val pp-field-green">ACTIVE · PERSISTENT</span>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="pp-right">

          {/* Stats */}
          <div className="pp-card pp-stats-card">
            <div className="pp-card-label"><Activity size={12} /> JUDICIAL_METRICS</div>
            <div className="pp-stats-grid">
              {stats.map(s => (
                <div key={s.label} className="pp-stat">
                  <div className="pp-stat-val">{s.val}</div>
                  <div className="pp-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="pp-card pp-security-card">
            <div className="pp-card-label"><Shield size={12} /> SECURITY_SETTINGS</div>
            <div className="pp-sec-row">
              <div>
                <div className="pp-sec-title">Two-Factor Authentication</div>
                <div className="pp-sec-desc">Add an extra layer of security to your account</div>
              </div>
              <div className="pp-toggle pp-toggle-off">OFF</div>
            </div>
            <div className="pp-sec-row">
              <div>
                <div className="pp-sec-title">Session Persistence</div>
                <div className="pp-sec-desc">Stay signed in across browser sessions</div>
              </div>
              <div className="pp-toggle pp-toggle-on">ON</div>
            </div>
            <div className="pp-sec-row">
              <div>
                <div className="pp-sec-title">Audit Log Access</div>
                <div className="pp-sec-desc">All actions are immutably logged</div>
              </div>
              <div className="pp-toggle pp-toggle-on">ON</div>
            </div>
          </div>

          {/* Activity */}
          <div className="pp-card pp-activity-card">
            <div className="pp-card-label"><Bell size={12} /> RECENT_ACTIVITY</div>
            {activity.map((a, i) => (
              <div key={i} className="pp-activity-item">
                <div className="pp-activity-dot" />
                <div className="pp-activity-body">
                  <div className="pp-activity-action">{a.action}</div>
                  <div className="pp-activity-case">{a.case}</div>
                </div>
                <div className="pp-activity-time">{a.time}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
