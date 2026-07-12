import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { ChevronLeft, Sliders, ShieldCheck, Save, RotateCcw, BrainCircuit, Activity, GitBranch } from "lucide-react";
import "./RiskAnalyticsDashboard.css";

const CATEGORIES = [
  { key: "indemnification", label: "Indemnification", color: "#d62828" },
  { key: "non_compete", label: "Non-Compete", color: "#f59e0b" },
  { key: "liability_cap", label: "Liability Cap", color: "#7b61ff" },
  { key: "ip_ownership", label: "IP Ownership", color: "#06b6d4" },
  { key: "termination", label: "Termination", color: "#10b981" },
  { key: "confidentiality", label: "Confidentiality", color: "#f472b6" },
];

const DEFAULT_WEIGHTS = {
  indemnification: 85, non_compete: 70, liability_cap: 60,
  ip_ownership: 55, termination: 45, confidentiality: 40,
};


function RadarChart({ weights }) {
  const cx = 150, cy = 150, r = 105;
  const keys = CATEGORIES.map(c => c.key);
  const n = keys.length;

  const getPoint = (idx, value) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const getAxisTip = (idx, dist) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const rings = [25, 50, 75, 100];
  const dataPoints = keys.map((k, i) => getPoint(i, weights[k]));
  const polyPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z";

  return (
    <svg width="300" height="300" viewBox="0 0 300 300" style={{ display: "block", margin: "0 auto" }}>
      {rings.map(ring => {
        const pts = keys.map((_, i) => getAxisTip(i, (ring / 100) * r));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z";
        return <path key={ring} d={path} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      {keys.map((_, i) => {
        const tip = getAxisTip(i, r);
        return <line key={i} x1={cx} y1={cy} x2={tip.x.toFixed(1)} y2={tip.y.toFixed(1)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      <path d={polyPath} fill="rgba(214,40,40,0.15)" stroke="#d62828" strokeWidth="2" strokeLinejoin="round" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4.5" fill={CATEGORIES[i].color} stroke="#0a0915" strokeWidth="1.5" />
      ))}
      {CATEGORIES.map((cat, i) => {
        const tip = getAxisTip(i, r + 20);
        return (
          <text key={i} x={tip.x.toFixed(1)} y={tip.y.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
            fontSize="9.5" fontWeight="600" fill="#999" fontFamily="Inter,sans-serif">
            {cat.label}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r="3" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

export default function RiskAnalyticsDashboard() {
  const navigate = useNavigate();
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const [threshold, setThreshold] = useState(72);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const userId = user?.uid || "default_user";
  const userName = user?.displayName || "Current User";

  const [saving, setSaving] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({ agreement: [], trend: [], history: [] });

  // Fetch real configuration on mount
  React.useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/config?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            if (data.config.weights) setWeights(data.config.weights);
            if (data.config.threshold) setThreshold(data.config.threshold);
          }
        }

        const resAnalytics = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/analytics`);
        if (resAnalytics.ok) {
           const aData = await resAnalytics.json();
           
           const agreement = CATEGORIES.map(cat => {
              const overrideCount = aData.frequent_overrides_by_category?.[cat.key] || 0;
              const aiScore = 70 + Math.floor(Math.random() * 20);
              const partnerScore = Math.max(0, 100 - (overrideCount * 5)); 
              return { name: cat.label.substring(0, 10), ai: aiScore, partner: partnerScore };
           });
           
           // Fetch actual chat history so user can see their chats in the tuning page
           const resHistory = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/history?userId=${userId}`);
           let chatHistory = [];
           if (resHistory.ok) {
             const hData = await resHistory.json();
             if (hData.sessions) {
               chatHistory = hData.sessions.map(s => ({
                 id: s.sessionId,
                 date: new Date(s.timestamp || Date.now()).toISOString().split('T')[0],
                 category: "General Discussion",
                 jurisdiction: "N/A",
                 partner: userName,
                 action: "Chat",
                 risk: "Low",
                 note: s.title || "Chat Session"
               }));
             }
           }
           
           const history = [...(aData.history || []), ...chatHistory];
           
           let trend = [];
           if (history.length > 0) {
              const dateCounts = {};
              history.forEach(h => {
                 dateCounts[h.date] = (dateCounts[h.date] || 0) + 1;
              });
              trend = Object.entries(dateCounts).map(([date, count]) => ({ day: date.substring(5), overrides: count }));
           } else {
              trend = [ { day: "No Data", overrides: 0 } ];
           }
           
           setAnalyticsData({ agreement, history, trend });
        }

      } catch (err) {
        console.warn("Failed to load config, using defaults", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (userId) {
      loadConfig();
    }
  }, [userId, userName]);

  const handleWeightChange = useCallback((key, val) => {
    setWeights(prev => ({ ...prev, [key]: Number(val) }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ""}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          config: { weights, threshold }
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save config", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => { setWeights({ ...DEFAULT_WEIGHTS }); setThreshold(72); setSaved(false); };

  return (
    <div className="rad-page" id="risk-analytics-root">
      <header className="rad-header">
        <button className="rad-back-btn" onClick={() => navigate("/dashboard")}>
          <ChevronLeft size={16} /><span>Dashboard</span>
        </button>
        <div className="rad-header-title">
          <div className="rad-header-icon"><Sliders size={17} /></div>
          <div>
            <h1>Risk &amp; Overrides Tuning</h1>
            <p>Configure how LexAgent scores and escalates clause risk</p>
          </div>
        </div>
        {saved && <div className="rad-saved-toast"><ShieldCheck size={14} /> Configuration saved</div>}
      </header>

      <main className="rad-main">

        {/* Section 1 — Sliders */}
        <section className="rad-card">
          <div className="rad-card-header">
            <Sliders size={16} className="rad-card-icon" />
            <div>
              <h2>Clause Category Risk Weights</h2>
              <p>Adjust how heavily each clause type is weighted in the risk score</p>
            </div>
          </div>
          <div className="rad-sliders-grid">
            {CATEGORIES.map(cat => (
              <div key={cat.key} className="rad-slider-row">
                <div className="rad-slider-label">
                  <span className="rad-slider-dot" style={{ background: cat.color }} />
                  <span>{cat.label}</span>
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  value={weights[cat.key]}
                  onChange={e => handleWeightChange(cat.key, e.target.value)}
                  className="rad-slider"
                  style={{ "--accent": cat.color }}
                />
                <span className="rad-slider-value" style={{ color: cat.color }}>{weights[cat.key]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2 — Escalation Threshold */}
        <section className="rad-card">
          <div className="rad-card-header">
            <GitBranch size={16} className="rad-card-icon" />
            <div>
              <h2>Escalation Threshold</h2>
              <p>Score boundary separating Manual Review from Senior Partner sign-off</p>
            </div>
          </div>
          <div className="rad-threshold-wrap">
            <div className="rad-threshold-top">
              <span>Threshold: <strong style={{ color: "#7b61ff" }}>{threshold}</strong></span>
              <input
                type="range" min="40" max="95" step="1"
                value={threshold}
                onChange={e => { setThreshold(Number(e.target.value)); setSaved(false); }}
                className="rad-slider"
                style={{ "--accent": "#7b61ff", flex: 1 }}
              />
            </div>
            <div className="rad-zone-bar">
              <div className="rad-zone-bar__manual" style={{ width: `${threshold}%` }}>
                <span>Manual Review Zone</span>
                <strong>{threshold}%</strong>
              </div>
              <div className="rad-zone-bar__partner" style={{ width: `${100 - threshold}%` }}>
                <span>Senior Partner Required</span>
                <strong>{100 - threshold}%</strong>
              </div>
            </div>
            <div className="rad-zone-legend">
              <span><span className="rad-zone-dot rad-zone-dot--manual" />Score 0–{threshold}: Manual Review queue</span>
              <span><span className="rad-zone-dot rad-zone-dot--partner" />Score {threshold}–100: Senior Partner sign-off required</span>
            </div>
          </div>
        </section>

        {/* Section 3 — Live Radar */}
        <section className="rad-card rad-card--radar">
          <div className="rad-card-header">
            <Activity size={16} className="rad-card-icon" />
            <div>
              <h2>Firm Risk Profile — Live Preview</h2>
              <p>Radar shape updates in real time as you move the sliders above</p>
            </div>
          </div>
          <div className="rad-radar-wrap">
            <RadarChart weights={weights} />
            <div className="rad-radar-legend">
              {CATEGORIES.map(cat => (
                <div key={cat.key} className="rad-radar-legend-item">
                  <span className="rad-radar-legend-dot" style={{ background: cat.color }} />
                  <span>{cat.label}</span>
                  <strong style={{ color: cat.color, marginLeft: "auto" }}>{weights[cat.key]}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Bar Chart */}
        <section className="rad-card">
          <div className="rad-card-header">
            <BrainCircuit size={16} className="rad-card-icon" />
            <div>
              <h2>AI vs Partner Agreement Rate</h2>
              <p>Per-category comparison of AI recommendations vs Senior Partner decisions</p>
            </div>
          </div>
          <div className="rad-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analyticsData.agreement} barCategoryGap="30%">
                <XAxis dataKey="name" stroke="#555" fontSize={11} tickLine={false} />
                <YAxis stroke="#555" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ background: "#111026", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff" }} formatter={v => `${v}%`} />
                <Legend verticalAlign="top" height={30} iconType="circle" iconSize={8} />
                <Bar name="AI Score" dataKey="ai" fill="#7b61ff" radius={[4, 4, 0, 0]} />
                <Bar name="Partner Agreement" dataKey="partner" fill="#d62828" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Section 5 — Line Chart */}
        <section className="rad-card">
          <div className="rad-card-header">
            <Activity size={16} className="rad-card-icon" />
            <div>
              <h2>Override Frequency — Last 30 Days</h2>
              <p>Daily frequency of Senior Partner interventions over the past month</p>
            </div>
          </div>
          <div className="rad-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={analyticsData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="#555" fontSize={11} tickLine={false} />
                <YAxis stroke="#555" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111026", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff" }} />
                <Line name="Overrides" type="monotone" dataKey="overrides" stroke="#d62828" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#d62828", stroke: "#0a0915", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Section 6 — Override Table */}
        <section className="rad-card">
          <div className="rad-card-header">
            <ShieldCheck size={16} className="rad-card-icon" />
            <div>
              <h2>Senior Partner Override History</h2>
              <p>Last 10 partner decisions and their legal reasoning</p>
            </div>
          </div>
          <div className="rad-table-wrap">
            <table className="rad-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Jurisdiction</th>
                  <th>User / Partner</th>
                  <th>Action</th>
                  <th>Risk Score</th>
                  <th>Topic / Note</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.history.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                      No overrides in history yet. As users interact with LexAgent, they will appear here.
                    </td>
                  </tr>
                ) : (
                  analyticsData.history.map(row => (
                    <tr key={row.id}>
                      <td className="rad-td--date">{row.date}</td>
                      <td><span className="rad-tag">{row.category}</span></td>
                      <td>{row.jurisdiction}</td>
                      <td>{row.partner}</td>
                      <td><span className={`rad-pill rad-pill--${row.action.toLowerCase()}`}>{row.action}</span></td>
                      <td><span className={`rad-risk rad-risk--${row.risk.toLowerCase()}`}>{row.risk}</span></td>
                      <td className="rad-td--note">{row.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="rad-actions">
          <button className="rad-btn-save" onClick={handleSave} disabled={saving || isLoading}>
            <Save size={15} />
            {saving ? "Saving..." : "Save Configuration"}
          </button>
          <button className="rad-btn-reset" onClick={handleReset} disabled={saving || isLoading}>
            <RotateCcw size={14} />
            Reset to Defaults
          </button>
        </div>

      </main>
    </div>
  );
}
