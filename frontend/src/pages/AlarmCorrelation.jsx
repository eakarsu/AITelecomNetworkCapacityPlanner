import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAI } from '../api';

const SEVERITY_COLORS = {
  critical: '#f44336',
  high: '#ff5722',
  medium: '#ff9800',
  low: '#4caf50',
};

export default function AlarmCorrelation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const handleCorrelate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postAI('correlate-alarms', {});
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
          <h2>Alarm Correlation</h2>
          <p className="subtitle">AI clusters last-24h alarms by probable root cause and provides playbooks</p>
        </div>
        <button className="btn btn-primary" onClick={handleCorrelate} disabled={loading}>
          {loading ? <><span className="loading-spinner"></span> Correlating...</> : 'Correlate Alarms (Last 24h)'}
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
            <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>AI is clustering alarms by root cause...</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-value">{result.total_alarms || 0}</div>
              <div className="stat-label">Total Alarms (24h)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{result.clusters ? result.clusters.length : 0}</div>
              <div className="stat-label">Root Cause Clusters</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f44336' }}>
                {result.clusters ? result.clusters.filter((c) => c.severity === 'critical').length : 0}
              </div>
              <div className="stat-label">Critical Clusters</div>
            </div>
          </div>

          {result.message && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>{result.message}</div>
          )}

          {result.clusters && result.clusters.map((cluster, i) => (
            <div key={i} className="data-table-container" style={{ marginBottom: '16px', padding: 0 }}>
              <div
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderBottom: expanded === i ? '1px solid var(--border)' : 'none',
                }}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: SEVERITY_COLORS[cluster.severity] || '#888',
                  }} />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      Cluster {i + 1}: {cluster.probable_cause}
                    </span>
                    <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {cluster.alarm_ids ? cluster.alarm_ids.length : 0} alarms
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: SEVERITY_COLORS[cluster.severity] + '22',
                    color: SEVERITY_COLORS[cluster.severity] || '#888',
                  }}>
                    {cluster.severity}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{expanded === i ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === i && (
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Affected Alarm IDs
                    </span>
                    <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(cluster.alarm_ids || []).map((id) => (
                        <span key={id} style={{
                          background: 'var(--bg-tertiary)', padding: '2px 8px',
                          borderRadius: '4px', fontSize: '12px', color: 'var(--text-primary)',
                        }}>#{id}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recommended Playbook
                    </span>
                    <div style={{
                      marginTop: '8px', padding: '12px', background: 'var(--bg-tertiary)',
                      borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6',
                      borderLeft: `3px solid ${SEVERITY_COLORS[cluster.severity] || '#888'}`,
                    }}>
                      {cluster.recommended_playbook}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {result.findings && result.findings.length > 0 && (
            <div className="ai-panel">
              <div className="ai-panel-header"><h3>AI Findings</h3></div>
              <div className="ai-panel-body">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {result.findings.map((f, i) => (
                    <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '6px' }}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="data-table-container" style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Click "Correlate Alarms" to analyze last 24 hours of network alarms</p>
        </div>
      )}
    </div>
  );
}
