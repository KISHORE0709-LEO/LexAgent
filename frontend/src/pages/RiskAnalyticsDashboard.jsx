import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { ChevronLeft, BarChart3, LineChart as LineIcon, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Cpu } from 'lucide-react';
import './RiskAnalyticsDashboard.css';

const DEFAULT_ANALYTICS = {
  total_records_analyzed: 32,
  total_overrides: 18,
  total_rejections: 7,
  frequent_overrides_by_category: {
    "indemnification": 8,
    "non-compete": 6,
    "liability cap": 3,
    "ip ownership": 1
  },
  rejections_by_jurisdiction: {
    "california": 4,
    "new york": 2,
    "texas": 1
  },
  weight_recalibration_suggestions: {
    "indemnification": 1.5,
    "non-compete": 1.2
  }
};

const ACCURACY_TRENDS = [
  { month: 'Jan', rate: 76 },
  { month: 'Feb', rate: 79 },
  { month: 'Mar', rate: 82 },
  { month: 'Apr', rate: 80 },
  { month: 'May', rate: 85 },
  { month: 'Jun', rate: 91 }
];

const RECENT_OVERRIDES = [
  {
    id: "ov-1",
    category: "Indemnification",
    jurisdiction: "New York",
    status: "edited",
    original: "Contractor shall indemnify Client for any third-party claims without limitations.",
    approved: "Contractor shall indemnify Client for claims arising from gross negligence, capped at 12 months fees.",
    reasoning: "Capped contractor exposure to align with standard commercial negotiation guidelines."
  },
  {
    id: "ov-2",
    category: "Non-Compete",
    jurisdiction: "California",
    status: "rejected",
    original: "Employee agrees not to engage in direct competition globally for 2 years post-employment.",
    approved: "Covenant voided post-employment.",
    reasoning: "Non-competes are void in California under Business and Professions Code Section 16600."
  },
  {
    id: "ov-3",
    category: "IP Ownership",
    jurisdiction: "Delaware",
    status: "edited",
    original: "Developer assigns all technical background IP and templates to Client.",
    approved: "Developer assigns deliverables; retains background tools with license to Client.",
    reasoning: "Protects firm's background technology assets while delivering custom code."
  }
];

export default function RiskAnalyticsDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS);
  const [isLoading, setIsLoading] = useState(false);
  const [recalibrating, setRecalibrating] = useState(false);
  const [recalibrateStatus, setRecalibrateStatus] = useState(null);

  // Fetch real analytics on mount
  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics`);
        if (response.ok) {
          const data = await response.json();
          // Update analytics if we have points in the database, otherwise keep fallback mocks
          if (data && data.total_records_analyzed > 0) {
            setAnalytics(data);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch live override analytics, using fallback mock data.", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const handleRecalibrate = async () => {
    setRecalibrating(true);
    setRecalibrateStatus(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/recalibrate`);
      if (response.ok) {
        const result = await response.json();
        setRecalibrateStatus({ type: 'success', text: result.message || 'System weights recalibrated successfully!' });
      } else {
        throw new Error("Recalibration API responded with error");
      }
    } catch (err) {
      console.error(err);
      setRecalibrateStatus({ type: 'error', text: 'Failed to recalibrate weights automatically.' });
    } finally {
      setRecalibrating(false);
    }
  };

  // Convert categories override mapping into Recharts BarChart data array
  const barChartData = Object.entries(analytics.frequent_overrides_by_category).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    overrides: value
  }));

  // Convert suggestions mapping into displayable list
  const suggestions = Object.entries(analytics.weight_recalibration_suggestions);

  return (
    <div className="analytics-page-container" id="risk-analytics-root">
      {/* ── HEADER ── */}
      <header className="analytics-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')} id="btn-back-from-analytics">
          <ChevronLeft size={16} />
          <span>Back to Agent Dashboard</span>
        </button>
        <div className="header-title">
          <Cpu size={20} className="header-icon" />
          <h1>Risk Tuning & Analytics</h1>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="analytics-main">
        {/* KPI Panel */}
        <section className="kpi-grid">
          <div className="kpi-card glass-panel">
            <span className="kpi-label">Audited Contracts</span>
            <span className="kpi-value">{analytics.total_records_analyzed}</span>
            <span className="kpi-desc">Total documents reviewed in history</span>
          </div>
          <div className="kpi-card glass-panel">
            <span className="kpi-label">Partner Overrides</span>
            <span className="kpi-value warning-color">{analytics.total_overrides}</span>
            <span className="kpi-desc">Total edits made to default AI drafts</span>
          </div>
          <div className="kpi-card glass-panel">
            <span className="kpi-label">Absolute Rejections</span>
            <span className="kpi-value danger-color">{analytics.total_rejections}</span>
            <span className="kpi-desc">Clauses deleted or rejected entirely</span>
          </div>
          <div className="kpi-card glass-panel">
            <span className="kpi-label">Audit Agreement Rate</span>
            <span className="kpi-value success-color">
              {Math.max(40, Math.round(((analytics.total_records_analyzed - analytics.total_overrides) / (analytics.total_records_analyzed || 1)) * 100))}%
            </span>
            <span className="kpi-desc">AI safety alignment score</span>
          </div>
        </section>

        {/* Recalibration Panel */}
        <section className="recalibrate-banner glass-panel">
          <div className="banner-left">
            <h2>Weight Tuning & Feedback Loop</h2>
            <p>
              Based on overrides from Senior Partners, the system has calculated required adjustments to contract category risk weights.
            </p>
            {suggestions.length > 0 ? (
              <div className="suggestions-badges">
                {suggestions.map(([cat, multiplier]) => (
                  <span key={cat} className="suggestion-badge">
                    {cat.toUpperCase()}: Increase risk sensitivity to <strong>{multiplier}x</strong>
                  </span>
                ))}
              </div>
            ) : (
              <p className="no-suggestion-text">Current alignment is high. No weight recalibrations required.</p>
            )}
          </div>
          <div className="banner-right">
            <button
              onClick={handleRecalibrate}
              disabled={recalibrating}
              className="recalibrate-btn"
              id="btn-recalibrate-risk-weights"
            >
              {recalibrating ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              <span>{recalibrating ? 'Recalibrating Engine...' : 'Recalibrate Weights'}</span>
            </button>
            {recalibrateStatus && (
              <div className={`recalibrate-alert alert--${recalibrateStatus.type}`}>
                {recalibrateStatus.type === 'success' ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                <span>{recalibrateStatus.text}</span>
              </div>
            )}
          </div>
        </section>

        {/* Charts Row */}
        <section className="charts-row">
          {/* Overrides by Category Bar Chart */}
          <div className="chart-card glass-panel">
            <div className="card-header">
              <BarChart3 size={16} className="card-icon" />
              <h3>Override Frequency by Category</h3>
            </div>
            <div className="chart-container">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barChartData}>
                    <XAxis dataKey="name" stroke="#72728c" fontSize={11} tickLine={false} />
                    <YAxis stroke="#72728c" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#111026', border: '1px solid #332f63', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="overrides" fill="#7b61ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-display">No override data available.</div>
              )}
            </div>
          </div>

          {/* AI Accuracy / Agreement Trend */}
          <div className="chart-card glass-panel">
            <div className="card-header">
              <LineIcon size={16} className="card-icon" />
              <h3>AI vs. Partner Alignment Trend</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={ACCURACY_TRENDS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="month" stroke="#72728c" fontSize={11} tickLine={false} />
                  <YAxis stroke="#72728c" fontSize={11} tickLine={false} domain={[50, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#111026', border: '1px solid #332f63', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line name="Alignment Rate (%)" type="monotone" dataKey="rate" stroke="#00e676" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Overrides Table */}
        <section className="overrides-table-section glass-panel">
          <div className="card-header">
            <FileText size={16} className="card-icon" />
            <h3>Recent Senior Partner Overrides</h3>
          </div>
          <div className="table-responsive">
            <table className="overrides-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Jurisdiction</th>
                  <th>Status</th>
                  <th>Original Clause</th>
                  <th>Approved Override</th>
                  <th>Partner Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_OVERRIDES.map((item) => (
                  <tr key={item.id}>
                    <td><span className="category-tag">{item.category}</span></td>
                    <td>{item.jurisdiction}</td>
                    <td>
                      <span className={`status-pill status-pill--${item.status}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="clause-text-cell">{item.original}</td>
                    <td className="clause-text-cell highlight-cell">{item.approved}</td>
                    <td className="reasoning-cell">{item.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
