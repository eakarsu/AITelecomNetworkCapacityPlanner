// Custom Views: 2 VIZ + 2 NON-VIZ features for Network Capacity Planner
// 1) GET  /capacity-utilization     — bar chart data (avg utilization by region)
// 2) GET  /coverage-heatmap         — heatmap points (tower lat/lng + utilization)
// 3) GET  /capacity-plan-pdf        — generated PDF report of capacity plan
// 4) GET/POST/PUT/DELETE /provisioning-rules — CRUD growth thresholds

const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rate limiter that handles IPv6 properly via ipKeyGenerator
let keyGenerator;
try {
  const { ipKeyGenerator } = require('express-rate-limit');
  keyGenerator = (req) => req.user ? 'user:' + (req.user.id || req.user.userId) : ipKeyGenerator(req);
} catch (_) {
  keyGenerator = (req) => req.user ? 'user:' + (req.user.id || req.user.userId) : req.ip;
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);
router.use(authMiddleware);

// ─── Ensure provisioning_rules table ─────────────────────────────────────────
async function ensureProvisioningRulesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provisioning_rules (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      region VARCHAR(100),
      metric VARCHAR(100) NOT NULL,
      threshold_pct NUMERIC NOT NULL,
      action VARCHAR(200) NOT NULL,
      priority VARCHAR(20) DEFAULT 'medium',
      enabled BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Seed with a few defaults if empty
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM provisioning_rules');
  if (rows[0].c === 0) {
    await pool.query(`
      INSERT INTO provisioning_rules (name, region, metric, threshold_pct, action, priority, enabled, notes) VALUES
      ('High-Load Auto-Scale', 'Northeast', 'utilization', 80, 'Add 1 cell tower', 'high', true, 'Trigger 5G site rollout when avg utilization exceeds 80%'),
      ('Bandwidth Boost', 'West', 'bandwidth_utilization', 75, 'Upgrade bandwidth +20%', 'medium', true, 'Auto-request spectrum allocation increase'),
      ('Coverage Reinforcement', 'Midwest', 'signal_strength', 60, 'Deploy small cell', 'medium', true, 'Reinforce weak signal zones')
    `);
  }
}
ensureProvisioningRulesTable().catch(err => console.error('provisioning_rules init:', err.message));

// ─── 1) VIZ: Capacity Utilization Chart ──────────────────────────────────────
router.get('/capacity-utilization', async (req, res) => {
  try {
    // Aggregate utilization by region from cell_towers + bandwidth_allocations
    const towerAgg = await pool.query(`
      SELECT region,
             COALESCE(AVG(CASE WHEN max_capacity > 0 THEN (current_load::float / max_capacity) * 100 ELSE 0 END), 0)::float AS avg_tower_util,
             COUNT(*)::int AS tower_count
      FROM cell_towers
      WHERE region IS NOT NULL
      GROUP BY region
      ORDER BY region
    `);
    const bwAgg = await pool.query(`
      SELECT region,
             COALESCE(AVG(CASE WHEN allocated_bandwidth_mbps > 0 THEN (used_bandwidth_mbps / allocated_bandwidth_mbps) * 100 ELSE 0 END), 0)::float AS avg_bw_util
      FROM bandwidth_allocations
      WHERE region IS NOT NULL
      GROUP BY region
    `);
    const bwMap = Object.fromEntries(bwAgg.rows.map(r => [r.region, r.avg_bw_util]));
    const chart = towerAgg.rows.map(r => ({
      region: r.region,
      tower_count: r.tower_count,
      avg_tower_utilization: Math.round((r.avg_tower_util || 0) * 10) / 10,
      avg_bandwidth_utilization: Math.round((bwMap[r.region] || 0) * 10) / 10,
    }));
    res.json({
      chart,
      overall: {
        total_regions: chart.length,
        avg_utilization: chart.length
          ? Math.round((chart.reduce((s, x) => s + x.avg_tower_utilization, 0) / chart.length) * 10) / 10
          : 0,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2) VIZ: Cell Tower Coverage Heatmap ─────────────────────────────────────
router.get('/coverage-heatmap', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, region, latitude, longitude,
             COALESCE(current_load, 0)::float AS current_load,
             COALESCE(max_capacity, 0)::float AS max_capacity,
             COALESCE(height_meters, 0)::float AS height_meters,
             status, frequency_band, tower_type
      FROM cell_towers
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY id
    `);
    const points = result.rows.map(r => {
      const util = r.max_capacity > 0 ? (r.current_load / r.max_capacity) * 100 : 0;
      return {
        id: r.id,
        name: r.name,
        region: r.region,
        lat: parseFloat(r.latitude),
        lng: parseFloat(r.longitude),
        intensity: Math.min(1, util / 100),
        utilization: Math.round(util * 10) / 10,
        coverage_radius: Math.max(6, Math.min(28, (r.height_meters || 10) / 5)),
        status: r.status,
        technology: r.frequency_band || r.tower_type,
      };
    });
    // Compute bounds
    let bounds = null;
    if (points.length) {
      bounds = {
        min_lat: Math.min(...points.map(p => p.lat)),
        max_lat: Math.max(...points.map(p => p.lat)),
        min_lng: Math.min(...points.map(p => p.lng)),
        max_lng: Math.max(...points.map(p => p.lng)),
      };
    }
    res.json({
      points,
      bounds,
      total_towers: points.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3) NON-VIZ: Capacity Plan PDF Report ────────────────────────────────────
router.get('/capacity-plan-pdf', async (req, res) => {
  try {
    const towers = await pool.query(`
      SELECT region,
             COUNT(*)::int AS count,
             COALESCE(AVG(CASE WHEN max_capacity > 0 THEN (current_load::float / max_capacity) * 100 ELSE 0 END), 0)::float AS avg_util,
             COALESCE(SUM(max_capacity), 0)::float AS total_capacity
      FROM cell_towers GROUP BY region ORDER BY region
    `);
    const plans = await pool.query(`
      SELECT name, region, technology, phase, budget_millions, towers_planned, towers_completed, status,
             CASE WHEN towers_planned > 0 THEN ROUND((towers_completed::numeric / towers_planned) * 100, 1) ELSE 0 END AS completion_pct
      FROM rollout_plans ORDER BY id DESC LIMIT 25
    `);
    const rules = await pool.query(`
      SELECT name, region, metric, threshold_pct, action, priority FROM provisioning_rules WHERE enabled = true ORDER BY priority, id
    `);

    // Build minimal PDF (PDF 1.4) — no external deps required
    const lines = [];
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    lines.push('AI TELECOM NETWORK CAPACITY PLAN');
    lines.push('Generated: ' + now);
    lines.push('');
    lines.push('=== Regional Utilization ===');
    towers.rows.forEach(r => {
      lines.push(`${r.region}: ${r.count} towers, avg util ${r.avg_util.toFixed(1)}%, capacity ${r.total_capacity.toFixed(0)}`);
    });
    lines.push('');
    lines.push('=== Active Rollout Plans (top 25) ===');
    plans.rows.forEach(p => {
      const budget = p.budget_millions == null ? 'N/A' : `$${Number(p.budget_millions).toLocaleString()}M`;
      lines.push(`${p.name} [${p.region}/${p.technology}/${p.phase}] ${p.status} ${p.completion_pct || 0}% (${p.towers_completed}/${p.towers_planned} towers) - budget ${budget}`);
    });
    lines.push('');
    lines.push('=== Provisioning Rules (enabled) ===');
    rules.rows.forEach(r => {
      lines.push(`[${r.priority}] ${r.name} (${r.region || 'all'}): if ${r.metric} > ${r.threshold_pct}% -> ${r.action}`);
    });

    const pdfBuffer = buildSimplePdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="capacity-plan.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function escapePdf(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(textLines) {
  // Minimal single-page PDF with multiple text lines using Helvetica font.
  const wrappedLines = [];
  const MAX = 95;
  textLines.forEach(line => {
    if (line.length <= MAX) {
      wrappedLines.push(line);
    } else {
      for (let i = 0; i < line.length; i += MAX) wrappedLines.push(line.slice(i, i + MAX));
    }
  });
  // Build content stream
  let stream = 'BT\n/F1 10 Tf\n12 TL\n50 780 Td\n';
  wrappedLines.forEach((ln, idx) => {
    if (idx === 0) stream += `(${escapePdf(ln)}) Tj\n`;
    else stream += `T* (${escapePdf(ln)}) Tj\n`;
  });
  stream += 'ET\n';
  const streamBytes = Buffer.byteLength(stream, 'binary');

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  objects.push(`<< /Length ${streamBytes} >>\nstream\n${stream}endstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

// ─── 4) NON-VIZ: Provisioning Rules Editor (CRUD growth thresholds) ──────────
router.get('/provisioning-rules', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM provisioning_rules ORDER BY id DESC');
    res.json({ rules: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/provisioning-rules', async (req, res) => {
  try {
    const { name, region, metric, threshold_pct, action, priority, enabled, notes } = req.body || {};
    if (!name || !metric || threshold_pct == null || !action) {
      return res.status(400).json({ error: 'name, metric, threshold_pct, action are required' });
    }
    const result = await pool.query(
      `INSERT INTO provisioning_rules (name, region, metric, threshold_pct, action, priority, enabled, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, region || null, metric, Number(threshold_pct), action, priority || 'medium', enabled !== false, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/provisioning-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
    const { name, region, metric, threshold_pct, action, priority, enabled, notes } = req.body || {};
    const result = await pool.query(
      `UPDATE provisioning_rules
       SET name = COALESCE($1, name),
           region = COALESCE($2, region),
           metric = COALESCE($3, metric),
           threshold_pct = COALESCE($4, threshold_pct),
           action = COALESCE($5, action),
           priority = COALESCE($6, priority),
           enabled = COALESCE($7, enabled),
           notes = COALESCE($8, notes),
           updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, region, metric, threshold_pct != null ? Number(threshold_pct) : null, action, priority, enabled, notes, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/provisioning-rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
    const result = await pool.query('DELETE FROM provisioning_rules WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'rule not found' });
    res.json({ ok: true, deleted_id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
