import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { isLoggedIn, getUser, logout } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './components/FeaturePage';
import { featureConfigs } from './featureConfigs';

const navItems = [
  { key: 'cell-towers', label: 'Cell Towers', icon: '\u{1F4E1}' },
  { key: 'bandwidth-allocations', label: 'Bandwidth', icon: '\u{1F4CA}' },
  { key: 'rollout-plans', label: '5G Rollout', icon: '\u{1F680}' },
  { key: 'coverage-gaps', label: 'Coverage Gaps', icon: '\u{1F4CD}' },
  { key: 'demand-forecasts', label: 'Demand Forecast', icon: '\u{1F4C8}' },
  { key: 'network-load', label: 'Load Balancing', icon: '\u2696\uFE0F' },
  { key: 'spectrum-management', label: 'Spectrum', icon: '\u{1F4F6}' },
  { key: 'qos-monitoring', label: 'QoS Monitor', icon: '\u2705' },
  { key: 'infrastructure-costs', label: 'Infra Costs', icon: '\u{1F4B0}' },
  { key: 'signal-interference', label: 'Interference', icon: '\u26A0\uFE0F' },
  { key: 'network-alarms', label: 'Alarms', icon: '\u{1F6A8}' },
  { key: 'subscriber-analytics', label: 'Subscribers', icon: '\u{1F465}' },
  { key: 'fiber-routes', label: 'Fiber Routes', icon: '\u{1F310}' },
  { key: 'maintenance-schedules', label: 'Maintenance', icon: '\u{1F527}' },
  { key: 'energy-consumption', label: 'Energy', icon: '\u26A1' },
];

function AppLayout() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>AI Telecom Network Capacity Planner</h1>
          <p>Network Operations</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">{'\u{1F3E0}'}</span> Dashboard
          </NavLink>
          {navItems.map(item => (
            <NavLink key={item.key} to={`/${item.key}`} className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <span className="name">{user?.name || 'User'}</span>
            <span className="role">{user?.role || 'engineer'}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {Object.entries(featureConfigs).map(([key, config]) => (
            <Route key={key} path={`/${key}`} element={<FeaturePage config={config} />} />
          ))}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn());

  const handleLogin = (user) => {
    setAuthenticated(true);
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
