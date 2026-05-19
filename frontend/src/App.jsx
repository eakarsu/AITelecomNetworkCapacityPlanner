import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { isLoggedIn, getUser, logout } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './components/FeaturePage';
import CoverageMap from './pages/CoverageMap';
import CapacitySimulator from './pages/CapacitySimulator';
import AlarmCorrelation from './pages/AlarmCorrelation';
import EnergyOptimizer from './pages/EnergyOptimizer';
import Deployment5GPlan from './pages/Deployment5GPlan';
import PredictiveMaintenance from './pages/PredictiveMaintenance';
import AIBacklogTools from './pages/AIBacklogTools';
import CustomViewsPage from './pages/CustomViewsPage';
import { featureConfigs } from './featureConfigs';
// === Batch 08 Gaps & Frontend Mounts ===
import Cf5gDeploymentPlannerPrioritizingRolloutByDemand from './pages/Cf5gDeploymentPlannerPrioritizingRolloutByDemand'
import CfDynamicSpectrumSharingOptimizationAcross4g5g from './pages/CfDynamicSpectrumSharingOptimizationAcross4g5g'
import CfPredictiveMaintenanceFlaggingEquipmentLikelyToFail from './pages/CfPredictiveMaintenanceFlaggingEquipmentLikelyToFail'
import CfEnergyEfficiencyScoringByPue from './pages/CfEnergyEfficiencyScoringByPue'
import CfNetworkSlicingOptimizerForUrllcEmbbMmtc from './pages/CfNetworkSlicingOptimizerForUrllcEmbbMmtc'
import CfOperatorBenchMarkingDashboardComparingPeerCarriers from './pages/CfOperatorBenchMarkingDashboardComparingPeerCarriers'
import GapAllMajorPlanningFunctionsAreAiDriven from './pages/GapAllMajorPlanningFunctionsAreAiDriven'
import GapNoConversationalNetworkPlanningCopilot from './pages/GapNoConversationalNetworkPlanningCopilot'
import GapNoAiSuggestedSlaRecoveryPlaybooks from './pages/GapNoAiSuggestedSlaRecoveryPlaybooks'
import GapNoIntegrationWithNetworkManagementSystemsEricsson from './pages/GapNoIntegrationWithNetworkManagementSystemsEricsson'
import GapNoRealTimeNetworkTelemetryIngestion from './pages/GapNoRealTimeNetworkTelemetryIngestion'
import GapNoWhatIfScenarioUiExportTo from './pages/GapNoWhatIfScenarioUiExportTo'
import GapNoCapacityRoadmapPlanningBudgetingModule from './pages/GapNoCapacityRoadmapPlanningBudgetingModule'
import GapNoWebhooksForAlarmCorrelationEvents from './pages/GapNoWebhooksForAlarmCorrelationEvents'
import GapNoNotificationSystem from './pages/GapNoNotificationSystem'
import GapNoMultiTenantNetworkOperatorSeparation from './pages/GapNoMultiTenantNetworkOperatorSeparation'

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
  { key: 'coverage-map', label: 'Coverage Map', icon: '\u{1F5FA}' },
  { key: 'capacity-simulator', label: 'Capacity Sim', icon: '\u{1F4CA}' },
  { key: 'alarm-correlation', label: 'Alarm Cluster', icon: '\u{1F50D}' },
  { key: 'energy-optimizer', label: 'Energy Opt', icon: '\u{1F331}' },
  { key: '5g-deployment-plan', label: '5G Deployment', icon: '\u{1F4E1}' },
  { key: 'predictive-maintenance', label: 'Predictive Maint', icon: '\u{1F527}' },
  { key: 'ai-backlog', label: 'AI Backlog Tools', icon: '\u{1F9EA}' },
  { key: 'custom-views', label: 'Network Views', icon: '\u{1F4D1}' },
];

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/" replace />;
}

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
          <Route path="/coverage-map" element={<CoverageMap />} />
          <Route path="/capacity-simulator" element={<CapacitySimulator />} />
          <Route path="/alarm-correlation" element={<AlarmCorrelation />} />
          <Route path="/energy-optimizer" element={<EnergyOptimizer />} />
          <Route path="/5g-deployment-plan" element={<Deployment5GPlan />} />
          <Route path="/predictive-maintenance" element={<PredictiveMaintenance />} />
          <Route path="/ai-backlog" element={<AIBacklogTools />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
        {/* // === Batch 08 Gaps & Frontend Mounts === */}
      <Route path="/cf-5g-deployment-planner-prioritizing-rollout-by-demand-roi" element={<ProtectedRoute><Cf5gDeploymentPlannerPrioritizingRolloutByDemand /></ProtectedRoute>} />
      <Route path="/cf-dynamic-spectrum-sharing-optimization-across-4g-5g" element={<ProtectedRoute><CfDynamicSpectrumSharingOptimizationAcross4g5g /></ProtectedRoute>} />
      <Route path="/cf-predictive-maintenance-flagging-equipment-likely-to-fail" element={<ProtectedRoute><CfPredictiveMaintenanceFlaggingEquipmentLikelyToFail /></ProtectedRoute>} />
      <Route path="/cf-energy-efficiency-scoring-by-pue" element={<ProtectedRoute><CfEnergyEfficiencyScoringByPue /></ProtectedRoute>} />
      <Route path="/cf-network-slicing-optimizer-for-urllc-embb-mmtc-service" element={<ProtectedRoute><CfNetworkSlicingOptimizerForUrllcEmbbMmtc /></ProtectedRoute>} />
      <Route path="/cf-operator-bench-marking-dashboard-comparing-peer-carriers" element={<ProtectedRoute><CfOperatorBenchMarkingDashboardComparingPeerCarriers /></ProtectedRoute>} />
      <Route path="/gap-all-major-planning-functions-are-ai-driven-minimal-gaps" element={<ProtectedRoute><GapAllMajorPlanningFunctionsAreAiDriven /></ProtectedRoute>} />
      <Route path="/gap-no-conversational-network-planning-copilot" element={<ProtectedRoute><GapNoConversationalNetworkPlanningCopilot /></ProtectedRoute>} />
      <Route path="/gap-no-ai-suggested-sla-recovery-playbooks" element={<ProtectedRoute><GapNoAiSuggestedSlaRecoveryPlaybooks /></ProtectedRoute>} />
      <Route path="/gap-no-integration-with-network-management-systems-ericsson-nokia" element={<ProtectedRoute><GapNoIntegrationWithNetworkManagementSystemsEricsson /></ProtectedRoute>} />
      <Route path="/gap-no-real-time-network-telemetry-ingestion" element={<ProtectedRoute><GapNoRealTimeNetworkTelemetryIngestion /></ProtectedRoute>} />
      <Route path="/gap-no-what-if-scenario-ui-export-to-excel-powerpoint" element={<ProtectedRoute><GapNoWhatIfScenarioUiExportTo /></ProtectedRoute>} />
      <Route path="/gap-no-capacity-roadmap-planning-budgeting-module" element={<ProtectedRoute><GapNoCapacityRoadmapPlanningBudgetingModule /></ProtectedRoute>} />
      <Route path="/gap-no-webhooks-for-alarm-correlation-events" element={<ProtectedRoute><GapNoWebhooksForAlarmCorrelationEvents /></ProtectedRoute>} />
      <Route path="/gap-no-notification-system" element={<ProtectedRoute><GapNoNotificationSystem /></ProtectedRoute>} />
      <Route path="/gap-no-multi-tenant-network-operator-separation" element={<ProtectedRoute><GapNoMultiTenantNetworkOperatorSeparation /></ProtectedRoute>} />
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
