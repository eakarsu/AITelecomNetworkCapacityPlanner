import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAI } from '../api';

export default function PredictiveMaintenance() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    region: '',
    tower_id: '',
    horizon_days: 30,
    risk_threshold: 0.5,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true); setResult(null);
    try {
      const payload = {
        region: form.region || undefined,
        tower_id: form.tower_id || undefined,
        horizon_days: Number(form.horizon_days) || 30,
        risk_threshold: Number(form.risk_threshold) || 0.5,
        notes: form.notes || undefined,
      };
      const data = await postAI('predictive-maintenance', payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="back-link" onClick={() => navigate('/')}>&larr; Back to Dashboard</div>
      <div className="page-header">
        <div>
          <h2>Predictive Maintenance</h2>
          <p className="subtitle">AI flags equipment likely to fail and proposes a maintenance schedule.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="data-table-container" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Region</label>
            <input className="form-input" type="text" value={form.region} onChange={(e) => handleChange('region', e.target.value)} placeholder="e.g. Mid-Atlantic" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Tower ID (optional)</label>
            <input className="form-input" type="text" value={form.tower_id} onChange={(e) => handleChange('tower_id', e.target.value)} placeholder="e.g. T-1234" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Horizon (days)</label>
            <input className="form-input" type="number" min={7} max={365} value={form.horizon_days} onChange={(e) => handleChange('horizon_days', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Risk Threshold (0-1)</label>
            <input className="form-input" type="number" step="0.05" min={0} max={1} value={form.risk_threshold} onChange={(e) => handleChange('risk_threshold', e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Notes / Context</label>
          <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Recent inspections, weather exposure, vendor advisories..." />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? <><span className="loading-spinner"></span> Analyzing...</> : 'Run Predictive Maintenance'}
        </button>
      </form>

      {error && (
        <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #f44336', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#f44336' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="data-table-container" style={{ padding: 24 }}>
          <h3>Maintenance Findings</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-muted)', overflow: 'auto', marginTop: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
