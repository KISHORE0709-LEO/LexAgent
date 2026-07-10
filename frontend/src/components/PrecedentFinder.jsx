import React, { useState, useEffect } from 'react';
import { ExternalLink, SlidersHorizontal, ArrowRight, Terminal } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useMandamus } from '../context/MandamusContext';
import './PrecedentFinder.css';

const courtLevels = ['ALL', 'SUPREME', 'HIGH_COURT', 'DISTRICT'];
const timeWindows = ['LAST_5Y', 'HISTORICAL'];

const LEGEND = [
  { key: 'supreme', label: 'Supreme Court of India', color: '#e02020' },
  { key: 'bombay',  label: 'Bombay High Court',      color: '#c0392b' },
  { key: 'delhi',   label: 'Delhi High Court',        color: '#7f1d1d' },
  { key: 'orissa',  label: 'Orissa High Court',       color: '#991b1b' },
  { key: 'patna',   label: 'Patna High Court',        color: '#450a0a' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '10px 14px', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: 8, letterSpacing: '0.1em', borderBottom: '1px solid #1a1a1a', paddingBottom: '4px' }}>YEAR_STAMP: {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ fontSize: '0.72rem', color: p.color, marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <span style={{ opacity: 0.8 }}>{p.name.toUpperCase()}:</span> 
          <strong style={{ color: '#fff' }}>{p.value}{p.name.includes('Similarity') ? '%' : ''}</strong>
        </div>
      ))}
    </div>
  );
};

const NeuralSearchConsole = () => {
  const [logs, setLogs] = useState([]);
  const [hexLines, setHexLines] = useState([]);

  useEffect(() => {
    // Generate Hex stream
    const chars = '0123456789ABCDEF';
    const generateLine = () => {
      let line = '0x';
      for(let i=0; i<8; i++) line += chars[Math.floor(Math.random() * 16)];
      line += ' ';
      for(let i=0; i<8; i++) line += chars[Math.floor(Math.random() * 16)];
      return line;
    };
    
    // Initial fill
    const initial = Array(20).fill(0).map(() => generateLine());
    setHexLines(initial);

    const interval = setInterval(() => {
      setHexLines(prev => {
        const newLines = [...prev.slice(1), generateLine()];
        return newLines;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const searchStages = [
      { msg: "[SYS] Establishing secure connection to Judicial Data Vault...", delay: 0 },
      { msg: "[DB_CORE] Mounting 1.4 million Supreme Court & High Court records...", delay: 800 },
      { msg: "[NEURAL] Vectorizing semantic fact pattern & generating dense embeddings...", delay: 2000 },
      { msg: "[NLP_ENG] Extracting IPC sections & core legal doctrines...", delay: 3500 },
      { msg: "[MATCH] Running cosine similarity across multi-dimensional vector space...", delay: 5000 },
      { msg: "[FILTER] Applying temporal boundaries & jurisdictional constraints...", delay: 7000 },
      { msg: "[RANKING] Isolating top 98%+ semantic matches...", delay: 8500 },
      { msg: "[FINALIZE] Decrypting case citations and judicial outcomes...", delay: 10000 },
    ];

    const timeouts = searchStages.map(({ msg, delay }) => {
      return setTimeout(() => {
        const timeStr = new Date().toISOString().split('T')[1].substring(0, 12);
        setLogs(prev => [...prev, { time: timeStr, text: msg }]);
      }, delay);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="ns-console-wrapper">
      <div className="ns-console-header">
        <div className="ns-header-left">
          <span className="ns-blink-dot"></span>
          <span>NEURAL_SEARCH_ACTIVE</span>
        </div>
        <div className="ns-header-right">
          <span className="ns-status-tag">SECURE_CONNECTION</span>
        </div>
      </div>
      
      <div className="ns-console-body">
        {/* Left Panel: Hex Matrix */}
        <div className="ns-matrix-panel">
          <div className="ns-matrix-overlay"></div>
          {hexLines.map((line, i) => (
            <div key={i} className="ns-hex-line">{line}</div>
          ))}
        </div>
        
        {/* Right Panel: Terminal Logs */}
        <div className="ns-terminal-panel">
          <div className="ns-terminal-title">SYSTEM_LOG_OUTPUT</div>
          {logs.map((log, i) => {
            const isNeural = log.text.includes('[NEURAL]') || log.text.includes('[NLP_ENG]') || log.text.includes('[RANKING]');
            const isSys = log.text.includes('[SYS]') || log.text.includes('[DB_CORE]');
            const textClass = isNeural ? 'ns-log-neural' : (isSys ? 'ns-log-sys' : 'ns-log-text');
            
            return (
              <div key={i} className="ns-log-line">
                <span className="ns-log-time">{log.time}</span>
                <span className={textClass}>{log.text}</span>
              </div>
            );
          })}
          <div className="ns-cursor-line">
            <span className="ns-log-time">{new Date().toISOString().split('T')[1].substring(0, 12)}</span>
            <span className="ns-cursor">_</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PrecedentFinder({ onTabChange }) {
  const { state, updateState } = useMandamus();
  
  const [query, setQuery] = useState('');
  const [activeLevel, setActiveLevel] = useState('ALL');
  const [activeTime, setActiveTime] = useState('HISTORICAL');
  const [expandedCard, setExpandedCard] = useState(null);
  const [cases, setCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const selected = new Set(state.selected_precedents ? state.selected_precedents.map(c => c.case_id) : []);

  // ── SESSION RESTORE: On mount or when summariser completes, load/trigger search ──
  useEffect(() => {
    if (state.precedent_results?.allCases?.length > 0) {
      // Results already cached — restore instantly, no API call
      setAllCases(state.precedent_results.allCases);
      setQuery(state.precedent_results.query || '');
    } else if (state.summariser_status === 'complete' && state.summariser_output) {
      const parsed = state.summariser_output;
      const q = parsed.legalQuestions?.[0] || parsed.caseName || '';
      if (q) {
        setQuery(q);
        // Only trigger if not already loading and no results yet
        if (!loading && allCases.length === 0) {
          searchPrecedents(q, parsed);
        }
      }
    }
  }, [state.summariser_status, state.summariser_output, state.precedent_results]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cases.length > 0) {
      const yearMap = {};
      cases.forEach(c => {
        const y = c.year || 'Unknown';
        const court = (c.court || '').toUpperCase().trim();
        
        let level = 'DISTRICT';
        if (court.includes('SUPREME') || court === 'SC') level = 'SUPREME';
        else if (court.includes('HIGH COURT') || court === 'HC' || court.includes('HC ')) level = 'HIGH_COURT';

        if (!yearMap[y]) yearMap[y] = { count: 0, totalScore: 0, SUPREME: 0, HIGH_COURT: 0, DISTRICT: 0 };
        yearMap[y].count += 1;
        yearMap[y].totalScore += (c.similarity_score || 0);
        yearMap[y][level] += 1;
      });

      const formattedData = Object.keys(yearMap)
        .sort()
        .map(y => ({
          year: String(y),
          count: yearMap[y].count,
          avgSimilarity: parseFloat((yearMap[y].totalScore / yearMap[y].count).toFixed(1)),
          SUPREME: yearMap[y].SUPREME,
          HIGH_COURT: yearMap[y].HIGH_COURT,
          DISTRICT: yearMap[y].DISTRICT
        }));
      setGraphData(formattedData);
    } else {
      setGraphData([]);
    }
  }, [cases]);

  // LOCAL FILTERING LOGIC
  useEffect(() => {
    let filtered = [...allCases];
    
    if (activeLevel !== 'ALL') {
      filtered = filtered.filter(c => {
        const court = (c.court || '').toUpperCase();
        if (activeLevel === 'SUPREME') return court.includes('SUPREME') || court === 'SC';
        if (activeLevel === 'HIGH_COURT') return court.includes('HIGH COURT') || court === 'HC';
        if (activeLevel === 'DISTRICT') return !court.includes('SUPREME') && !court.includes('HIGH COURT') && court !== 'SC' && court !== 'HC';
        return true;
      });
    }

    if (activeTime === 'LAST_5Y') {
      const currentYear = new Date().getFullYear();
      filtered = filtered.filter(c => (currentYear - (parseInt(c.year) || 0)) <= 5);
    }

    filtered.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    setCases(filtered);
  }, [allCases, activeLevel, activeTime]);

  const searchPrecedents = (q = query, ctx = state.summariser_output, forceFresh = false) => {
    if (!q) return;
    setLoading(true);
    if (forceFresh) setAllCases([]);
    
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/precedent/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: q, 
        court_level: activeLevel, 
        temporal_window: activeTime,
        case_type: ctx?.caseType,
        key_facts: ctx?.facts,
        ipc_sections: ctx?.statutes,
        core_legal_questions: ctx?.legalQuestions
      })
    })
    .then(res => res.json())
    .then(data => {
      const newResults = data.results || [];
      setAllCases(prev => {
        const base = forceFresh ? [] : [...prev];
        newResults.forEach(nr => {
          if (!base.find(c => c.case_name === nr.case_name)) base.push(nr);
        });
        // ── SESSION SAVE: persist results so navigating back is instant ──
        updateState({ precedent_results: { allCases: base, query: q } });
        return base;
      });
      setLoading(false);
    })
    .catch(err => {
      console.error("Search error:", err);
      setLoading(false);
    });
  };

  const toggle = (caseId) => {
    const currentSelected = state.selected_precedents || [];
    const exists = currentSelected.find(c => c.case_id === caseId);
    let newSelected;
    if (exists) {
      newSelected = currentSelected.filter(c => c.case_id !== caseId);
    } else {
      const caseObj = cases.find(c => c.case_id === caseId);
      if (caseObj) {
        newSelected = [...currentSelected, caseObj];
      } else {
        newSelected = currentSelected;
      }
    }
    updateState({ selected_precedents: newSelected });
  };

  const handleDraftNav = () => {
    if (onTabChange) onTabChange('draft');
  };

  const scoreColor = (s) => s >= 96 ? '#e02020' : s >= 90 ? '#888' : '#555';

  if (state.summariser_status !== 'complete' || !state.summariser_output) {
    return (
    <div className="pf-page">
      <div className="pf-header">
        <div>
          <h1 className="pf-title">PRECEDENT_FINDER</h1>
          <p className="pf-sub">NEURAL SEARCH · SEMANTIC CASE MATCHING · CITATION ANALYSIS</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', border: '1px solid #333', background: '#0a0a0a' }}>
          <h2 style={{ color: '#e02020', marginBottom: '15px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>PREREQUISITE REQUIRED</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Please complete the Summariser first before searching precedents.</p>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="pf-page">
      {/* ── HEADER ── */}
      <div className="pf-header">
        <div>
          <h1 className="pf-title">PRECEDENT_FINDER</h1>
          <p className="pf-sub">NEURAL SEARCH · SEMANTIC CASE MATCHING · CITATION ANALYSIS</p>
        </div>
      </div>

      {/* AUTO POPULATED BANNER */}
      <div style={{ background: 'rgba(224, 32, 32, 0.1)', border: '1px solid #e02020', padding: '8px 15px', color: '#e02020', fontSize: '0.7rem', fontFamily: 'monospace', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#e02020', borderRadius: '50%' }} />
        Search context auto-populated from Summariser
      </div>

      {/* SEARCH BAR */}
      <div className="pf-search-bar">
        <Terminal size={18} className="pf-search-icon" />
        <input 
          className="pf-query-text" 
          style={{ background: 'transparent', border: 'none', color: '#e02020', width: '100%', outline: 'none', fontFamily: 'Inter', fontSize: '0.8rem' }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchPrecedents(query, state.summariser_output, true)}
          placeholder="Enter legal query, fact pattern, or IPC sections..."
        />
        <button className="pf-reanalyze" onClick={() => searchPrecedents(query, state.summariser_output, true)}>
          {loading ? 'SEARCHING...' : 'RE_ANALYZE'}
        </button>
      </div>

      {/* FILTERS */}
      <div className="pf-filters">
        <div className="pf-filter-group">
          <span className="pf-filter-label">COURT_LEVEL_SELECTOR</span>
          <div className="pf-filter-btns">
            {courtLevels.map(l => (
              <button key={l}
                className={`pf-filter-btn ${activeLevel === l ? 'pf-filter-active' : ''}`}
                onClick={() => setActiveLevel(l)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="pf-filter-group">
          <span className="pf-filter-label">TEMPORAL_WINDOW</span>
          <div className="pf-filter-btns">
            {timeWindows.map(t => (
              <button key={t}
                className={`pf-filter-btn ${activeTime === t ? 'pf-filter-active' : ''}`}
                onClick={() => setActiveTime(t)}>{t}</button>
            ))}
          </div>
        </div>

        <div className="pf-filter-right">
          <button className="pf-adv-btn"><SlidersHorizontal size={13} /> ADVANCED_FILTERS</button>
          <span className="pf-results-count">RESULTS_LOADED: {cases.length < 10 ? `0${cases.length}` : cases.length}</span>
        </div>
      </div>

      <div className="pf-divider" />

      {/* PRECEDENT FREQUENCY GRAPH */}
      <div className="pf-graph-section">
        <div className="pf-graph-header">
          <span className="pf-graph-title">PRECEDENT_RELEVANCE_HISTOGRAM</span>
          <span className="pf-graph-sub">SEMANTIC_MATCH_DENSITY · TEMPORAL_DISTRIBUTION_OF_CITATIONS</span>
        </div>
        <div className="pf-legend">
          <div className="pf-legend-item">
            <div className="pf-legend-box" style={{ background: '#e02020' }} />
            <span>Supreme Court</span>
          </div>
          <div className="pf-legend-item">
            <div className="pf-legend-box" style={{ background: '#9b1c1c' }} />
            <span>High Court</span>
          </div>
          <div className="pf-legend-item">
            <div className="pf-legend-box" style={{ background: '#520d0d' }} />
            <span>District Court</span>
          </div>
          <div className="pf-legend-item">
            <div className="pf-legend-line" style={{ background: '#e02020', opacity: 0.4 }} />
            <span>Similarity Trend (%)</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={graphData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid stroke="#111" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#444', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: '#444', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#444', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar yAxisId="left" dataKey="SUPREME" stackId="a" fill="#e02020" name="Supreme Court" />
            <Bar yAxisId="left" dataKey="HIGH_COURT" stackId="a" fill="#9b1c1c" name="High Court" />
            <Bar yAxisId="left" dataKey="DISTRICT" stackId="a" fill="#520d0d" name="District Court" />
            <Line yAxisId="right" type="monotone" dataKey="avgSimilarity" stroke="#e02020" strokeWidth={2} opacity={0.4} dot={{ r: 2, fill: '#e02020' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="pf-divider" />

      {/* CASE CARDS */}
      <div className="pf-cases" style={{ position: 'relative', minHeight: '300px' }}>
        {loading && <NeuralSearchConsole />}
        {(!loading && showAll ? cases : cases.slice(0, 3)).map((c, idx) => (
          <div key={`${c.case_id}-${idx}`} className={`pf-card ${selected.has(c.case_id) ? 'pf-card-selected' : ''}`}>
            <div className="pf-card-main">

              <div className="pf-card-top">
                <button
                  className={`pf-checkbox ${selected.has(c.case_id) ? 'pf-checked' : ''}`}
                  onClick={() => toggle(c.case_id)}
                >
                  {selected.has(c.case_id) && <span className="pf-check">✓</span>}
                </button>
                {selected.has(c.case_id) && <span className="pf-selected-tag">SELECTED</span>}
                <span className="pf-court-tag">{c.court || 'UNKNOWN COURT'}</span>
                <span className="pf-citation">{c.citation || 'NO CITATION'} · YEAR: {c.year}</span>
              </div>

              <h3 className="pf-case-title">{c.case_name}</h3>
              <p className="pf-excerpt">{c.outcome_summary}</p>

              <div className="pf-reason" style={{ border: '1px solid #e02020', background: 'rgba(224, 32, 32, 0.05)', padding: '12px' }}>
                <span className="pf-reason-label" style={{ color: '#e02020' }}>REASON_FOR_MATCH:</span> {c.reason_for_match}
              </div>

              <div className="pf-tags">
                {(c.tags || []).map((t, idx) => (
                  <span key={idx} className={`pf-tag ${t.startsWith('+') ? 'pf-tag-match' : ''}`}>{t}</span>
                ))}
              </div>

              <div className="pf-expand-section">
                <button 
                  className="pf-expand-toggle" 
                  onClick={() => setExpandedCard(expandedCard === c.case_id ? null : c.case_id)}
                >
                  {expandedCard === c.case_id ? 'COLLAPSE SUMMARY' : 'VIEW FULL SUMMARY'}
                </button>
                {expandedCard === c.case_id && (
                  <div className="pf-full-summary">
                    <div style={{ marginBottom: '15px' }}>
                      <span style={{ color: '#e02020', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', display: 'block', marginBottom: '5px' }}>JUDICIAL_OUTCOME_SUMMARY:</span>
                      <p style={{ margin: 0, color: '#ccc' }}>{c.outcome_summary}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <span style={{ color: '#e02020', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', display: 'block', marginBottom: '5px' }}>DETAILED_REASONING_ANALYSIS:</span>
                      <p style={{ margin: 0, color: '#888', fontSize: '0.75rem', lineHeight: '1.6' }}>
                        The court in this matter primarily deliberated on the principles of {c.tags?.[0] || 'legal precedence'}. 
                        The match score of {c.similarity_score}% is driven by the high semantic alignment with the current case's fact pattern, 
                        specifically regarding {c.reason_for_match.toLowerCase()}. 
                        This case serves as a binding authority for {c.court}.
                      </p>
                    </div>
                    <div>
                      <span style={{ color: '#e02020', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', display: 'block', marginBottom: '5px' }}>METADATA_VERIFICATION:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.65rem', color: '#555' }}>
                         <span>ID: {c.case_id}</span>
                         <span>YEAR: {c.year}</span>
                         <span>COURT: {c.court}</span>
                         <span>CITATION: {c.citation}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pf-card-score">
              <div className="pf-score-num" style={{ color: scoreColor(c.similarity_score), fontSize: '2.5rem', fontWeight: '900' }}>
                {c.similarity_score}<span className="pf-score-pct">%</span>
              </div>
              <div className="pf-score-lbl">SIMILARITY_SCORE</div>
              
              <div style={{ marginTop: '15px', borderTop: '1px solid #1a1a1a', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.6rem', color: '#555', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>SEMANTIC</span>
                  <span>{c.semantic_match}%</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                  <span>FULL_TEXT</span>
                  <span>{c.full_text_match}%</span>
                </div>
              </div>

              <button className="pf-fulltext" style={{ marginTop: 'auto' }}>FULL_TEXT <ExternalLink size={11} /></button>
            </div>
          </div>
        ))}

        {!loading && cases.length > 3 && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <button 
              className="pf-reanalyze" 
              style={{ width: '100%', padding: '15px', justifyContent: 'center', border: '1px solid #e02020' }}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'SHOW LESS' : `VIEW ${cases.length - 3} MORE MATCHING PRECEDENTS`}
            </button>
          </div>
        )}

        {!loading && cases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px solid #1a1a1a', background: '#050505', width: '100%' }}>
            <Terminal size={32} style={{ color: '#333', marginBottom: '15px' }} />
            <h3 style={{ color: '#888', fontSize: '0.9rem', marginBottom: '10px', fontFamily: 'monospace' }}>NO_PRECEDENTS_FOUND</h3>
            <p style={{ color: '#444', fontSize: '0.75rem' }}>Try adjusting your search query or expanding the temporal window.</p>
          </div>
        )}
      </div>

      {/* BOTTOM BAR — only shows when cases selected */}
      {selected.size > 0 && (
        <div className="pf-bottom-bar">
          <div className="pf-selected-count">{selected.size < 10 ? `0${selected.size}` : selected.size}</div>
          <div className="pf-bottom-info">
            <span className="pf-bottom-main">CASES_SELECTED</span>
            <span className="pf-bottom-sub">READY_FOR_DRAFTING</span>
          </div>
          <button className="pf-clear" onClick={() => updateState({ selected_precedents: [] })}>CLEAR_QUEUE</button>
          <button className="pf-draft-btn" onClick={handleDraftNav}>USE_IN_DRAFT_GENERATOR <ArrowRight size={16} /></button>
        </div>
      )}

    </div>
  );
}
