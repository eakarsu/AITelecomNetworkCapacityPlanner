import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAll, fetchStats, fetchNetworkHealth } from '../api';

const features = [
  {
    key: 'cell-towers',
    title: 'Cell Tower Management',
    description: 'Optimize tower placement, monitor capacity, and manage infrastructure across all regions.',
    icon: '\u{1F4E1}',
    endpoint: 'cell-towers',
    gradient: 'linear-gradient(135deg, #00b4d8, #0051ff)',
  },
  {
    key: 'bandwidth-allocations',
    title: 'Bandwidth Allocation',
    description: 'Allocate and optimize bandwidth across services, regions, and priority tiers.',
    icon: '\u{1F4CA}',
    endpoint: 'bandwidth-allocations',
    gradient: 'linear-gradient(135deg, #7c3aed, #2563eb)',
  },
  {
    key: 'rollout-plans',
    title: '5G Rollout Planning',
    description: 'Plan, track, and optimize 5G deployment across phases and regions.',
    icon: '\u{1F680}',
    endpoint: 'rollout-plans',
    gradient: 'linear-gradient(135deg, #059669, #0891b2)',
  },
  {
    key: 'coverage-gaps',
    title: 'Coverage Gap Analysis',
    description: 'Identify, prioritize, and remediate coverage gaps affecting populations.',
    icon: '\u{1F4CD}',
    endpoint: 'coverage-gaps',
    gradient: 'linear-gradient(135deg, #dc2626, #f59e0b)',
  },
  {
    key: 'demand-forecasts',
    title: 'Demand Forecasting',
    description: 'AI-powered traffic demand prediction and capacity planning insights.',
    icon: '\u{1F4C8}',
    endpoint: 'demand-forecasts',
    gradient: 'linear-gradient(135deg, #0891b2, #6366f1)',
  },
  {
    key: 'network-load',
    title: 'Network Load Balancing',
    description: 'Monitor and optimize load distribution across network nodes and routers.',
    icon: '\u2696\uFE0F',
    endpoint: 'network-load',
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
  },
  {
    key: 'spectrum-management',
    title: 'Spectrum Management',
    description: 'Manage frequency spectrum licenses, utilization, and technology assignments.',
    icon: '\u{1F4F6}',
    endpoint: 'spectrum-management',
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  },
  {
    key: 'qos-monitoring',
    title: 'QoS Monitoring',
    description: 'Track quality of service metrics, SLA compliance, and service performance.',
    icon: '\u2705',
    endpoint: 'qos-monitoring',
    gradient: 'linear-gradient(135deg, #10b981, #14b8a6)',
  },
  {
    key: 'infrastructure-costs',
    title: 'Infrastructure Cost Analysis',
    description: 'Analyze CapEx, OpEx, ROI, and optimize infrastructure investment decisions.',
    icon: '\u{1F4B0}',
    endpoint: 'infrastructure-costs',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
  {
    key: 'signal-interference',
    title: 'Signal Interference Detection',
    description: 'Detect, analyze, and mitigate RF signal interference across the network.',
    icon: '\u26A0\uFE0F',
    endpoint: 'signal-interference',
    gradient: 'linear-gradient(135deg, #ef4444, #7c3aed)',
  },
  {
    key: 'network-alarms',
    title: 'Network Alarms & Alerts',
    description: 'Monitor, triage, and resolve network alarms with AI-powered incident analysis.',
    icon: '\u{1F6A8}',
    endpoint: 'network-alarms',
    gradient: 'linear-gradient(135deg, #dc2626, #991b1b)',
  },
  {
    key: 'subscriber-analytics',
    title: 'Subscriber Analytics',
    description: 'Analyze subscriber metrics, churn rates, ARPU, and customer satisfaction.',
    icon: '\u{1F465}',
    endpoint: 'subscriber-analytics',
    gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  },
  {
    key: 'fiber-routes',
    title: 'Fiber Optic Routes',
    description: 'Manage fiber optic network topology, capacity, and route planning.',
    icon: '\u{1F310}',
    endpoint: 'fiber-routes',
    gradient: 'linear-gradient(135deg, #14b8a6, #0284c7)',
  },
  {
    key: 'maintenance-schedules',
    title: 'Maintenance Scheduling',
    description: 'Plan, track, and optimize network maintenance windows and resource allocation.',
    icon: '\u{1F527}',
    endpoint: 'maintenance-schedules',
    gradient: 'linear-gradient(135deg, #a855f7, #6366f1)',
  },
  {
    key: 'energy-consumption',
    title: 'Energy & Sustainability',
    description: 'Monitor energy usage, costs, carbon footprint, and renewable energy adoption.',
    icon: '\u26A1',
    endpoint: 'energy-consumption',
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
  },
];

function getHealthColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

function getHealthLabel(score) {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'Warning';
  return 'Critical';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [recordStats, setRecordStats] = useState({});
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // Fetch per-feature record counts
    features.forEach(async (f) => {
      try {
        const data = await fetchAll(f.endpoint);
        setRecordStats(prev => ({ ...prev, [f.key]: data.length }));
      } catch { /* ignore */ }
    });

    // Fetch summary stats
    fetchStats()
      .then(data => setSummary(data))
      .catch(() => setSummary(null));

    // Fetch network health
    fetchNetworkHealth()
      .then(data => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  // Derive KPI values from summary or fall back to record counts
  const totalTowers = summary?.totalTowers ?? recordStats['cell-towers'] ?? '...';
  const activeTowers = summary?.activeTowers ?? '...';
  const networkLoad = summary?.networkLoad ?? '...';
  const activeAlarms = summary?.activeAlarms ?? recordStats['network-alarms'] ?? '...';
  const totalSubscribers = summary?.totalSubscribers ?? recordStats['subscriber-analytics'] ?? '...';
  const healthScore = health?.score ?? summary?.healthScore ?? null;

  // Tower status distribution from health data
  const towerStatus = health?.towerStatus ?? null;
  const topRegions = health?.topRegions ?? null;

  // Compute max values for bar charts
  const towerStatusMax = towerStatus
    ? Math.max(...Object.values(towerStatus), 1)
    : 1;
  const topRegionsMax = topRegions
    ? Math.max(...topRegions.map(r => r.count), 1)
    : 1;

  const statusColors = {
    active: 'var(--success)',
    warning: 'var(--warning)',
    critical: 'var(--danger)',
    offline: 'var(--text-muted)',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Network Operations Dashboard</h2>
          <p className="subtitle">AI-Powered Telecom Network Capacity Planning & Optimization</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Towers</span>
          <span className="kpi-value">{typeof totalTowers === 'number' ? totalTowers.toLocaleString() : totalTowers}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active Towers</span>
          <span className="kpi-value" style={{ color: 'var(--success)' }}>
            {typeof activeTowers === 'number' ? activeTowers.toLocaleString() : activeTowers}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Network Load</span>
          <span className="kpi-value">
            {typeof networkLoad === 'number' ? `${networkLoad.toFixed(1)}%` : networkLoad}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active Alarms</span>
          <span className="kpi-value" style={{ color: 'var(--warning)' }}>
            {typeof activeAlarms === 'number' ? activeAlarms.toLocaleString() : activeAlarms}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Subscribers</span>
          <span className="kpi-value">
            {typeof totalSubscribers === 'number' ? totalSubscribers.toLocaleString() : totalSubscribers}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Health Score</span>
          {healthScore != null ? (
            <div className="health-indicator">
              <span className="kpi-value" style={{ color: getHealthColor(healthScore) }}>
                {healthScore}
              </span>
              <span className="health-dot" style={{ background: getHealthColor(healthScore) }}></span>
              <span className="health-label" style={{ color: getHealthColor(healthScore) }}>
                {getHealthLabel(healthScore)}
              </span>
            </div>
          ) : (
            <span className="kpi-value">...</span>
          )}
        </div>
      </div>

      {/* Charts Section */}
      {(towerStatus || topRegions) && (
        <div className="charts-row">
          {towerStatus && (
            <div className="chart-card">
              <h3>Tower Status Distribution</h3>
              <div className="bar-chart">
                {Object.entries(towerStatus).map(([status, count]) => (
                  <div className="bar" key={status}>
                    <span className="bar-label">{status}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(count / towerStatusMax) * 100}%`,
                          background: statusColors[status] || 'var(--accent)',
                        }}
                      ></div>
                    </div>
                    <span className="bar-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {topRegions && topRegions.length > 0 && (
            <div className="chart-card">
              <h3>Top 5 Regions by Tower Count</h3>
              <div className="bar-chart">
                {topRegions.slice(0, 5).map((region) => (
                  <div className="bar" key={region.name}>
                    <span className="bar-label">{region.name}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(region.count / topRegionsMax) * 100}%`,
                          background: 'var(--accent)',
                        }}
                      ></div>
                    </div>
                    <span className="bar-value">{region.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feature Cards Grid */}
      <div className="dashboard-grid">
        {features.map((f) => (
          <div key={f.key} className="feature-card" onClick={() => navigate(`/${f.key}`)}>
            <div className="card-icon" style={{ background: f.gradient.replace('135deg', '135deg').replace(/,/g, ',') + '22' }}>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
            <div className="card-stats">
              <div className="stat">
                <span className="stat-value">{recordStats[f.key] ?? '...'}</span>
                <span className="stat-label">Records</span>
              </div>
              <div className="stat">
                <span className="stat-value" style={{ color: 'var(--success)' }}>AI</span>
                <span className="stat-label">Analysis Ready</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
