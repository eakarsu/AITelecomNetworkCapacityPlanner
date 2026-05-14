import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAI } from '../api';

export default function CapacitySimulator() {
  const navigate = useNavigate();
  const [region, setRegion] = useState('');
  const [growth, setGrowth] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!region.trim() || !growth) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postAI('capacity-simulate', {
        region: region.trim(),
        growth_percentage: parseFloat(growth),
      });
      setResult(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = (roi) => {
    if (roi >= 20) return '#00c853';
    if (roi >= 10) return '#ff9800';
    return '#f44336';
  };

  return (
    <div>
      <div className="back-link" onClick={() => navigate('/')}>
        &#8592; Back to Dashboard
      </div>
      <div className="page-header">
        <div>
          <h2>What-If Capacity Simulator</h2>
          <p className="subtitle">Model growth scenarios and get AI-generated CapEx recommendations</p>
        </div>
      </div>

      <div className="data-table-container" style={{ maxWidth: '600px', marginBottom: '24px' }}>
        <form onSubmit={handleSimulate} style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Simulation Parameters</h3>
          <div className="form-group">
            <label>Region</label>
            <input
              className="form-control"
              placeholder="e.g. Northeast, Chicago, Zone-A"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Projected Traffic Growth (%)</label>
            <input
              className="form-control"
              type="number"
              min="1"
              max="500"
              step="1"
              placeholder="e.g. 25"
              value={growth}
              onChange={(e) => setGrowth(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
            {loading ? <><span className="loading-spinner"></span> Running Simulation...</> : 'Run AI Simulation'}
          </button>
          {error && <p style={{ color: 'var(--danger)', marginTop: '12px', fontSize: '13px' }}>{error}</p>}
        </form>
      </div>

      {result && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Total Investment Required', val: result.total_investment_required_usd != null ? `$${Number(result.total_investment_required_usd).toLocaleString()}` : 'N/A' },
              { label: 'Payback Period', val: result.payback_period_months != null ? `${result.payback_period_months} months` : 'N/A' },
              { label: 'Scenarios Generated', val: result.scenarios ? result.scenarios.length : 0 },
            ].map(({ label, val }) => (
              <div key={label} className="stat-card">
                <div className="stat-value">{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Recommended Scenario */}
          {result.recommended_scenario && (
            <div className="ai-panel" style={{ marginBottom: '24px' }}>
              <div className="ai-panel-header">
                <h3>AI Recommendation</h3>
              </div>
              <div className="ai-panel-body">
                <p style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>{result.recommended_scenario}</p>
              </div>
            </div>
          )}

          {/* Scenarios Table */}
          {result.scenarios && result.scenarios.length > 0 && (
            <div className="data-table-container" style={{ marginBottom: '24px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0 }}>Scenario Comparison</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Action</th>
                      <th>Cost (USD)</th>
                      <th>ROI (%)</th>
                      <th>Timeline (months)</th>
                      <th>Coverage Increase (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.scenarios.map((s, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{s.action}</td>
                        <td>${Number(s.cost_usd || 0).toLocaleString()}</td>
                        <td>
                          <span style={{
                            color: priorityColor(s.roi_pct || 0),
                            fontWeight: 600,
                          }}>
                            {s.roi_pct != null ? `${s.roi_pct}%` : '-'}
                          </span>
                        </td>
                        <td>{s.timeline_months != null ? `${s.timeline_months} mo` : '-'}</td>
                        <td>{s.coverage_increase_pct != null ? `+${s.coverage_increase_pct}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Findings */}
          {result.findings && result.findings.length > 0 && (
            <div className="ai-panel">
              <div className="ai-panel-header"><h3>Key Findings</h3></div>
              <div className="ai-panel-body">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {result.findings.map((f, i) => (
                    <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '6px', lineHeight: '1.5' }}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
