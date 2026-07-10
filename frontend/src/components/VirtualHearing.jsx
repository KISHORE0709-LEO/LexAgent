import React, { useState } from 'react';
import { Shield, FileText, Download } from 'lucide-react';
import './VirtualHearing.css';

const participants = [
  { name: 'Judge Vance', role: 'PRESIDING', status: 'verified' },
  { name: 'Atty. Thorne', role: 'PETITIONER', status: 'verified' },
  { name: 'Atty. Jenkins', role: 'RESPONDENT', status: 'pending' },
];

const caseFiles = [
  { name: 'Case_Summary_08821.pdf', type: 'PRIMARY DOC' },
  { name: 'Smart_Contract_Audit.json', type: 'EXHIBIT A' },
  { name: 'Wallet_Logs_Final.csv', type: 'EXHIBIT B' },
];

const transcript = [
  {
    speaker: 'JUSTICE VANCE',
    time: '14:02:11',
    text: 'Counsel, you may proceed with the opening statements regarding the cryptographic asset seizure.',
    highlight: false,
  },
  {
    speaker: 'ATTY. THORNE',
    time: '14:02:45',
    text: 'Thank you, Your Honor. The petitioner contends that the private keys were obtained without a valid digital warrant under Section 8.4...',
    highlight: false,
  },
  {
    speaker: 'JUSTICE VANCE',
    time: '14:03:12',
    text: 'Wait. Counselor Jenkins, do you have the rebuttal documentation for the warrant timestamp?',
    highlight: true,
  },
];

const videoThumbs = [
  { name: 'Atty. Marcus Thorne', role: 'PETITIONER COUNSEL', status: 'verified', img: null },
  { name: 'Atty. Sarah Jenkins', role: 'RESPONDENT COUNSEL', status: 'pending', img: null },
  { name: null, role: null, status: 'empty', img: null },
];

export default function VirtualHearing() {
  const [, setExporting] = useState(false);

  return (
    <div className="vh-page">
      {/* ── HEADER ── */}
      <div className="vh-header">
        <div>
          <h1 className="vh-title">VIRTUAL_HEARING</h1>
          <p className="vh-sub">ENCRYPTED TELEPRESENCE · REAL-TIME TRANSCRIPTION · JUDICIAL PROTOCOL</p>
        </div>
      </div>

      <div className="vh-grid">

        {/* COL 1 — MAIN VIDEO */}
        <div className="vh-main-video">
          <div className="vh-identity-bar">
            <Shield size={12} className="vh-shield" />
            <span>IDENTITY VERIFIED</span>
          </div>
          <span className="vh-verified-badge">VERIFIED</span>
          <div className="vh-judge-placeholder">
            <div className="vh-judge-avatar">
              <div className="vh-avatar-silhouette" />
            </div>
            <div className="vh-judge-label">
              <span className="vh-judge-name">Justice Vance</span>
              <span className="vh-judge-role">PRESIDING JUDGE</span>
            </div>
          </div>
        </div>

        {/* COL 2 — PARTICIPANTS + FILES */}
        <div className="vh-mid-col">

          {/* Video thumbnails */}
          <div className="vh-thumbs">
            {videoThumbs.map((p, i) => (
              <div className="vh-thumb" key={i}>
                {p.status === 'empty' ? (
                  <div className="vh-thumb-empty">
                    <div className="vh-empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#444" strokeWidth="1.5"/>
                        <circle cx="12" cy="7" r="4" stroke="#444" strokeWidth="1.5"/>
                        <line x1="4" y1="4" x2="20" y2="20" stroke="#444" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <span className="vh-empty-lbl">WAITING ROOM EMPTY</span>
                  </div>
                ) : (
                  <>
                    <span className={`vh-thumb-badge ${p.status}`}>{p.status.toUpperCase()}</span>
                    <div className="vh-thumb-img" />
                    <div className="vh-thumb-info">
                      <span className="vh-thumb-name">{p.name}</span>
                      <span className="vh-thumb-role">{p.role}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Participant status */}
          <div className="vh-participants">
            <div className="vh-sec-label">PARTICIPANT_STATUS</div>
            {participants.map((p) => (
              <div className="vh-participant" key={p.name}>
                <div>
                  <div className="vh-p-name">{p.name}</div>
                  <div className="vh-p-role">{p.role}</div>
                </div>
                <span className={`vh-status-badge ${p.status}`}>{p.status.toUpperCase()}</span>
              </div>
            ))}
          </div>

          {/* Case files */}
          <div className="vh-files">
            <div className="vh-sec-label">CASE_FILES_LIBRARY</div>
            {caseFiles.map((f) => (
              <div className="vh-file" key={f.name}>
                <FileText size={13} className="vh-file-icon" />
                <div>
                  <div className="vh-file-name">{f.name}</div>
                  <div className="vh-file-type">{f.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COL 3 — TRANSCRIPT */}
        <div className="vh-transcript-col">
          <div className="vh-transcript-header">
            <h2 className="vh-transcript-title">LIVE_TRANSCRIPT</h2>
            <p className="vh-transcript-sub">ENCRYPTED REAL-TIME LOG</p>
          </div>

          <div className="vh-transcript-body">
            {transcript.map((t, i) => (
              <div className={`vh-entry ${t.highlight ? 'vh-entry-highlight' : ''}`} key={i}>
                <div className="vh-entry-meta">
                  <span className="vh-entry-speaker">{t.speaker}</span>
                  <span className="vh-entry-time">{t.time}</span>
                </div>
                <p className={`vh-entry-text ${t.highlight ? 'vh-entry-bold' : ''}`}>{t.text}</p>
              </div>
            ))}

            <div className="vh-transcribing">
              <span className="vh-dot" />
              <span>TRANSCRIBING...</span>
            </div>
          </div>

          <button className="vh-export-btn" onClick={() => setExporting(true)}>
            <Download size={13} />
            EXPORT OFFICIAL RECORD
          </button>
        </div>

      </div>
    </div>
  );
}
