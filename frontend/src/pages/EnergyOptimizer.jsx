import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAI } from '../api';

export default function EnergyOptimizer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postAI('energy-optimize', {});
      setResult(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const carbonBar = result
    ? Math.min(100, (result.carbon_reduction_potential_pct || 0))
    : 0;

  return (
    <div>
      <div className="back-link" onClick={() => navigate('/')}>
        &#8592; Back to Dashboard
      </div>
      <div className="page-header">
        <div>
          <h2>Energy & Carbon Optimizer</h2>
          <p className="subtitle">AI recommends sleep windows, peak offloading, and estimates carbon savings</p>
        </div>
        <button className="btn btn-primary" onClick={handleOptimize} disabled={loading}>
          {loading ? <><span className="loading-spinner"></span> Optimizing...</> : 'Run Energy Optimization'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #f44336', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#f44336' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="data-table-container" style={{ padding: '48px', textAlign: 'center' }}>
          <div className="loading-overlay" style={{ position: 'static', background: 'none' }}>
            <span className="loading-spinner"></span>
            <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>AI is analyzing energy consumption and network load...</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f44336' }}>
                {result.carbon_footprint_current_tons_per_year != null
                  ? `${Number(result.carbon_footprint_current_tons_per_year).toLocaleString()} t`
                  : 'N/A'}
              </div>
              <div className="stat-label">Current Carbon (tons/year)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#4caf50' }}>
                {result.carbon_reduction_potential_pct != null
                  ? `${result.carbon_reduction_potential_pct}%`
                  : 'N/A'}
              </div>
              <div className="stat-label">Carbon Reduction Potential</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#4caf50' }}>
                {result.estimated_cost_savings_usd_per_year != null
                  ? `$${Number(result.estimated_cost_savings_usd_per_year).toLocaleString()}`
                  : 'N/A'}
              </div>
              <div className="stat-label">Est. Annual Cost Savings</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {result.sleep_window_recommendations ? result.sleep_window_recommendations.length : 0}
              </div>
              <div className="stat-label">Sleep Window Recommendations</div>
            </div>
          </div>

          {/* Carbon Reduction Progress Bar */}
          <div className="data-table-container" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px', color: 'var(--accent)' }}>Carbon Reduction Potential</h3>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', height: '24px', overflow: 'hidden' }}>
              <div style={{
                width: `${carbonBar}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4caf50, #00c853)',
                borderRadius: '8px',
                transition: 'width 1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                color: '#fff',
              }}>
                {carbonBar > 5 ? `${carbonBar}%` : ''}
              </div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              {carbonBar}% carbon reduction achievable with recommended optimizations
            </p>
          </div>

          {/* Sleep Window Recommendations */}
          {result.sleep_window_recommendations && result.sleep_window_recommendations.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: '24px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0 }}>Sleep Window Recommendations</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Site ID</th>
                      <th>Window Start</th>
                      <th>Window End</th>
                      <th>Est. Savings (kWh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sleep_window_recommendations.map((w, i) => (
                      <tr key={i}>
                        <td>{w.site_id}</td>
                        <td>{w.window_start}</td>
                        <td>{w.window_end}</td>
                        <td style={{ color: '#4caf50', fontWeight: 600 }}>
                          {w.estimated_savings_kwh != null ? `${w.estimated_savings_kwh} kWh` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Peak Offloading */}
          {result.peak_offloading_recommendations && result.peak_offloading_recommendations.length > 0 && (
            <div className="data-table-container" style={{ padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px' }}>Peak Offloading Recommendations</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {result.peak_offloading_recommendations.map((r, i) => (
                  <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '6px', lineHeight: '1.5' }}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Renewable Energy Roadmap */}
          {result.renewable_energy_roadmap && result.renewable_energy_roadmap.length > 0 && (
            <div className="data-table-container" style={{ padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px', color: '#4caf50' }}>Renewable Energy Roadmap</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {result.renewable_energy_roadmap.map((r, i) => (
                  <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '6px', lineHeight: '1.5' }}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Findings & Priority Actions */}
          {(result.findings || result.priority_actions) && (
            <div className="ai-panel">
              <div className="ai-panel-header"><h3>AI Analysis</h3></div>
              <div className="ai-panel-body">
                {result.findings && result.findings.length > 0 && (
                  <>
                    <strong style={{ color: 'var(--accent)', fontSize: '13px', textTransform: 'uppercase' }}>Findings</strong>
                    <ul style={{ margin: '8px 0 16px', paddingLeft: '20px' }}>
                      {result.findings.map((f, i) => (
                        <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '4px' }}>{f}</li>
                      ))}
                    </ul>
                  </>
                )}
                {result.priority_actions && result.priority_actions.length > 0 && (
                  <>
                    <strong style={{ color: 'var(--accent)', fontSize: '13px', textTransform: 'uppercase' }}>Priority Actions</strong>
                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                      {result.priority_actions.map((a, i) => (
                        <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '4px' }}>{a}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="data-table-container" style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Click "Run Energy Optimization" to get AI-powered recommendations for reducing energy consumption and carbon footprint
          </p>
        </div>
      )}
    </div>
  );
}
