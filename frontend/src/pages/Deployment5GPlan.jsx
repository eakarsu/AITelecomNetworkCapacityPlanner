import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAI } from '../api';

export default function Deployment5GPlan() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    region: '',
    target_sites: 25,
    budget: '',
    horizon_months: 18,
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
        target_sites: Number(form.target_sites) || 25,
        budget: form.budget ? Number(form.budget) : undefined,
        horizon_months: Number(form.horizon_months) || 18,
        notes: form.notes || undefined,
      };
      const data = await postAI('5g-deployment-plan', payload);
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
          <h2>5G Deployment Planner</h2>
          <p className="subtitle">Prioritize 5G rollout sites by demand, ROI, and existing capacity gaps.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="data-table-container" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Region</label>
            <input className="form-input" type="text" value={form.region} onChange={(e) => handleChange('region', e.target.value)} placeholder="e.g. Pacific Northwest" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Target Sites</label>
            <input className="form-input" type="number" min={1} max={500} value={form.target_sites} onChange={(e) => handleChange('target_sites', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Budget (USD)</label>
            <input className="form-input" type="number" value={form.budget} onChange={(e) => handleChange('budget', e.target.value)} placeholder="optional" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Horizon (months)</label>
            <input className="form-input" type="number" min={3} max={60} value={form.horizon_months} onChange={(e) => handleChange('horizon_months', e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Notes / Context</label>
          <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Spectrum holdings, regulatory milestones, partner agreements..." />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? <><span className="loading-spinner"></span> Planning...</> : 'Run 5G Plan'}
        </button>
      </form>

      {error && (
        <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #f44336', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#f44336' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="data-table-container" style={{ padding: 24 }}>
          <h3>Deployment Plan</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-muted)', overflow: 'auto', marginTop: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
