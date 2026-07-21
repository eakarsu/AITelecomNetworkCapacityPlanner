const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const auth = require('./middleware/auth');
const pool = require('./db');
const createCrudRouter = require('./routes/crud');
const { validateRuntime } = require('./governance/runtime');
const { createProviderGate } = require('./governance/providerGate');

validateRuntime();

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;
const allowedOrigins = String(process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3001')
  .split(',').map((value) => value.trim()).filter(Boolean);
const providerPrefixes = [
  '/api/ai', '/api/5g-deployment-planner', '/api/dynamic-spectrum-sharing',
  '/api/predictive-maintenance', '/api/energy-efficiency-scoring',
  '/api/network-slicing-optimizer', '/api/operator-benchmarking', '/api/gap-',
];

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/governance', require('./governance/router'));
app.use('/api', auth);
app.use(createProviderGate(providerPrefixes));

app.get('/api/cell-towers/map-data', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, latitude, longitude, height, frequency, status, technology, utilization, coverage_radius FROM cell_towers WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY id'
    );
    res.json({ towers: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Unable to load map data' });
  }
});
app.use('/api/stats', require('./routes/stats'));

const crudDefinitions = [
  ['cell-towers', 'cell_towers', 'Cell Tower'],
  ['bandwidth-allocations', 'bandwidth_allocations', 'Bandwidth Allocation'],
  ['rollout-plans', 'rollout_plans', 'Rollout Plan'],
  ['coverage-gaps', 'coverage_gaps', 'Coverage Gap'],
  ['demand-forecasts', 'demand_forecasts', 'Demand Forecast'],
  ['network-load', 'network_load', 'Network Load'],
  ['spectrum-management', 'spectrum_management', 'Spectrum'],
  ['qos-monitoring', 'qos_monitoring', 'QoS Monitor'],
  ['infrastructure-costs', 'infrastructure_costs', 'Infrastructure Cost'],
  ['signal-interference', 'signal_interference', 'Signal Interference'],
  ['network-alarms', 'network_alarms', 'Network Alarm'],
  ['subscriber-analytics', 'subscriber_analytics', 'Subscriber Analytics'],
  ['fiber-routes', 'fiber_routes', 'Fiber Route'],
  ['maintenance-schedules', 'maintenance_schedules', 'Maintenance Schedule'],
  ['energy-consumption', 'energy_consumption', 'Energy Consumption'],
];
for (const [routeName, tableName, displayName] of crudDefinitions) {
  app.use(`/api/${routeName}`, createCrudRouter(tableName, displayName));
}
app.use('/api/custom-views', require('./routes/customViews'));

if (process.env.ENABLE_LEGACY_PROVIDER_ROUTES === 'true') {
  const legacyRoutes = [
    ['/api/ai', './routes/ai'],
    ['/api/ai-backlog', './routes/aiBacklog'],
    ['/api/5g-deployment-planner', './routes/fiveGDeploymentPlanner'],
    ['/api/dynamic-spectrum-sharing', './routes/dynamicSpectrumSharing'],
    ['/api/predictive-maintenance', './routes/predictiveMaintenance'],
    ['/api/energy-efficiency-scoring', './routes/energyEfficiencyScoring'],
    ['/api/network-slicing-optimizer', './routes/networkSlicingOptimizer'],
    ['/api/operator-benchmarking', './routes/operatorBenchmarking'],
    ['/api/gap-all-major-planning-functions-are-ai-driven-minimal-gaps', './routes/gapAllMajorPlanningFunctionsAreAiDrivenMinimalGaps'],
    ['/api/gap-no-conversational-network-planning-copilot', './routes/gapNoConversationalNetworkPlanningCopilot'],
    ['/api/gap-no-ai-suggested-sla-recovery-playbooks', './routes/gapNoAiSuggestedSlaRecoveryPlaybooks'],
    ['/api/gap-no-integration-with-network-management-systems-ericsson-nokia', './routes/gapNoIntegrationWithNetworkManagementSystemsEricssonNokia'],
    ['/api/gap-no-real-time-network-telemetry-ingestion', './routes/gapNoRealTimeNetworkTelemetryIngestion'],
    ['/api/gap-no-what-if-scenario-ui-export-to-excel-powerpoint', './routes/gapNoWhatIfScenarioUiExportToExcelPowerpoint'],
    ['/api/gap-no-capacity-roadmap-planning-budgeting-module', './routes/gapNoCapacityRoadmapPlanningBudgetingModule'],
    ['/api/gap-no-webhooks-for-alarm-correlation-events', './routes/gapNoWebhooksForAlarmCorrelationEvents'],
    ['/api/gap-no-notification-system', './routes/gapNoNotificationSystem'],
    ['/api/gap-no-multi-tenant-network-operator-separation', './routes/gapNoMultiTenantNetworkOperatorSeparation'],
  ];
  for (const [routePath, modulePath] of legacyRoutes) app.use(routePath, require(modulePath));
}

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) app.listen(PORT, () => console.log(`Telecom Planner API running on port ${PORT}`));

module.exports = app;
