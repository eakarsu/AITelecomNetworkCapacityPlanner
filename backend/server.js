const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: '../.env' });

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const statsRoutes = require('./routes/stats');
const createCrudRouter = require('./routes/crud');
const authMiddleware = require('./middleware/auth');
const pool = require('./db');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── AI routes ────────────────────────────────────────────────────────────────
app.use('/api/ai', aiRoutes);
app.use('/api/ai-backlog', require('./routes/aiBacklog'));

// ─── Stats routes ─────────────────────────────────────────────────────────────
app.use('/api/stats', statsRoutes);

// ─── CRUD routes for each feature ────────────────────────────────────────────
app.use('/api/cell-towers', createCrudRouter('cell_towers', 'Cell Tower'));
app.use('/api/bandwidth-allocations', createCrudRouter('bandwidth_allocations', 'Bandwidth Allocation'));
app.use('/api/rollout-plans', createCrudRouter('rollout_plans', 'Rollout Plan'));
app.use('/api/coverage-gaps', createCrudRouter('coverage_gaps', 'Coverage Gap'));
app.use('/api/demand-forecasts', createCrudRouter('demand_forecasts', 'Demand Forecast'));
app.use('/api/network-load', createCrudRouter('network_load', 'Network Load'));
app.use('/api/spectrum-management', createCrudRouter('spectrum_management', 'Spectrum'));
app.use('/api/qos-monitoring', createCrudRouter('qos_monitoring', 'QoS Monitor'));
app.use('/api/infrastructure-costs', createCrudRouter('infrastructure_costs', 'Infrastructure Cost'));
app.use('/api/signal-interference', createCrudRouter('signal_interference', 'Signal Interference'));
app.use('/api/network-alarms', createCrudRouter('network_alarms', 'Network Alarm'));
app.use('/api/subscriber-analytics', createCrudRouter('subscriber_analytics', 'Subscriber Analytics'));
app.use('/api/fiber-routes', createCrudRouter('fiber_routes', 'Fiber Route'));
app.use('/api/maintenance-schedules', createCrudRouter('maintenance_schedules', 'Maintenance Schedule'));
app.use('/api/energy-consumption', createCrudRouter('energy_consumption', 'Energy Consumption'));

// ─── Geospatial map-data endpoint ────────────────────────────────────────────
app.get('/api/cell-towers/map-data', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, latitude, longitude, height, frequency, status, technology, utilization, coverage_radius FROM cell_towers WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY id'
    );
    res.json({ towers: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/5g-deployment-planner', require('./routes/fiveGDeploymentPlanner')); app.use('/api/dynamic-spectrum-sharing', require('./routes/dynamicSpectrumSharing')); app.use('/api/predictive-maintenance', require('./routes/predictiveMaintenance')); app.use('/api/energy-efficiency-scoring', require('./routes/energyEfficiencyScoring')); app.use('/api/network-slicing-optimizer', require('./routes/networkSlicingOptimizer')); app.use('/api/operator-benchmarking', require('./routes/operatorBenchmarking'));

// === Batch 08 Gaps & Frontend Mounts ===
app.use('/api/gap-all-major-planning-functions-are-ai-driven-minimal-gaps', require('./routes/gapAllMajorPlanningFunctionsAreAiDrivenMinimalGaps'));
app.use('/api/gap-no-conversational-network-planning-copilot', require('./routes/gapNoConversationalNetworkPlanningCopilot'));
app.use('/api/gap-no-ai-suggested-sla-recovery-playbooks', require('./routes/gapNoAiSuggestedSlaRecoveryPlaybooks'));
app.use('/api/gap-no-integration-with-network-management-systems-ericsson-nokia', require('./routes/gapNoIntegrationWithNetworkManagementSystemsEricssonNokia'));
app.use('/api/gap-no-real-time-network-telemetry-ingestion', require('./routes/gapNoRealTimeNetworkTelemetryIngestion'));
app.use('/api/gap-no-what-if-scenario-ui-export-to-excel-powerpoint', require('./routes/gapNoWhatIfScenarioUiExportToExcelPowerpoint'));
app.use('/api/gap-no-capacity-roadmap-planning-budgeting-module', require('./routes/gapNoCapacityRoadmapPlanningBudgetingModule'));
app.use('/api/gap-no-webhooks-for-alarm-correlation-events', require('./routes/gapNoWebhooksForAlarmCorrelationEvents'));
app.use('/api/gap-no-notification-system', require('./routes/gapNoNotificationSystem'));
app.use('/api/gap-no-multi-tenant-network-operator-separation', require('./routes/gapNoMultiTenantNetworkOperatorSeparation'));

app.listen(PORT, () => {
  console.log(`Telecom Planner API running on port ${PORT}`);
});
