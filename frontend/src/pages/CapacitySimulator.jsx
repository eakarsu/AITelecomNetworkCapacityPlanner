import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAI } from '../api';
import AIReport from '../components/AIReport';

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
          <div className="ai-actions" aria-label="Capacity examples">{[
            { label: 'Urban growth', region: 'Chicago metro', growth: '35' },
            { label: 'Suburban growth', region: 'Greater Raleigh', growth: '22' },
            { label: 'Rural growth', region: 'Northern Maine', growth: '12' },
          ].map((sample) => <button key={sample.label} type="button" className="btn btn-secondary" disabled={loading} onClick={() => { setRegion(sample.region); setGrowth(sample.growth); }}>{sample.label}</button>)}</div>
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

      {result && <AIReport response={result} title="Capacity simulation" />}
    </div>
  );
}
