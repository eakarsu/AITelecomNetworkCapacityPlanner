import React, { useState } from 'react';

function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function CapacityPlanPdfExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setDownloaded(false);
    try {
      const res = await fetch('/api/custom-views/capacity-plan-pdf', { headers: authHeaders() });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'capacity-plan.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#1a1f2e', padding: 20, borderRadius: 8, border: '1px solid #2a3142' }} data-testid="capacity-plan-pdf-export">
      <h3 style={{ margin: '0 0 6px 0', color: '#fff' }}>Capacity Plan PDF Report</h3>
      <div style={{ color: '#9aa4b8', fontSize: 13, marginBottom: 16 }}>
        Generate a portable PDF report summarizing regional tower utilization, active rollout plans, and active provisioning rules.
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        style={{
          background: '#4a9eff', color: '#fff', border: 'none', padding: '10px 18px',
          borderRadius: 4, cursor: loading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600,
        }}
      >
        {loading ? 'Generating PDF...' : 'Download Capacity Plan PDF'}
      </button>
      {downloaded && <div style={{ color: '#00c853', marginTop: 10, fontSize: 13 }}>PDF downloaded.</div>}
      {error && <div style={{ color: '#f44336', marginTop: 10, fontSize: 13 }}>Error: {error}</div>}
    </div>
  );
}
