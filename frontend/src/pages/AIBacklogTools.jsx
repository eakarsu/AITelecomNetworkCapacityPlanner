import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAI } from '../api';

const TABS = [
  { key: 'spectrum-sharing-optimize', label: 'Spectrum Sharing', desc: 'Dynamic spectrum sharing across primary/secondary users.' },
  { key: 'network-slicing-optimize', label: 'Network Slicing', desc: 'eMBB / URLLC / mMTC slice configuration recommendations.' },
  { key: 'energy-efficiency-score', label: 'Energy Efficiency', desc: 'PUE-based energy scoring and savings opportunities.' },
];

export default function AIBacklogTools() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(TABS[0].key);

  // shared form state
  const [region, setRegion] = useState('');
  const [priority, setPriority] = useState('');
  const [useCases, setUseCases] = useState('');
  const [slaTargetsRaw, setSlaTargetsRaw] = useState('');
  const [targetPue, setTargetPue] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true); setResult(null);
    try {
      let payload = {};
      if (tab === 'spectrum-sharing-optimize') {
        payload = { region: region || undefined, priority: priority || undefined };
      } else if (tab === 'network-slicing-optimize') {
        const tu = useCases.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
        let sla = undefined;
        if (slaTargetsRaw.trim()) {
          try { sla = JSON.parse(slaTargetsRaw); } catch { throw new Error('SLA Targets must be valid JSON or empty'); }
        }
        payload = { target_use_cases: tu.length ? tu : undefined, sla_targets: sla };
      } else if (tab === 'energy-efficiency-score') {
        payload = { target_pue: targetPue ? Number(targetPue) : undefined };
      }
      const data = await postAI(tab, payload);
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
          <h2>AI Backlog Tools</h2>
          <p className="subtitle">Spectrum sharing, network slicing, and energy efficiency advisors.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            className={`btn ${tab === t.key ? 'btn-primary' : ''}`}
            onClick={() => { setTab(t.key); setResult(null); setError(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="data-table-container" style={{ padding: 24, marginBottom: 20 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{TABS.find(t => t.key === tab)?.desc}</p>

        {tab === 'spectrum-sharing-optimize' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Region (optional)</label>
              <input className="form-input" type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Southeast" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Priority traffic class</label>
              <input className="form-input" type="text" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="e.g. URLLC, eMBB" />
            </div>
          </div>
        )}

        {tab === 'network-slicing-optimize' && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Target use-cases (comma-separated)</label>
              <input className="form-input" type="text" value={useCases} onChange={(e) => setUseCases(e.target.value)} placeholder="e.g. AR/VR, Industrial IoT, Connected Vehicles" />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>SLA Targets (JSON, optional)</label>
              <textarea className="form-input" rows={3} value={slaTargetsRaw} onChange={(e) => setSlaTargetsRaw(e.target.value)} placeholder='{"throughput_mbps": 200, "latency_ms": 5}' />
            </div>
          </>
        )}

        {tab === 'energy-efficiency-score' && (
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Target PUE</label>
            <input className="form-input" type="number" step="0.01" value={targetPue} onChange={(e) => setTargetPue(e.target.value)} placeholder="e.g. 1.4" />
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? <><span className="loading-spinner"></span> Running...</> : 'Run AI'}
        </button>
      </form>

      {error && (
        <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #f44336', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#f44336' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="data-table-container" style={{ padding: 24 }}>
          <h3>Result</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-muted)', overflow: 'auto', marginTop: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
