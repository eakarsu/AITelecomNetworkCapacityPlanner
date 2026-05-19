import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMapData } from '../api';

const STATUS_COLORS = {
  active: '#00c853',
  inactive: '#f44336',
  maintenance: '#ff9800',
  planned: '#2196f3',
};

const TECH_COLORS = {
  '5G': '#7c4dff',
  '4G': '#00bcd4',
  'LTE': '#00bcd4',
  '3G': '#ff9800',
  '2G': '#9e9e9e',
};

function TowerCircle({ tower, scale }) {
  const radius = Math.max(8, (tower.coverage_radius || 5) * scale * 0.5);
  const color = STATUS_COLORS[tower.status] || '#888';
  const techColor = TECH_COLORS[tower.technology] || '#888';

  return (
    <g>
      <circle
        cx={0}
        cy={0}
        r={radius}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 2"
      />
      <circle
        cx={0}
        cy={0}
        r={6}
        fill={techColor}
        stroke="var(--bg-primary)"
        strokeWidth={1.5}
      />
      <text x={8} y={4} fontSize={9} fill="var(--text-muted)">{tower.name}</text>
    </g>
  );
}

export default function CoverageMap() {
  const navigate = useNavigate();
  const [towers, setTowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const svgRef = useRef(null);

  useEffect(() => {
    fetchMapData()
      .then((d) => setTowers(d.towers || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? towers : towers.filter((t) => t.status === filter);

  // Compute bounding box
  const lats = filtered.map((t) => parseFloat(t.latitude)).filter(Boolean);
  const lngs = filtered.map((t) => parseFloat(t.longitude)).filter(Boolean);
  const minLat = lats.length ? Math.min(...lats) : 0;
  const maxLat = lats.length ? Math.max(...lats) : 1;
  const minLng = lngs.length ? Math.min(...lngs) : 0;
  const maxLng = lngs.length ? Math.max(...lngs) : 1;

  const W = 800;
  const H = 500;
  const PAD = 40;

  const toX = (lng) => lngs.length < 2 ? W / 2 : PAD + ((lng - minLng) / (maxLng - minLng + 0.0001)) * (W - 2 * PAD);
  const toY = (lat) => lats.length < 2 ? H / 2 : PAD + ((maxLat - lat) / (maxLat - minLat + 0.0001)) * (H - 2 * PAD);
  const scale = lngs.length < 2 ? 1 : (W - 2 * PAD) / (maxLng - minLng + 0.0001);

  const statusCounts = towers.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="back-link" onClick={() => navigate('/')}>
        &#8592; Back to Dashboard
      </div>
      <div className="page-header">
        <div>
          <h2>Coverage Map</h2>
          <p className="subtitle">Geospatial view of all cell towers and coverage circles</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Towers ({towers.length})</option>
            {Object.entries(statusCounts).map(([s, c]) => (
              <option key={s} value={s}>{s} ({c})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s}</span>
          </div>
        ))}
        <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>Technology:</span>
        {Object.entries(TECH_COLORS).map(([t, c]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            <span style={{ color: 'var(--text-muted)' }}>{t}</span>
          </div>
        ))}
      </div>

      <div className="data-table-container" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner"></span> Loading map data...</div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tower data with coordinates available. Ensure towers have latitude/longitude fields.
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: 'auto', background: 'var(--bg-secondary)', display: 'block', cursor: 'default' }}
          >
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={`h${i}`} x1={PAD} y1={PAD + i * (H - 2 * PAD) / 4} x2={W - PAD} y2={PAD + i * (H - 2 * PAD) / 4}
                stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={`v${i}`} x1={PAD + i * (W - 2 * PAD) / 4} y1={PAD} x2={PAD + i * (W - 2 * PAD) / 4} y2={H - PAD}
                stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
            ))}

            {/* Towers */}
            {filtered.map((t) => {
              const x = toX(parseFloat(t.longitude));
              const y = toY(parseFloat(t.latitude));
              if (isNaN(x) || isNaN(y)) return null;
              return (
                <g key={t.id} transform={`translate(${x},${y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(selected?.id === t.id ? null : t)}>
                  <TowerCircle tower={t} scale={scale} />
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Selected tower detail */}
      {selected && (
        <div className="detail-panel" style={{ marginTop: '16px' }}>
          <div className="detail-header">
            <div>
              <h3>{selected.name}</h3>
              <span className={`badge badge-${selected.status}`}>{selected.status}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>&times; Close</button>
          </div>
          <div className="detail-body">
            <div className="detail-grid">
              {[
                { label: 'ID', val: selected.id },
                { label: 'Technology', val: selected.technology },
                { label: 'Latitude', val: selected.latitude },
                { label: 'Longitude', val: selected.longitude },
                { label: 'Height (m)', val: selected.height },
                { label: 'Frequency (MHz)', val: selected.frequency },
                { label: 'Coverage Radius (km)', val: selected.coverage_radius },
                { label: 'Utilization (%)', val: selected.utilization != null ? `${selected.utilization}%` : '-' },
              ].map(({ label, val }) => (
                <div className="detail-field" key={label}>
                  <span className="field-label">{label}</span>
                  <span className="field-value">{val != null ? String(val) : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '12px' }}>
        Showing {filtered.length} of {towers.length} towers. Click a tower to see details.
        Coverage circles are approximate.
      </p>
    </div>
  );
}
