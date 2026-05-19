// Apply pass 5 — telecom backlog (categorized).
//
// ENV VARS used by NEEDS-CREDS endpoints (each returns 503 + { missing: <ENV> } when unset):
//   ERICSSON_NMS_API_KEY        — Ericsson NMS integration
//   NOKIA_NMS_API_KEY           — Nokia NMS integration
//   HUAWEI_NMS_API_KEY          — Huawei NMS integration
//   TELEMETRY_KAFKA_BROKERS     — real-time telemetry streaming bus
//
// NEEDS-PRODUCT-DECISION endpoints provide synchronous endpoints with reasonable
// defaults. TOO-RISKY items are exposed as DRY-RUN.

const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

function envHas(name) {
  const v = process.env[name];
  if (!v) return false;
  if (/^your[_-]?/i.test(v)) return false;
  if (v === 'dummy' || v === 'changeme') return false;
  return true;
}

// ============================================================================
// 1-3. NEEDS-CREDS — NMS vendor integrations.
// ============================================================================
router.post('/nms/ericsson/sync', (req, res) => {
  if (!envHas('ERICSSON_NMS_API_KEY')) {
    return res.status(503).json({ error: 'Ericsson NMS unavailable', missing: 'ERICSSON_NMS_API_KEY' });
  }
  return res.status(503).json({ error: 'Ericsson NMS SDK not bundled (creds present, deferred)', missing: 'ERICSSON_NMS_API_KEY' });
});
router.post('/nms/nokia/sync', (req, res) => {
  if (!envHas('NOKIA_NMS_API_KEY')) {
    return res.status(503).json({ error: 'Nokia NMS unavailable', missing: 'NOKIA_NMS_API_KEY' });
  }
  return res.status(503).json({ error: 'Nokia NMS SDK not bundled (creds present, deferred)', missing: 'NOKIA_NMS_API_KEY' });
});
router.post('/nms/huawei/sync', (req, res) => {
  if (!envHas('HUAWEI_NMS_API_KEY')) {
    return res.status(503).json({ error: 'Huawei NMS unavailable', missing: 'HUAWEI_NMS_API_KEY' });
  }
  return res.status(503).json({ error: 'Huawei NMS SDK not bundled (creds present, deferred)', missing: 'HUAWEI_NMS_API_KEY' });
});

// ============================================================================
// 4. NEEDS-CREDS — Real-time telemetry bus connector.
//    PRODUCT-DECISION-2: A Kafka/Kinesis client is intentionally NOT bundled in
//    this pass (heavy dep). When TELEMETRY_KAFKA_BROKERS is set we still 503
//    until a streaming runtime is chosen.
// ============================================================================
router.post('/telemetry/ingest', (req, res) => {
  if (!envHas('TELEMETRY_KAFKA_BROKERS')) {
    return res.status(503).json({ error: 'Telemetry bus unavailable', missing: 'TELEMETRY_KAFKA_BROKERS' });
  }
  return res.status(503).json({ error: 'Telemetry bus client not bundled (config present, deferred)', missing: 'TELEMETRY_KAFKA_BROKERS' });
});

// ============================================================================
// 5. NEEDS-PRODUCT-DECISION — Telemetry batch endpoint (poll-based fallback).
//    PRODUCT-DECISION: rather than waiting on a streaming runtime, accept
//    POSTed metric batches and return aggregates. FE polls this on an interval.
// ============================================================================
router.post('/telemetry/batch', (req, res) => {
  const { samples } = req.body || {};
  if (!Array.isArray(samples) || samples.length === 0) {
    return res.status(400).json({ error: 'samples[] required' });
  }
  // Aggregate by metric name
  const agg = {};
  for (const s of samples) {
    const k = String(s.metric || 'unknown');
    if (!agg[k]) agg[k] = { count: 0, sum: 0, min: Infinity, max: -Infinity };
    const v = Number(s.value);
    if (Number.isFinite(v)) {
      agg[k].count += 1;
      agg[k].sum += v;
      agg[k].min = Math.min(agg[k].min, v);
      agg[k].max = Math.max(agg[k].max, v);
    }
  }
  for (const k of Object.keys(agg)) {
    agg[k].avg = agg[k].count ? agg[k].sum / agg[k].count : 0;
    if (agg[k].min === Infinity) agg[k].min = 0;
    if (agg[k].max === -Infinity) agg[k].max = 0;
  }
  return res.json({ aggregated: agg, totalSamples: samples.length, ingestedAt: new Date().toISOString() });
});

// ============================================================================
// 6. NEEDS-PRODUCT-DECISION — Capacity roadmap & budgeting (synchronous calc).
//    PRODUCT-DECISION: simple linear projection — given current capacity and a
//    growth rate, project N months out and compute cost based on an `unitCost`.
// ============================================================================
router.post('/roadmap/project', (req, res) => {
  const { currentCapacity, growthRatePctPerMonth, months, unitCost } = req.body || {};
  if (typeof currentCapacity !== 'number' || typeof growthRatePctPerMonth !== 'number' || typeof months !== 'number') {
    return res.status(400).json({ error: 'currentCapacity, growthRatePctPerMonth, months required' });
  }
  const cost = typeof unitCost === 'number' ? unitCost : 1000; // PRODUCT-DECISION: $1k/unit default
  const projection = [];
  let cap = currentCapacity;
  let totalCost = 0;
  for (let m = 1; m <= Math.min(months, 60); m++) {
    const grew = cap * (growthRatePctPerMonth / 100);
    cap += grew;
    const monthCost = grew > 0 ? grew * cost : 0;
    totalCost += monthCost;
    projection.push({ month: m, capacity: Number(cap.toFixed(2)), addedCost: Number(monthCost.toFixed(2)) });
  }
  return res.json({ projection, totalCost: Number(totalCost.toFixed(2)), assumptions: { unitCost: cost } });
});

// ============================================================================
// 7. NEEDS-PRODUCT-DECISION — What-if scenario export (CSV string).
//    PRODUCT-DECISION: we emit CSV string in the response body — FE attaches
//    a download. No file-storage tier introduced.
// ============================================================================
router.post('/scenario/export-csv', (req, res) => {
  const { scenario } = req.body || {};
  if (!scenario || !Array.isArray(scenario.rows)) {
    return res.status(400).json({ error: 'scenario.rows[] required' });
  }
  const cols = scenario.columns && Array.isArray(scenario.columns)
    ? scenario.columns
    : Object.keys(scenario.rows[0] || {});
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.join(',')];
  for (const r of scenario.rows) lines.push(cols.map((c) => escape(r[c])).join(','));
  return res.json({ csv: lines.join('\n'), rows: scenario.rows.length, columns: cols });
});

// ============================================================================
// 8. NEEDS-PRODUCT-DECISION — Coverage what-if (gap density estimator).
//    PRODUCT-DECISION: in-memory calc only — uses client-supplied tower density.
// ============================================================================
router.post('/coverage/whatif', (req, res) => {
  const { regions } = req.body || {};
  if (!Array.isArray(regions)) return res.status(400).json({ error: 'regions[] required' });
  const out = regions.map((r) => {
    const towers = Number(r.towers || 0);
    const popK = Number(r.populationK || 0);
    const density = popK > 0 ? towers / popK : 0;
    const status = density >= 0.5 ? 'good' : density >= 0.2 ? 'acceptable' : 'sparse';
    return { region: r.name || r.id, density: Number(density.toFixed(3)), status };
  });
  return res.json({ regions: out, generatedAt: new Date().toISOString() });
});

// ============================================================================
// 9. TOO-RISKY → DRY-RUN. Apply rollout plan. Refused.
// ============================================================================
router.post('/rollout/apply', (req, res) => {
  // PRODUCT-DECISION: applying a rollout plan touches network state. Refuse.
  return res.status(501).json({
    error: 'Live rollout apply disabled (TOO-RISKY)',
    reason: 'requires NMS write-path + change-management approval; not implemented',
  });
});

// ============================================================================
// 10. MECHANICAL — capabilities listing.
// ============================================================================
router.get('/_capabilities', (_req, res) => {
  return res.json({
    capabilities: [
      { name: 'nms/ericsson/sync', category: 'NEEDS-CREDS', env: 'ERICSSON_NMS_API_KEY' },
      { name: 'nms/nokia/sync', category: 'NEEDS-CREDS', env: 'NOKIA_NMS_API_KEY' },
      { name: 'nms/huawei/sync', category: 'NEEDS-CREDS', env: 'HUAWEI_NMS_API_KEY' },
      { name: 'telemetry/ingest', category: 'NEEDS-CREDS', env: 'TELEMETRY_KAFKA_BROKERS' },
      { name: 'telemetry/batch', category: 'NEEDS-PRODUCT-DECISION', env: null, note: 'poll fallback' },
      { name: 'roadmap/project', category: 'NEEDS-PRODUCT-DECISION', env: null },
      { name: 'scenario/export-csv', category: 'NEEDS-PRODUCT-DECISION', env: null },
      { name: 'coverage/whatif', category: 'NEEDS-PRODUCT-DECISION', env: null },
      { name: 'rollout/apply', category: 'TOO-RISKY-stub', env: null, note: 'returns 501' },
      { name: '_capabilities', category: 'MECHANICAL', env: null },
    ],
  });
});

module.exports = router;
