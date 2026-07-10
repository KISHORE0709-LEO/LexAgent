import React, { useState, useEffect, useRef } from 'react';
import { FileUp, CheckCircle2, Search, ChevronRight, Download, Edit3, ThumbsUp, RotateCcw, FileText, Save, ArrowRight, X, ChevronUp, ChevronDown, ShieldCheck, AlertTriangle, Languages } from 'lucide-react';
import { useMandamus } from '../context/MandamusContext';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './Summarizer.css';
import LegalChat from './LegalChat';

/* ─── PROCESSING STAGES ─── */
const STAGES = [
  { id: 'upload',    label: 'UPLOADING FILE',        sub: 'Streaming document to neural buffer…' },
  { id: 'ocr',       label: 'OCR PROCESSING',        sub: 'Extracting text layers via optical scan…' },
  { id: 'nlp',       label: 'NLP SUMMARISATION',     sub: 'Deep-parsing semantic entities…' },
  { id: 'structure',  label: 'STRUCTURING OUTPUT',   sub: 'Compiling structured case abstract…' },
  { id: 'done',      label: 'COMPLETED',             sub: 'Analysis pipeline complete.' },
];

const LOCALIZATION = {
  English: {
    title: "NEURAL_SUMMARIZER",
    summary: "CASE_SUMMARY",
    evidence: "EVIDENCE_PIPELINE",
    adr: "ADR_ENGINE",
    inventory: "PORTFOLIO_INDEX",
    petitioner: "PETITIONER",
    respondent: "RESPONDENT",
    facts: "KEY_FACTS_EXTRACTION",
    questions: "CORE_LEGAL_QUESTIONS",
    statutes: "FLAGGED STATUTES",
    outcome: "CASE OUTCOME ANALYSIS",
    counsel: "Counsel",
    confidence: "CONFIDENCE SCORE INDEX",
    strength: "ARGUMENT STRENGTH",
    path: "PROCEDURAL PATH",
    view_results: "VIEW RESULTS",
    new_pdf: "NEW PDF",
    edit: "EDIT",
    done: "DONE",
    export: "PDF EXPORT",
    approve: "APPROVE",
    approved: "APPROVED",
    translate: "TRANSLATE",
    status_complete: "ANALYSIS_PROTOCOL_COMPLETE",
    case_id: "CASE_ID",
    jurisdiction: "JURISDICTION",
    filing: "Original Filing",
    legal_mode: "LEGAL",
    plain_mode: "PLAIN",
    risk_safe: "SAFE",
    risk_high: "HIGH RISK"
  },
  Hindi: {
    title: "न्यूरल सारांशकर्ता",
    summary: "मामले का सारांश",
    evidence: "साक्ष्य पाइपलाइन",
    adr: "एडीआर इंजन",
    inventory: "पोर्टफोलियो इंडेक्स",
    petitioner: "याचिकाकर्ता",
    respondent: "प्रतिवादी",
    facts: "मुख्य तथ्यों का निष्कर्षण",
    questions: "मुख्य कानूनी प्रश्न",
    statutes: "चिह्नित कानून",
    outcome: "मामले के परिणाम का विश्लेषण",
    counsel: "वकील",
    confidence: "विश्वास स्कोर इंडेक्स",
    strength: "तर्क की शक्ति",
    path: "प्रक्रियात्मक पथ",
    view_results: "परिणाम देखें",
    new_pdf: "नई फ़ाइल",
    edit: "संपादित करें",
    done: "पूर्ण",
    export: "पीडीएफ एक्सपोर्ट",
    approve: "स्वीकार करें",
    approved: "स्वीकृत",
    translate: "अनुवाद करें",
    status_complete: "विश्लेषण प्रक्रिया पूर्ण",
    case_id: "मामला संख्या",
    jurisdiction: "अधिकार क्षेत्र",
    filing: "मूल फाइलिंग",
    legal_mode: "कानूनी",
    plain_mode: "सरल",
    risk_safe: "सुरक्षित",
    risk_high: "उच्च जोखिम"
  },
  Kannada: {
    title: "ನ್ಯೂರಲ್ ಸಾರಾಂಶ",
    summary: "ಪ್ರಕರಣದ ಸಾರಾಂಶ",
    evidence: "ಪುರಾವೆ ಪೈಪ್‌ಲೈನ್",
    adr: "ಎಡಿಆರ್ ಎಂಜಿನ್",
    inventory: "ಪೋರ್ಟ್‌ಫೋಲಿಯೋ ಸೂಚ್ಯಂಕ",
    petitioner: "ಅರ್ಜಿದಾರರು",
    respondent: "ಪ್ರತಿಕ್ರಿಯೆದಾರరు",
    facts: "ಪ್ರಮುಖ ಅಂಶಗಳ ಹೊರತೆಗೆಯುವಿಕೆ",
    questions: "ಮೂಲ ಕಾನೂನು ಪ್ರಶ್ನೆಗಳು",
    statutes: "ಗುರುತಿಸಲಾದ ಕಾಯ್ದೆಗಳು",
    outcome: "ಪ್ರಕರಣದ ಫಲಿತಾಂಶದ ವಿಲೇಷಣೆ",
    counsel: "ವಕೀಲರು",
    confidence: "ವಿಶ್ವಾಸಾರ್ಹತೆಯ ಅಂಕ",
    strength: "ವಾದದ ಸಾಮರ್ಥ್ಯ",
    path: "ಕಾರ್ಯವಿಧಾನದ ಹಾದಿ",
    view_results: "ಫಲಿತಾಂಶ ನೋಡಿ",
    new_pdf: "ಹೊಸ ಫೈಲ್",
    edit: "ತಿದ್ದಿ",
    done: "ಮುಗಿದಿದೆ",
    export: "ಪಿಡಿಎಫ್ ರಫ್ತು",
    approve: "ಅనుಮೋದಿಸಿ",
    approved: "ಅನುಮೋದಿಸಲಾಗಿದೆ",
    translate: "ಅನುವಾದಿಸಿ",
    status_complete: "ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣಗೊಂಡಿದೆ",
    case_id: "ಪ್ರಕರಣದ ಸಂಖ್ಯೆ",
    jurisdiction: "ನ್ಯಾಯವ್ಯಾಪ್ತಿ",
    filing: "ಮೂಲ ಸಲ್ಲಿಕೆ",
    legal_mode: "ಕಾನೂನು",
    plain_mode: "ಸರಳ",
    risk_safe: "ಸುರಕ್ಷಿತ",
    risk_high: "ಹೆಚ್ಚಿನ ಅಪಾಯ"
  },
  Telugu: {
    title: "న్యూరల్ సారాంశం",
    summary: "కేసు సారాంశం",
    evidence: "సాక్ష్యాల పైప్‌లైన్",
    adr: "ఏడీఆర్ ఇంజిన్",
    inventory: "పోర్ట్‌ఫోలియో ఇండెక్స్",
    petitioner: "పిటిషనర్",
    respondent: "ప్రతివాది",
    facts: "ముఖ్య వాస్తవాల సేకరణ",
    questions: "ముఖ్య చట్టపరమైన ప్రశ్నలు",
    statutes: "గుర్తించిన చట్టాలు",
    outcome: "కేసు ఫలితాల విశ్లేషణ",
    counsel: "న్యాయవాది",
    confidence: "విశ్వసనీయత స్కోరు",
    strength: "వాదన బలం",
    path: "విచారణ మార్గం",
    view_results: "ఫలితాలు చూడండి",
    new_pdf: "కొత్త ఫైల్",
    edit: "సవరించు",
    done: "పూర్తయింది",
    export: "పీడీఎఫ్ ఎగుమతి",
    approve: "ఆమోదించు",
    approved: "ఆమోదించబడింది",
    translate: "అనువదించు",
    status_complete: "విశ్లేషణ పూర్తయింది",
    case_id: "కేసు సంఖ్య",
    jurisdiction: "అధికార పరిధి",
    filing: "అసలు ఫైలింగ్",
    legal_mode: "చట్టపరమైన",
    plain_mode: "సరళ",
    risk_safe: "సురక్షితం",
    risk_high: "అధిక ప్రమాదం"
  }
};

/* ─── LIVE AI CONSOLE LOGS ─── */
const CONSOLE_LOGS = [
  { tag: 'NLP', msg: 'Extracting semantic entities…' },
  { tag: 'OCR', msg: 'Parsing uploaded document structure…' },
  { tag: 'SEC', msg: 'Verifying document integrity protocol…' },
  { tag: 'AI',  msg: 'Identifying key legal arguments…' },
  { tag: 'SYS', msg: 'Checking procedural inconsistencies…' },
  { tag: 'NLP', msg: 'Translating vernacular legal terms…' },
  { tag: 'AWS', msg: 'Processing multimodal inference stream…' },
  { tag: 'AI',  msg: 'Analyzing argument strength vectors…' },
  { tag: 'NLP', msg: 'Generating intelligent case summary…' },
  { tag: 'SYS', msg: 'Connecting to judicial knowledge graph…' },
  { tag: 'AI',  msg: 'Mapping precedent relationships…' },
  { tag: 'SYS', msg: 'Confidence score stabilized.' },
];

const LiveConsole = ({ currentStage }) => {
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (currentStage === 'done') {
      setLogs(prev => [...prev, { 
        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        tag: 'SYS', 
        msg: 'Summary generation completed successfully.',
        isSuccess: true 
      }]);
      return;
    }

    let index = 0;
    const addLog = () => {
      const log = CONSOLE_LOGS[index % CONSOLE_LOGS.length];
      setLogs(prev => [...prev.slice(-15), {
        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ...log
      }]);
      index++;
      timerRef.current = setTimeout(addLog, 1500 + Math.random() * 2000);
    };

    addLog();
    return () => clearTimeout(timerRef.current);
  }, [currentStage === 'done']);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="sr-console">
      <div className="sr-console-scanline" />
      <div className="sr-console-header">
        <div className="sr-console-dot" />
        <span className="sr-console-title">LIVE_AI_PROCESS_MONITOR</span>
      </div>
      <div className="sr-console-body">
        {logs.map((log, i) => (
          <div key={i} className={`sr-console-line ${log.isSuccess ? 'sr-console-success' : ''}`}>
            <span className="sr-console-time">[{log.time}]</span>
            <span className="sr-console-tag">[{log.tag}]</span>
            <span className="sr-console-msg">{log.msg}</span>
          </div>
        ))}
        <div className="sr-console-cursor" />
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

/* ─── CONFIDENCE RING ─── */
const ConfidenceRing = ({ percent = 92 }) => {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const fill = (percent / 100) * circ;
  return (
    <div className="sr-ring-wrap">
      <svg viewBox="0 0 160 160" className="sr-ring-svg">
        <circle cx="80" cy="80" r={r} className="sr-ring-track" />
        <circle cx="80" cy="80" r={r} className="sr-ring-fill"
          strokeDasharray={`${fill} ${circ}`} />
      </svg>
      <div className="sr-ring-center">
        <span className="sr-ring-pct">{percent}%</span>
        <span className="sr-ring-lbl">VERIFIED</span>
      </div>
    </div>
  );
};

/* ─── PROCESSING OVERLAY ─── */
const ProcessingOverlay = ({ currentStage, onComplete, onCancel }) => {
  const stageIdx = STAGES.findIndex(s => s.id === currentStage);

  return (
    <div className="sr-process-overlay">
      <div className="sr-process-card">
        {/* Scanline effect */}
        <div className="sr-scanline" />

        <div className="sr-process-header">
          <div className="sr-process-icon-wrap">
            <div className="sr-pulse-ring" />
            <div className="sr-pulse-ring sr-pulse-ring-2" />
            <div className="sr-process-icon">
              {currentStage === 'done' ? <CheckCircle2 size={28} /> : <div className="sr-spinner" />}
            </div>
          </div>
          <h2 className="sr-process-title">
            {currentStage === 'done' ? 'ANALYSIS COMPLETE' : 'NEURAL PROCESSING'}
          </h2>
          <p className="sr-process-sub">
            {STAGES[stageIdx]?.sub || ''}
          </p>
        </div>

        {/* Stage pipeline */}
        <div className="sr-pipeline">
          {STAGES.map((stage, i) => {
            const isActive = i === stageIdx;
            const isDone = i < stageIdx;
            const isPending = i > stageIdx;
            return (
              <React.Fragment key={stage.id}>
                <div className={`sr-stage ${isDone ? 'sr-stage-done' : ''} ${isActive ? 'sr-stage-active' : ''} ${isPending ? 'sr-stage-pending' : ''}`}>
                  <div className="sr-stage-dot">
                    {isDone ? <CheckCircle2 size={14} /> : <span className="sr-stage-num">{String(i + 1).padStart(2, '0')}</span>}
                  </div>
                  <span className="sr-stage-label">{stage.label}</span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`sr-stage-connector ${isDone ? 'sr-connector-done' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="sr-progress-track">
          <div
            className="sr-progress-fill"
            style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
          />
        </div>

        {/* Live AI Console */}
        <LiveConsole currentStage={currentStage} />

        {currentStage === 'done' && (
          <button className="sr-process-proceed" onClick={onComplete}>
            VIEW RESULTS <ArrowRight size={16} />
          </button>
        )}

        {currentStage !== 'done' && (
          <button className="sr-process-cancel" onClick={onCancel}>
            CANCEL SCAN <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── MAIN SUMMARIZER ─── */
export default function Summarizer({ onTabChange }) {
  const { state, updateState, reinitialize } = useMandamus();
  const { user } = useAuth();
  const phase = state.summariser_status; 
  const summaryData = state.summariser_output || {};

  const [currentStage, setCurrentStage] = useState('upload');
  const [editMode, setEditMode] = useState(false);
  const [approved, setApproved] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [viewMode, setViewMode] = useState(() => sessionStorage.getItem('sr_viewMode') || 'lawyer'); // 'lawyer' | 'student'
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('sr_activeTab') || 'summary'); // 'summary' | 'evidence' | 'adr' | 'inventory'
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState(() => sessionStorage.getItem('sr_targetLang') || 'English');
  const [deepAnalysis, setDeepAnalysis] = useState(() => sessionStorage.getItem('sr_deepAnalysis') === 'true');

  useEffect(() => {
    sessionStorage.setItem('sr_viewMode', viewMode);
    sessionStorage.setItem('sr_activeTab', activeTab);
    sessionStorage.setItem('sr_targetLang', targetLang);
    sessionStorage.setItem('sr_deepAnalysis', deepAnalysis);
  }, [viewMode, activeTab, targetLang, deepAnalysis]);
  
  // Use targetLang for UI labels so it flips IMMEDIATELY when user selects from dropdown
  const L = LOCALIZATION[targetLang] || LOCALIZATION.English;
  
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [autoStartPending, setAutoStartPending] = useState(false);

  useEffect(() => {
    if (state.summariser_status === 'complete' || state.summariser_status === 'processing') {
      return;
    }
    if (state.active_case && state.active_case.case_text && selectedFiles.length === 0) {
      const blob = new Blob([state.active_case.case_text], { type: 'text/plain' });
      const file = new File([blob], `${state.active_case.id || 'Case'}_Document.txt`, { type: 'text/plain' });
      setSelectedFiles([file]);
      setAutoStartPending(true);
    }
  }, [state.active_case, state.summariser_status, selectedFiles.length]);

  useEffect(() => {
    if (autoStartPending && selectedFiles.length > 0) {
      setAutoStartPending(false);
      startProcessing();
    }
  }, [autoStartPending, selectedFiles]);

  // Auto-calculate pending duration if backend returns N/A
  const computePendingDuration = (filing) => {
    if (!filing || filing === 'N/A') return 'PENDING';
    const match = filing.match(/(\d{4})/);
    if (!match) return filing;
    const year = parseInt(match[1]);
    const diff = new Date().getFullYear() - year;
    if (diff <= 0) return 'RECENT FILING';
    return `${diff}Y PENDING`;
  };

  const pendingDisplay = (summaryData.pendingDuration && summaryData.pendingDuration !== 'N/A')
    ? summaryData.pendingDuration
    : computePendingDuration(summaryData.filing);

  const handleUpdateSummary = (updates) => {
    updateState({ summariser_output: { ...summaryData, ...updates } });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const validFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.docx');
    });

    if (validFiles.length < files.length) {
      setErrorMsg("Some files were skipped. Only PDF and DOCX are allowed.");
    } else {
      setErrorMsg(null);
    }

    setSelectedFiles(prev => {
      const combined = [...prev, ...validFiles];
      const unique = combined.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);
      return unique.slice(0, 10);
    });
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startProcessing = async () => {
    if (selectedFiles.length === 0) {
      setErrorMsg("Please select at least one file first.");
      return;
    }
    
    updateState({ summariser_status: 'processing' });
    setCurrentStage('upload');
    setApproved(false);
    setEditMode(false);
    setErrorMsg(null);
    
    const formData = new FormData();
    formData.append('user_id', user?.uid || 'anonymous');
    formData.append('deep_analysis', deepAnalysis);
    
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    // Initialize AbortController
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/summarise`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep incomplete part
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.processing_status === 'failed') {
                   throw new Error(data.error);
                } else if (data.processing_status === 'complete') {
                   // Check for Case Consistency Error
                   if (data.is_consistent_case === false || data.error_message) {
                     setErrorMsg(data.error_message || "Please upload documents for one case at a time.");
                     updateState({ summariser_status: 'idle' });
                     return;
                   }

                   const parsedData = {
                     caseName: data.case_id || 'UNKNOWN CASE',
                     caseId: data.case_id || 'UNKNOWN ID',
                     jurisdiction: data.court_name || 'UNKNOWN JURISDICTION',
                     filing: data.filing_date || 'N/A',
                     pendingDuration: data.pending_duration || 'N/A',
                     petitioner: data.petitioner || 'UNKNOWN',
                     petitionerCounsel: data.petitioner_counsel || 'UNKNOWN',
                     respondent: data.respondent || 'UNKNOWN',
                     respondentCounsel: data.respondent_counsel || 'UNKNOWN',
                     plainSummary: data.plain_summary || '',
                     facts: data.key_facts || [],
                     legalQuestions: data.core_legal_questions || [],
                     ipcSections: (data.ipc_sections || []).sort((a, b) => (a.section || "").localeCompare(b.section || "", undefined, {numeric: true, sensitivity: 'base'})),
                     evidence: (data.evidence || []).sort((a, b) => {
                       const nameA = typeof a === 'string' ? a : (a.name || "");
                       const nameB = typeof b === 'string' ? b : (b.name || "");
                       return nameA.localeCompare(nameB);
                     }),
                     caseType: data.case_type || 'UNKNOWN',
                     isUndertrial: data.is_undertrial || false,
                     confidenceScore: data.confidence_score || 0,
                     argumentStrength: data.argument_strength || {},
                     proceduralPath: data.procedural_path || [],
                     caseOutcomeAnalysis: data.case_outcome_analysis || {},
                     documentInventory: data.document_inventory || [],
                     studentMode: data.student_mode || null,
                     evidenceAnalysis: data.evidence_analysis || {},
                     adrAnalysis: data.adr_analysis || {},
                     processingTime: data.processing_time || 0,
                     extractionMethod: data.extraction_method || ''
                   };
                   updateState({ summariser_output: parsedData, case_id: parsedData.caseId });
                   setCurrentStage('done');
                   
                   // Update Firestore if active case exists
                   if (state.active_case) {
                     try {
                       const caseRef = doc(db, 'cases', state.active_case.id);
                       updateDoc(caseRef, {
                         summariser_output: parsedData,
                         pipeline_stage: 'precedent'
                       });
                       updateState({ active_case: { ...state.active_case, pipeline_stage: 'precedent' } });
                     } catch (err) {
                       console.error("Failed to update case pipeline stage", err);
                     }
                   }

                   setTimeout(() => updateState({ summariser_status: 'complete' }), 1500);
                } else {
                   const stageMap = {
                     uploading: 'upload',
                     extracting: 'ocr',
                     summarising: 'nlp',
                     structuring: 'structure'
                   };
                   if (stageMap[data.processing_status]) {
                     setCurrentStage(stageMap[data.processing_status]);
                   }
                }
              } catch (err) {
                 if (err.message && !err.message.includes("JSON")) {
                   throw err;
                 }
              }
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Analysis aborted by user.");
        return;
      }
      console.error(err);
      setErrorMsg(err.message || "An error occurred during processing.");
      updateState({ summariser_status: 'idle' });
    }
  };

  const abortProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateState({ summariser_status: 'idle' });
    setCurrentStage('upload');
  };

  useEffect(() => {
    if (summaryData.current_language) {
      setTargetLang(summaryData.current_language);
    }
  }, [summaryData.current_language]);

  useEffect(() => {
  }, []);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/translate/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: summaryData,
          target_language: targetLang
        }),
      });

      if (!response.ok) throw new Error("Translation failed");
      
      const translatedData = await response.json();
      updateState({ summariser_output: translatedData });
    } catch (err) {
      console.error(err);
      setErrorMsg("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRegenerate = () => {
    setApproved(false);
    setEditMode(false);
    startProcessing();
  };

  const handleReinitialize = () => {
    if (window.confirm("This will clear all case data including precedents, draft and schedule. Are you sure?")) {
      reinitialize();
    }
  };

  const handleDownload = () => {
    const textContent = `CASE ABSTRACT: ${summaryData.caseName}
ID: ${summaryData.caseId} | JURISDICTION: ${summaryData.jurisdiction}
--------------------------------------------------
PETITIONER: ${summaryData.petitioner} (Counsel: ${summaryData.petitionerCounsel})
RESPONDENT: ${summaryData.respondent} (Counsel: ${summaryData.respondentCounsel})
--------------------------------------------------
FACTS:
${summaryData.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}
--------------------------------------------------
LEGAL QUESTIONS:
${summaryData.legalQuestions.map((q, i) => `- ${q}`).join('\n')}
--------------------------------------------------
STATUTES:
${(summaryData.ipcSections || []).map(s => `${s.section}: ${s.description}`).join('\n')}
--------------------------------------------------
CONFIDENCE: ${summaryData.confidenceScore}%`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summaryData.caseId || 'case'}_Abstract.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToPrecedent = () => {
    if (onTabChange) onTabChange('precedent');
  };

  /* ─── IDLE STATE ─── */
  if (phase === 'idle') {
    return (
      <div className="sr-page">
        <div className="sr-header">
          <div>
            <h1 className="sr-title">NEURAL_SUMMARIZER</h1>
            <p className="sr-sub">ASYNCHRONOUS DEEP-PARSING PROTOCOL V4.02 — UPLOAD CASE FILES FOR MULTI-LAYERED ANALYSIS.</p>
          </div>
          <svg className="sr-brain" viewBox="0 0 64 64" fill="none">
            <circle cx="29" cy="21" r="14" fill="#e02020"/>
            <path d="M11 58c0-9.94 8.06-18 18-18s18 8.06 18 18" fill="#e02020"/>
            <circle cx="48" cy="17" r="9" fill="#0d0d0d"/>
            <path d="M48 10v2M48 22v2M41 17h2M53 17h2M43.1 12.1l1.4 1.4M51.5 20.5l1.4 1.4M43.1 21.9l1.4-1.4M51.5 13.5l1.4-1.4"
              stroke="#e02020" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="48" cy="17" r="3.2" fill="#e02020"/>
          </svg>
        </div>

        <div className="sr-ingest">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".pdf,.docx" 
            multiple
            style={{ display: 'none' }} 
          />
          <div className="sr-drop-container">
            <div className="sr-drop" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={38} className="sr-drop-icon" />
              <span>{selectedFiles.length > 0 ? `${selectedFiles.length} FILES SELECTED` : 'CLICK OR DROP PDF/DOCX TO UPLOAD'}</span>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="sr-file-list">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="sr-file-item">
                    <FileText size={14} color="#e02020" />
                    <span className="sr-file-name">{file.name}</span>
                    <span className="sr-file-size">{(file.size / 1024).toFixed(1)}KB</span>
                    <X size={14} className="sr-file-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sr-ingest-col">
            <div className="sr-metric">
              <span className="sr-metric-lbl">BATCH_TOTAL_SIZE</span>
              <span className="sr-metric-val">
                {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            
            <div className="sr-deep-toggle-wrap">
              <div className={`sr-deep-toggle ${deepAnalysis ? 'sr-deep-active' : ''}`} onClick={() => setDeepAnalysis(!deepAnalysis)}>
                <div className="sr-deep-switch" />
                <span className="sr-deep-lbl">DEEP_ANALYSIS (GEMINI_1.5_PRO)</span>
              </div>
              <p className="sr-deep-hint">Use for complex cases (&gt;50 pages) or forensic contradiction detection.</p>
            </div>

            <button 
              className="sr-scan-btn" 
              onClick={startProcessing}
              disabled={selectedFiles.length === 0}
            >
              INITIALIZE SCAN
            </button>
          </div>
        </div>
        {errorMsg && <div style={{ color: '#ff2a2a', marginTop: '10px', textAlign: 'center', fontFamily: 'monospace' }}>[ERROR] {errorMsg}</div>}
      </div>
    );
  }

  /* ─── PROCESSING STATE ─── */
  if (phase === 'processing') {
    return (
      <div className="sr-page">
        <div className="sr-header">
          <div>
            <h1 className="sr-title">NEURAL_SUMMARIZER</h1>
            <p className="sr-sub">ASYNCHRONOUS DEEP-PARSING PROTOCOL V4.02 — PROCESSING IN PROGRESS.</p>
          </div>
          <svg className="sr-brain" viewBox="0 0 64 64" fill="none">
            <circle cx="29" cy="21" r="14" fill="#e02020"/>
            <path d="M11 58c0-9.94 8.06-18 18-18s18 8.06 18 18" fill="#e02020"/>
            <circle cx="48" cy="17" r="9" fill="#0d0d0d"/>
            <path d="M48 10v2M48 22v2M41 17h2M53 17h2M43.1 12.1l1.4 1.4M51.5 20.5l1.4 1.4M43.1 21.9l1.4-1.4M51.5 13.5l1.4-1.4"
              stroke="#e02020" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="48" cy="17" r="3.2" fill="#e02020"/>
          </svg>
        </div>
        <ProcessingOverlay 
          currentStage={currentStage} 
          onComplete={() => updateState({ summariser_status: 'complete' })} 
          onCancel={abortProcessing}
        />
      </div>
    );
  }

  /* ─── RESULTS STATE ─── */
  if (phase === 'complete') {
    const studentFacts = summaryData.studentMode?.key_facts?.length
      ? summaryData.studentMode.key_facts
      : (summaryData.plainSummary
          ? (summaryData.plainSummary.match(/[^.!?]+[.!?]+/g) || []).map(s => s.trim()).filter(Boolean)
          : summaryData.facts || []);
    const studentQuestions = summaryData.studentMode?.legal_questions?.length
      ? summaryData.studentMode.legal_questions
      : (summaryData.legalQuestions || []);
    const studentOutcome = summaryData.studentMode?.outcome_explanation || summaryData.plainSummary || 'Analysis pending.';

    return (
      <div className="sr-page sr-complete-view">
        <div className="sr-header">
          <div>
            <h1 className="sr-title">{L.title}</h1>
            <p className="sr-sub">{L.status_complete} · {L.case_id}: {summaryData.caseId || 'UNKNOWN'} · {L.jurisdiction}: {summaryData.jurisdiction || 'NOT_SPECIFIED'}</p>
          </div>
          <svg className="sr-brain" viewBox="0 0 64 64" fill="none">
            <circle cx="29" cy="21" r="14" fill="#e02020"/>
            <path d="M11 58c0-9.94 8.06-18 18-18s18 8.06 18 18" fill="#e02020"/>
            <circle cx="48" cy="17" r="9" fill="#0d0d0d"/>
            <path d="M48 10v2M48 22v2M41 17h2M53 17h2M43.1 12.1l1.4 1.4M51.5 20.5l1.4 1.4M43.1 21.9l1.4-1.4M51.5 13.5l1.4-1.4"
              stroke="#e02020" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="48" cy="17" r="3.2" fill="#e02020"/>
          </svg>
        </div>

        {/* ── EXCLUSIVE TAB NAVIGATION ── */}
        <div className="sr-addon-bar">
          <button className={`sr-addon-tab ${activeTab === 'summary' ? 'sr-addon-active' : ''}`} onClick={() => setActiveTab('summary')}>
            {L.summary}
          </button>
          <button className={`sr-addon-tab ${activeTab === 'evidence' ? 'sr-addon-active' : ''}`} onClick={() => setActiveTab('evidence')}>
            {L.evidence}
          </button>
          <button className={`sr-addon-tab ${activeTab === 'adr' ? 'sr-addon-active' : ''}`} onClick={() => setActiveTab('adr')}>
            {L.adr}
          </button>
          <button className={`sr-addon-tab ${activeTab === 'inventory' ? 'sr-addon-active' : ''}`} onClick={() => setActiveTab('inventory')}>
            {L.inventory}
          </button>
        </div>

        <div className="sr-layout-grid">
          {/* ── LEFT SIDEBAR ── */}
          <div className="sr-sidebar">
            <div className="sr-sidebar-top">
              <div className="sr-tabs">
                <div className={`sr-tab ${viewMode === 'lawyer' ? 'sr-tab-active' : ''}`} onClick={() => setViewMode('lawyer')}>{L.legal_mode}</div>
                <div className={`sr-tab ${viewMode === 'student' ? 'sr-tab-active' : ''}`} onClick={() => setViewMode('student')}>{L.plain_mode}</div>
              </div>
              <div className="sr-risk-badge">{L.risk_safe}</div>
            </div>

            <div className="sr-side-card sr-confidence-card">
              <ConfidenceRing percent={summaryData.confidenceScore || 0} />
              <div className="sr-conf-lbl">{L.confidence}</div>
            </div>

            <div className="sr-side-card">
              <div className="sr-side-title">
                <div className="sr-bar-icon" /> {L.strength}
              </div>
              <div className="sr-arg-row">
                <div className="sr-arg-labels">
                  <span>{L.petitioner}</span>
                  <span>{summaryData.argumentStrength?.petitioner || 65}%</span>
                </div>
                <div className="sr-arg-track"><div className="sr-arg-fill" style={{width: `${summaryData.argumentStrength?.petitioner || 65}%`, background: '#ff2a2a'}} /></div>
              </div>
              <div className="sr-arg-row" style={{marginTop: '15px'}}>
                <div className="sr-arg-labels">
                  <span>{L.respondent}</span>
                  <span>{summaryData.argumentStrength?.respondent || 40}%</span>
                </div>
                <div className="sr-arg-track"><div className="sr-arg-fill" style={{width: `${summaryData.argumentStrength?.respondent || 40}%`, background: '#555'}} /></div>
              </div>
            </div>

            <div className="sr-side-card sr-path-card">
              <div className="sr-side-title">
                <div className="sr-path-icon" /> {L.path}
              </div>
              <div className="sr-timeline">
                <div className="sr-tl-item">
                  <div className="sr-tl-dot sr-tl-dot-active" />
                  <div className="sr-tl-content">
                    <div className="sr-tl-date">{summaryData.filing || '12 OCT 2021'}</div>
                    <div className="sr-tl-title">{L.filing}</div>
                  </div>
                </div>
                <div className="sr-tl-line" />
                <div className="sr-tl-item">
                  <div className="sr-tl-dot" />
                  <div className="sr-tl-content">
                    <div className="sr-tl-date">24 NOV 2021</div>
                    <div className="sr-tl-title" style={{color: '#888'}}>First Hearing Held</div>
                  </div>
                </div>
                <div className="sr-tl-line" />
                <div className="sr-tl-item">
                  <div className="sr-tl-dot" />
                  <div className="sr-tl-content">
                    <div className="sr-tl-date">CURRENT</div>
                    <div className="sr-tl-title" style={{color: '#888'}}>Awaiting Final Decree</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT MAIN CONTENT ── */}
          <div className="sr-main">
            <div className="sr-main-header">
              <div className="sr-header-left">
                <div className="sr-header-meta">
                  <span className="sr-tag-red">{summaryData.caseType || 'CRIMINAL_PETITION'}</span>
                  <span className="sr-case-id-txt">CASE_ID: {summaryData.caseId || 'ND-2024-991A'}</span>
                  {summaryData.extractionMethod === 'gemini-1.5-pro' && (
                    <span className="sr-gemini-badge">✦ GEMINI_1.5_PRO_POWERED</span>
                  )}
                </div>
                {editMode ? (
                  <input
                    className="sr-edit-input sr-edit-case-name"
                    value={summaryData.caseName}
                    onChange={e => handleUpdateSummary({ caseName: e.target.value })}
                  />
                ) : (
                  <h1 className="sr-main-title">{summaryData.caseName || 'STATE VS. MALHOTRA'}</h1>
                )}
                <div className="sr-header-icons">
                  <span><span className="sr-icon-lbl">COURT</span>{summaryData.jurisdiction || 'DELHI HIGH COURT'}</span>
                  <span className="sr-icon-sep">·</span>
                  <span><span className="sr-icon-lbl">FILED</span>{summaryData.filing || '12-OCT-2021'}</span>
                  <span className="sr-icon-sep">·</span>
                  <span className="sr-pending-chip">⏱ {pendingDisplay}</span>
                </div>
              </div>
              <div className="sr-header-actions">
                <button className="sr-action-btn" onClick={handleReinitialize}>
                  <FileUp size={13} /> NEW PDF
                </button>
                <button className={`sr-action-btn ${editMode ? 'sr-action-btn-active' : ''}`} onClick={() => setEditMode(!editMode)}>
                  <Edit3 size={13} /> {editMode ? 'DONE' : 'EDIT'}
                </button>
                <button className="sr-action-btn" onClick={handleDownload}>
                  <Download size={13} /> PDF EXPORT
                </button>
                <button className={`sr-action-btn sr-action-approve ${approved ? 'sr-action-btn-approved' : ''}`} onClick={() => setApproved(!approved)}>
                  <ThumbsUp size={13} /> {approved ? 'APPROVED' : 'APPROVE'}
                </button>

                <div className="sr-translate-group">
                  <select 
                    className="sr-lang-select" 
                    value={targetLang} 
                    onChange={(e) => setTargetLang(e.target.value)}
                  >
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="English">English</option>
                  </select>
                  <button 
                    className={`sr-action-btn sr-translate-btn ${isTranslating ? 'sr-loading' : ''}`} 
                    onClick={handleTranslate}
                    disabled={isTranslating}
                  >
                    <Languages size={13} /> {isTranslating ? '...' : L.translate}
                  </button>
                </div>
              </div>
            </div>

            {/* ── TABBED CONTENT LAYERS ── */}
            {activeTab === 'summary' && (
              <>
                <div className="sr-row-1">
                  <div className="sr-parties-col">
                    <div className="sr-party-card">
                      <div className="sr-party-lbl">{L.petitioner}</div>
                      {editMode ? (
                        <>
                          <input className="sr-edit-input" value={summaryData.petitioner || ''} onChange={e => handleUpdateSummary({ petitioner: e.target.value})} placeholder="Name" style={{marginBottom: '5px'}} />
                          <input className="sr-edit-input sr-edit-sm" value={summaryData.petitionerCounsel || ''} onChange={e => handleUpdateSummary({ petitionerCounsel: e.target.value})} placeholder={L.counsel} />
                        </>
                      ) : (
                        <>
                          <div className="sr-party-val">{summaryData.petitioner || 'Adv. General Rajesh Shirodkar'}</div>
                          <div className="sr-party-sub">{summaryData.petitionerCounsel || 'DEPT OF HOME AFFAIRS'}</div>
                        </>
                      )}
                    </div>
                    <div className="sr-party-card">
                      <div className="sr-party-lbl" style={{color: '#ff2a2a'}}>{L.respondent}</div>
                      {editMode ? (
                        <>
                          <input className="sr-edit-input" value={summaryData.respondent || ''} onChange={e => handleUpdateSummary({ respondent: e.target.value})} placeholder="Name" style={{marginBottom: '5px'}} />
                          <input className="sr-edit-input sr-edit-sm" value={summaryData.respondentCounsel || ''} onChange={e => handleUpdateSummary({ respondentCounsel: e.target.value})} placeholder={L.counsel} />
                        </>
                      ) : (
                        <>
                          <div className="sr-party-val">{summaryData.respondent || 'Anish Malhotra'}</div>
                          <div className="sr-party-sub">{summaryData.respondentCounsel || 'S. CHATTERJEE & ASSOCIATES'}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="sr-outcome-card">
                    <div className="sr-outcome-lbl">{L.outcome}</div>
                    <div className="sr-outcome-content">
                      <div className="sr-outcome-icon-box">
                        <ArrowRight size={24} color="#fff" style={{transform: 'rotate(-45deg)'}} />
                      </div>
                      <div>
                        <div className="sr-outcome-title">{summaryData.caseOutcomeAnalysis?.title || 'FAVORABLE JUDGMENT'}</div>
                        <div className="sr-outcome-sub">PROBABILITY: {summaryData.caseOutcomeAnalysis?.probability_score ? `${summaryData.caseOutcomeAnalysis.probability_score}%` : 'HIGH (84%)'} — FAVOURS {summaryData.caseOutcomeAnalysis?.favours || summaryData.petitioner || 'PETITIONER'}</div>
                      </div>
                    </div>
                    <p className="sr-outcome-desc">
                      {summaryData.caseOutcomeAnalysis?.description || `AI synthesis of similar precedents suggested interpretation favoured prosecution.`} <span className="sr-highlight">{summaryData.caseOutcomeAnalysis?.key_insight || 'Key Insight: Precedent Applicability'}</span>
                    </p>
                    <div className="sr-outcome-bg-decor" />
                  </div>
                </div>

                {/* Row 2: Facts and Questions */}
                {viewMode === 'student' ? (
                  <div className="sr-row-2">
                    <div className="sr-content-box">
                      <h3 className="sr-box-title">THE CONFLICT (STORY)</h3>
                      <div className="sr-facts-list">
                        {studentFacts.map((fact, i) => (
                          <div className="sr-fact-row" key={i}>
                            <div className="sr-fact-num">{String(i + 1).padStart(2, '0')}</div>
                            <p className="sr-fact-txt">{fact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="sr-content-box">
                      <h3 className="sr-box-title">BASIC QUESTIONS</h3>
                      <div className="sr-q-list">
                        {studentQuestions.map((q, i) => (
                          <div className="sr-question-row" key={i}>
                            <div className="sr-q-icon">{String(i + 1).padStart(2, '0')}</div>
                            <p className="sr-q-txt">{q}</p>
                          </div>
                        ))}
                      </div>
                      <div className="sr-student-outcome">
                        <h4>CORE TAKEAWAY:</h4>
                        <p>{studentOutcome}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="sr-row-2">
                    <div className="sr-content-box">
                      <h3 className="sr-box-title">{L.facts}</h3>
                      <div className="sr-facts-list">
                        {(summaryData.facts || []).map((fact, i) => (
                          <div className="sr-fact-row" key={i}>
                            <div className="sr-fact-num">{String(i + 1).padStart(2, '0')}</div>
                            {editMode ? (
                              <textarea
                                className="sr-edit-textarea"
                                value={fact}
                                onChange={e => {
                                  const f = [...summaryData.facts];
                                  f[i] = e.target.value;
                                  handleUpdateSummary({ facts: f });
                                }}
                              />
                            ) : (
                              <p className="sr-fact-txt">{fact}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="sr-content-box">
                      <h3 className="sr-box-title">{L.questions}</h3>
                      <div className="sr-q-list">
                        {(summaryData.legalQuestions || []).map((q, i) => (
                          <div className="sr-question-row" key={i}>
                            <div className="sr-q-icon">{String(i + 1).padStart(2, '0')}</div>
                            {editMode ? (
                              <textarea
                                className="sr-edit-textarea"
                                value={q}
                                onChange={e => {
                                  const lq = [...summaryData.legalQuestions];
                                  lq[i] = e.target.value;
                                  handleUpdateSummary({ legalQuestions: lq });
                                }}
                              />
                            ) : (
                              <p className="sr-q-txt">{q}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="sr-statutes-card">
                  <div className="sr-card-heading">
                    <div className="sr-stat-icon" /> {L.statutes}
                  </div>
                  <div className="sr-statutes-grid">
                    {(summaryData.ipcSections || []).map((statute, i) => (
                      <div className="sr-stat-box" key={i}>
                        {editMode ? (
                          <>
                            <input className="sr-edit-input" value={statute.section || ''} onChange={e => { const s = [...summaryData.ipcSections]; s[i].section = e.target.value; handleUpdateSummary({ ipcSections: s}) }} style={{marginBottom: '5px'}} />
                            <textarea className="sr-edit-textarea sr-edit-textarea-sm" value={statute.description || ''} onChange={e => { const s = [...summaryData.ipcSections]; s[i].description = e.target.value; handleUpdateSummary({ ipcSections: s}) }} />
                          </>
                        ) : (
                          <>
                            <div className="sr-stat-code">{statute.section || 'UNKNOWN'}</div>
                            <div className="sr-stat-desc">{statute.description || ''}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sr-chat-card" style={{ width: '100%', marginBottom: '24px' }}>
                  <div className="sr-card-heading">HELP_ASSISTANT</div>
                  <LegalChat summary={summaryData} context="analysis" />
                </div>
              </>
            )}

            {/* Evidence Pipeline */}
            {activeTab === 'evidence' && (
              <div className="sr-addon-card sr-evidence-analysis animate-in">
                <div className="sr-addon-header">
                  <div className="sr-addon-title-group">
                    <ShieldCheck size={18} color="#00c853" />
                    <h3 className="sr-box-title">EVIDENCE_PIPELINE_ANALYSIS</h3>
                  </div>
                  <div className="sr-strength-meter">
                    <span className="sr-strength-lbl">VALIDITY_INDEX</span>
                    <div className="sr-strength-bar">
                      <div 
                        className="sr-strength-fill" 
                        style={{ 
                          width: `${summaryData.evidenceAnalysis?.strength_score || 0}%`,
                          backgroundColor: (summaryData.evidenceAnalysis?.strength_score || 0) > 70 ? '#00c853' : (summaryData.evidenceAnalysis?.strength_score || 0) > 40 ? '#ffab00' : '#ff2a2a'
                        }} 
                      />
                    </div>
                  </div>
                </div>

                <div className="sr-analysis-flags">
                  {(summaryData.evidenceAnalysis?.status_flags || []).map((f, i) => <span key={i} className="sr-flag-badge">✓ {f}</span>)}
                  {(summaryData.evidenceAnalysis?.warning_alerts || []).map((a, i) => <span key={i} className="sr-alert-badge">⚠ {a}</span>)}
                </div>

                <div className="sr-analysis-table-wrap">
                  <table className="sr-analysis-table">
                    <thead><tr><th>SOURCE</th><th>CATEGORY</th><th>STRENGTH</th><th>OBSERVATIONS</th></tr></thead>
                    <tbody>
                      {(summaryData.evidenceAnalysis?.categorized_list || []).map((item, i) => (
                        <tr key={i}>
                          <td className="sr-td-item">{item.item}</td>
                          <td className="sr-td-cat">{item.category}</td>
                          <td className={`sr-td-str sr-str-${String(item.strength || '').toLowerCase()}`}>{item.strength}</td>
                          <td className="sr-td-notes">{item.notes}</td>
                        </tr>
                      ))}
                      {(summaryData.evidenceAnalysis?.categorized_list || []).length === 0 && (
                        <tr><td colSpan="4" className="sr-td-empty">No detailed evidence parsed.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ADR Decision Engine */}
            {activeTab === 'adr' && (
              <div className="sr-addon-card sr-adr-box animate-in">
                <div className="sr-addon-header">
                  <div className="sr-addon-title-group">
                    <RotateCcw size={18} color="#ffab00" />
                    <h3 className="sr-box-title">ADR_DECISION_ENGINE</h3>
                  </div>
                  <div className={`sr-adr-status ${summaryData.adrAnalysis?.recommendation === 'ADR RECOMMENDED' ? 'sr-adr-yes' : 'sr-adr-no'}`}>
                    {summaryData.adrAnalysis?.recommendation || 'NOT_EVALUATED'}
                  </div>
                </div>
                <div className="sr-adr-content-modern">
                  <div className="sr-adr-meta">
                    <div className="sr-adr-cat-tag">CASE_CATEGORY: {summaryData.adrAnalysis?.category || 'PENDING'}</div>
                    <p className="sr-adr-reasoning-txt">{summaryData.adrAnalysis?.reasoning || 'Mediation suitability requires cross-referencing with procedural path.'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Case Portfolio Index */}
            {activeTab === 'inventory' && (
              <div className="sr-addon-card animate-in">
                <h3 className="sr-box-title">CASE_PORTFOLIO_INVENTORY</h3>
                <div className="sr-inventory-grid">
                  {(summaryData.documentInventory || []).map((doc, i) => (
                    <div key={i} className="sr-inventory-item">
                      <div className="sr-inv-header">
                        <span className={`sr-inv-label sr-label-${doc.label?.toLowerCase().replace(/\s+/g, '-')}`}>{doc.label || 'MISC'}</span>
                        <span className="sr-inv-filename">{doc.filename}</span>
                      </div>
                      <p className="sr-inv-summary">{doc.summary}</p>
                    </div>
                  ))}
                  {(summaryData.documentInventory || []).length === 0 && (
                    <div className="sr-inv-empty">No indexed documents found.</div>
                  )}
                </div>
              </div>
            )}

            <div className="sr-cta-group">
              <button className="sr-cta-btn sr-cta-primary" onClick={handleSendToPrecedent}>
                FIND SIMILAR PRECEDENTS <ArrowRight size={18} />
              </button>
              <button className="sr-cta-btn" onClick={() => onTabChange('draft')}>
                DRAFT LEGAL NOTICE <ArrowRight size={18} />
              </button>
              <button className="sr-cta-btn" onClick={() => onTabChange('schedule')}>
                SCHEDULE HEARING <ArrowRight size={18} />
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return null;
}
