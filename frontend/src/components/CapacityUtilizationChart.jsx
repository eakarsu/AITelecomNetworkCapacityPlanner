import React, { useEffect, useState } from 'react';

function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function CapacityUtilizationChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/custom-views/capacity-utilization', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(e => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading capacity utilization...</div>;
  if (error) return <div style={{ padding: 16, color: '#f44336' }}>Error: {error}</div>;
  if (!data || !data.chart || !data.chart.length) return <div style={{ padding: 16 }}>No utilization data.</div>;

  const max = Math.max(100, ...data.chart.map(c => Math.max(c.avg_tower_utilization, c.avg_bandwidth_utilization)));

  return (
    <div style={{ background: '#1a1f2e', padding: 20, borderRadius: 8, border: '1px solid #2a3142' }} data-testid="capacity-utilization-chart">
      <h3 style={{ margin: '0 0 6px 0', color: '#fff' }}>Capacity Utilization by Region</h3>
      <div style={{ color: '#9aa4b8', fontSize: 13, marginBottom: 16 }}>
        Overall avg: {data.overall?.avg_utilization || 0}% across {data.overall?.total_regions || 0} regions
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.chart.map(row => (
          <div key={row.region}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cfd6e4', fontSize: 13, marginBottom: 4 }}>
              <span><strong>{row.region}</strong> ({row.tower_count} towers)</span>
              <span>Tower {row.avg_tower_utilization}% / BW {row.avg_bandwidth_utilization}%</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ width: `${(row.avg_tower_utilization / max) * 100}%`, minWidth: 8, background: '#4a9eff', height: 16, borderRadius: 3 }} title={`Tower utilization ${row.avg_tower_utilization}%`} />
              <div style={{ width: `${(row.avg_bandwidth_utilization / max) * 100}%`, minWidth: 8, background: '#00c853', height: 16, borderRadius: 3 }} title={`Bandwidth utilization ${row.avg_bandwidth_utilization}%`} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: '#9aa4b8' }}>
        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#4a9eff', marginRight: 6, verticalAlign: 'middle' }} /> Tower utilization
        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#00c853', marginLeft: 16, marginRight: 6, verticalAlign: 'middle' }} /> Bandwidth utilization
      </div>
    </div>
  );
}
