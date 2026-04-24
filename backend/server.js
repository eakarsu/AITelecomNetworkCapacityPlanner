const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const statsRoutes = require('./routes/stats');
const createCrudRouter = require('./routes/crud');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// AI routes
app.use('/api/ai', aiRoutes);

// Stats routes
app.use('/api/stats', statsRoutes);

// CRUD routes for each feature
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Telecom Planner API running on port ${PORT}`);
});
