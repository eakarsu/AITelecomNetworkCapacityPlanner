const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// Column whitelists per table — prevents SQL injection via column name
const COLUMN_WHITELISTS = {
  cell_towers: ['name', 'region', 'latitude', 'longitude', 'height', 'frequency', 'coverage_radius', 'capacity', 'utilization', 'status', 'technology', 'operator', 'site_id', 'address', 'notes'],
  bandwidth_allocations: ['name', 'region', 'allocated_bandwidth', 'used_bandwidth', 'utilization_pct', 'priority', 'service_type', 'start_date', 'end_date', 'status', 'notes'],
  rollout_plans: ['name', 'region', 'technology', 'budget', 'spent', 'completion_pct', 'sites_planned', 'sites_completed', 'start_date', 'end_date', 'status', 'priority', 'notes'],
  coverage_gaps: ['name', 'region', 'latitude', 'longitude', 'area_sqkm', 'population_affected', 'signal_strength', 'gap_type', 'priority', 'status', 'notes'],
  demand_forecasts: ['name', 'region', 'current_demand', 'forecasted_demand', 'growth_rate_pct', 'forecast_period', 'data_type', 'confidence_level', 'status', 'notes'],
  network_load: ['name', 'node_id', 'region', 'cpu_utilization', 'bandwidth_utilization', 'latency_ms', 'packet_loss_pct', 'throughput_mbps', 'timestamp', 'status', 'notes'],
  spectrum_management: ['name', 'band', 'frequency_mhz', 'bandwidth_mhz', 'utilization_pct', 'technology', 'license_cost', 'expiry_date', 'region', 'status', 'notes'],
  qos_monitoring: ['name', 'service', 'region', 'latency_ms', 'jitter_ms', 'packet_loss_pct', 'throughput_mbps', 'availability_pct', 'sla_target', 'status', 'notes'],
  infrastructure_costs: ['name', 'region', 'capex', 'opex', 'total_cost', 'roi_pct', 'category', 'vendor', 'year', 'status', 'notes'],
  signal_interference: ['name', 'region', 'latitude', 'longitude', 'signal_strength_dbm', 'interference_level_dbm', 'affected_users', 'interference_type', 'severity', 'status', 'notes'],
  network_alarms: ['name', 'region', 'alarm_type', 'severity', 'severity_level', 'duration_minutes', 'affected_users', 'node_id', 'description', 'status', 'resolved_at', 'notes'],
  subscriber_analytics: ['name', 'region', 'total_subscribers', 'arpu', 'churn_rate_pct', 'nps_score', 'segment', 'period', 'status', 'notes'],
  fiber_routes: ['name', 'region', 'start_point', 'end_point', 'length_km', 'capacity_gbps', 'utilization_pct', 'age_years', 'fiber_type', 'status', 'notes'],
  maintenance_schedules: ['name', 'region', 'site_id', 'maintenance_type', 'scheduled_date', 'estimated_duration_hours', 'cost_estimate', 'affected_users', 'technician', 'status', 'notes'],
  energy_consumption: ['name', 'region', 'site_id', 'consumption_kwh', 'cost_usd', 'pue', 'renewable_pct', 'period', 'carbon_kg', 'status', 'notes'],
};

function sanitizeFields(tableName, body) {
  const whitelist = COLUMN_WHITELISTS[tableName] || [];
  return Object.keys(body).filter(k =>
    k !== 'id' && k !== 'created_at' && k !== 'updated_at' && whitelist.includes(k)
  );
}

function createCrudRouter(tableName, displayName) {
  const router = express.Router();

  // GET all with pagination
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
      const total = parseInt(countResult.rows[0].count);

      // If no pagination params, return plain array for backward compat with frontend
      if (!req.query.page && !req.query.limit) {
        const all = await pool.query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
        return res.json(all.rows);
      }

      res.json({
        data: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET by ID
  router.get('/:id', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `${displayName} not found` });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // CREATE — validated column whitelist
  router.post('/', authMiddleware, async (req, res) => {
    try {
      const fields = sanitizeFields(tableName, req.body);
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }
      const values = fields.map((f) => req.body[f]);
      const placeholders = fields.map((_, i) => `$${i + 1}`);
      const result = await pool.query(
        `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE — validated column whitelist
  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const fields = sanitizeFields(tableName, req.body);
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }
      const values = fields.map((f) => req.body[f]);
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      values.push(req.params.id);
      const result = await pool.query(
        `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `${displayName} not found` });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE
  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(
        `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `${displayName} not found` });
      }
      res.json({ message: `${displayName} deleted`, item: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createCrudRouter;
