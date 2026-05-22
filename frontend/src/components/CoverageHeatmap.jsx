import React, { useEffect, useState } from 'react';

function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function intensityColor(i) {
  // green -> yellow -> red
  const r = Math.round(255 * Math.min(1, i * 2));
  const g = Math.round(255 * Math.min(1, (1 - i) * 2));
  return `rgb(${r}, ${g}, 60)`;
}

export default function CoverageHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/custom-views/coverage-heatmap', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(e => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading coverage heatmap...</div>;
  if (error) return <div style={{ padding: 16, color: '#f44336' }}>Error: {error}</div>;
  if (!data || !data.points || !data.points.length) {
    return <div style={{ padding: 16 }}>No cell tower geo data available.</div>;
  }

  const b = data.bounds;
  const W = 600, H = 360, PAD = 20;
  const project = (lat, lng) => {
    const latSpan = (b.max_lat - b.min_lat) || 1;
    const lngSpan = (b.max_lng - b.min_lng) || 1;
    const x = PAD + ((lng - b.min_lng) / lngSpan) * (W - PAD * 2);
    const y = PAD + ((b.max_lat - lat) / latSpan) * (H - PAD * 2);
    return { x, y };
  };

  return (
    <div style={{ background: '#1a1f2e', padding: 20, borderRadius: 8, border: '1px solid #2a3142' }} data-testid="coverage-heatmap">
      <h3 style={{ margin: '0 0 6px 0', color: '#fff' }}>Cell Tower Coverage Heatmap</h3>
      <div style={{ color: '#9aa4b8', fontSize: 13, marginBottom: 12 }}>
        {data.total_towers} towers — intensity indicates utilization (green=low, red=high)
      </div>
      <svg width={W} height={H} style={{ background: '#0d1117', borderRadius: 4, maxWidth: '100%' }}>
        <rect x={0} y={0} width={W} height={H} fill="#0d1117" />
        {data.points.map(p => {
          const { x, y } = project(p.lat, p.lng);
          const r = Math.max(6, Math.min(28, p.coverage_radius || 8));
          return (
            <g key={p.id}>
              <circle cx={x} cy={y} r={r} fill={intensityColor(p.intensity)} opacity={0.35} />
              <circle cx={x} cy={y} r={3} fill={intensityColor(p.intensity)}>
                <title>{`${p.name} [${p.region || ''}] util ${p.utilization}% — ${p.technology || ''}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div style={{ marginTop: 8, fontSize: 12, color: '#9aa4b8' }}>
        Bounds: lat {b.min_lat?.toFixed(2)}..{b.max_lat?.toFixed(2)} / lng {b.min_lng?.toFixed(2)}..{b.max_lng?.toFixed(2)}
      </div>
    </div>
  );
}
