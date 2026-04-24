const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET /api/stats/summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const queries = await Promise.all([
      // Total and active cell towers + avg load
      pool.query(`
        SELECT
          COUNT(*)::int AS total_towers,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_towers,
          COALESCE(ROUND(AVG(current_load_percent)::numeric, 1), 0) AS avg_tower_load_percent
        FROM cell_towers
      `),
      // Bandwidth allocated and used
      pool.query(`
        SELECT
          COALESCE(SUM(allocated_bandwidth), 0) AS total_bandwidth_allocated,
          COALESCE(SUM(used_bandwidth), 0) AS total_bandwidth_used
        FROM bandwidth_allocations
      `),
      // Active and critical alarms
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_alarms,
          COUNT(*) FILTER (WHERE status = 'active' AND severity = 'critical')::int AS critical_alarms
        FROM network_alarms
      `),
      // Total subscribers
      pool.query(`
        SELECT COALESCE(SUM(total_subscribers), 0)::int AS total_subscribers
        FROM subscriber_analytics
      `),
      // Average QoS score
      pool.query(`
        SELECT COALESCE(ROUND(AVG(qos_score)::numeric, 1), 0) AS avg_qos_score
        FROM qos_monitoring
      `),
      // Upcoming maintenance count
      pool.query(`
        SELECT COUNT(*)::int AS upcoming_maintenance
        FROM maintenance_schedules
        WHERE scheduled_date >= CURRENT_DATE AND status != 'completed'
      `),
      // Total energy consumption
      pool.query(`
        SELECT COALESCE(SUM(energy_kwh), 0) AS total_energy_consumption
        FROM energy_consumption
      `),
    ]);

    res.json({
      total_towers: queries[0].rows[0].total_towers,
      active_towers: queries[0].rows[0].active_towers,
      avg_tower_load_percent: parseFloat(queries[0].rows[0].avg_tower_load_percent),
      total_bandwidth_allocated: parseFloat(queries[1].rows[0].total_bandwidth_allocated),
      total_bandwidth_used: parseFloat(queries[1].rows[0].total_bandwidth_used),
      active_alarms: queries[2].rows[0].active_alarms,
      critical_alarms: queries[2].rows[0].critical_alarms,
      total_subscribers: queries[3].rows[0].total_subscribers,
      avg_qos_score: parseFloat(queries[4].rows[0].avg_qos_score),
      upcoming_maintenance: queries[5].rows[0].upcoming_maintenance,
      total_energy_consumption: parseFloat(queries[6].rows[0].total_energy_consumption),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/network-health
router.get('/network-health', authMiddleware, async (req, res) => {
  try {
    const [towersResult, alarmsResult, qosResult, criticalItemsResult] = await Promise.all([
      // Tower utilization stats
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COALESCE(ROUND(AVG(current_load_percent)::numeric, 1), 0) AS avg_load,
          COUNT(*) FILTER (WHERE current_load_percent > 90)::int AS overloaded
        FROM cell_towers
      `),
      // Alarm severity breakdown
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_total,
          COUNT(*) FILTER (WHERE status = 'active' AND severity = 'critical')::int AS critical,
          COUNT(*) FILTER (WHERE status = 'active' AND severity = 'major')::int AS major,
          COUNT(*) FILTER (WHERE status = 'active' AND severity = 'minor')::int AS minor,
          COUNT(*) FILTER (WHERE status = 'active' AND severity = 'warning')::int AS warning
        FROM network_alarms
      `),
      // QoS stats
      pool.query(`
        SELECT
          COALESCE(ROUND(AVG(qos_score)::numeric, 1), 0) AS avg_score,
          COUNT(*) FILTER (WHERE qos_score < 50)::int AS poor_count,
          COUNT(*)::int AS total
        FROM qos_monitoring
      `),
      // Recent critical items (alarms + overloaded towers)
      pool.query(`
        (
          SELECT 'alarm' AS type, alarm_type AS name, severity, created_at AS occurred_at
          FROM network_alarms
          WHERE status = 'active' AND severity = 'critical'
          ORDER BY created_at DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT 'overloaded_tower' AS type, tower_name AS name, 'high_load' AS severity, updated_at AS occurred_at
          FROM cell_towers
          WHERE current_load_percent > 90
          ORDER BY current_load_percent DESC
          LIMIT 5
        )
        ORDER BY occurred_at DESC
        LIMIT 10
      `),
    ]);

    const towers = towersResult.rows[0];
    const alarms = alarmsResult.rows[0];
    const qos = qosResult.rows[0];

    // Calculate health score (0-100)
    // Tower utilization component (40% weight): penalize high avg load and overloaded towers
    const towerRatio = towers.total > 0 ? towers.active / towers.total : 1;
    const loadPenalty = Math.min(parseFloat(towers.avg_load) / 100, 1);
    const overloadPenalty = towers.total > 0 ? towers.overloaded / towers.total : 0;
    const towerScore = Math.max(0, (towerRatio * (1 - loadPenalty * 0.5) - overloadPenalty * 0.3)) * 100;

    // Alarm component (30% weight): penalize active alarms, especially critical ones
    const alarmPenalty = Math.min((alarms.critical * 10 + alarms.major * 5 + alarms.minor * 2 + alarms.warning) / 50, 1);
    const alarmScore = (1 - alarmPenalty) * 100;

    // QoS component (30% weight): based on average QoS score
    const qosScore = parseFloat(qos.avg_score);

    const overallHealth = Math.round(
      towerScore * 0.4 + alarmScore * 0.3 + qosScore * 0.3
    );

    res.json({
      overall_health_score: Math.max(0, Math.min(100, overallHealth)),
      status_breakdown: {
        towers: {
          score: Math.round(Math.max(0, Math.min(100, towerScore))),
          total: towers.total,
          active: towers.active,
          avg_load_percent: parseFloat(towers.avg_load),
          overloaded: towers.overloaded,
        },
        bandwidth: {
          avg_tower_load: parseFloat(towers.avg_load),
          overloaded_towers: towers.overloaded,
        },
        alarms: {
          score: Math.round(Math.max(0, Math.min(100, alarmScore))),
          active_total: alarms.active_total,
          critical: alarms.critical,
          major: alarms.major,
          minor: alarms.minor,
          warning: alarms.warning,
        },
        qos: {
          score: Math.round(qosScore),
          avg_qos_score: parseFloat(qos.avg_score),
          poor_count: qos.poor_count,
          total_monitored: qos.total,
        },
      },
      recent_critical_items: criticalItemsResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
