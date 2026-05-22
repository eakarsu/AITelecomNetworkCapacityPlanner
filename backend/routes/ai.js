const express = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
require('dotenv').config({ path: '../.env' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

// ─── Rate Limiter ────────────────────────────────────────────────────────────
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) =>
    req.user ? 'user:' + (req.user.id || req.user.userId) : req.ip,
  message: { error: 'Too many AI requests. Limit: 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Ensure ai_results table exists ─────────────────────────────────────────
async function ensureAiResultsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      endpoint VARCHAR(100),
      input_data JSONB,
      result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}
ensureAiResultsTable().catch(console.error);

// ─── parseAIJson ─────────────────────────────────────────────────────────────
function parseAIJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  const stripped = text.replace(/```json\n?|```\n?/g, '').trim();
  try { return JSON.parse(stripped); } catch (_) {}
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch (_) {} }
  return null;
}

// ─── OpenRouter caller with 30-second timeout ────────────────────────────────
function callOpenRouter(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'AI Telecom Network Capacity Planner',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          else resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('OpenRouter request timed out after 30 seconds'));
    }, 30000);

    req.on('error', (err) => { clearTimeout(timeout); reject(err); });
    req.on('close', () => clearTimeout(timeout));
    req.write(data);
    req.end();
  });
}

// ─── Has key helper (Apply pass 4 mechanical backlog) ────────────────────────
function hasOpenRouterKey() {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) return false;
  if (/^your[_-]?openrouter[_-]?api[_-]?key/i.test(k)) return false;
  return true;
}

// ─── Persist AI result ────────────────────────────────────────────────────────
async function persistResult(userId, endpoint, inputData, result) {
  try {
    await pool.query(
      'INSERT INTO ai_results (user_id, endpoint, input_data, result) VALUES ($1, $2, $3, $4)',
      [userId, endpoint, JSON.stringify(inputData), JSON.stringify(result)]
    );
  } catch (e) {
    console.error('Failed to persist AI result:', e.message);
  }
}

// ─── Aggregate helper ─────────────────────────────────────────────────────────
function buildSummary(rows, numericKeys) {
  if (!rows.length) return { count: 0 };
  const summary = { count: rows.length, sample: rows.slice(0, 5) };
  numericKeys.forEach((k) => {
    const vals = rows.map((r) => parseFloat(r[k])).filter((v) => !isNaN(v));
    if (vals.length) {
      summary[k + '_avg'] = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
      summary[k + '_max'] = Math.max(...vals);
      summary[k + '_min'] = Math.min(...vals);
    }
  });
  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Tower Optimization
router.post('/tower-optimization', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cell_towers ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['height', 'frequency', 'coverage_radius', 'capacity', 'utilization']);

    const prompt = `You are an expert telecom network engineer. Analyze these cell tower deployments.

Tower Summary (${summary.count} total towers):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON in this exact structure:
{
  "towers_to_upgrade": [{"id": number, "reason": string, "priority": "high|medium|low"}],
  "coverage_gaps": [{"lat": number, "lng": number, "recommendation": string}],
  "estimated_coverage_increase": string,
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom network optimization specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], towers_to_upgrade: [], coverage_gaps: [], estimated_coverage_increase: 'N/A' };

    await persistResult(req.user.id || req.user.userId, 'tower-optimization', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Cell Tower Optimization' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bandwidth Analysis
router.post('/bandwidth-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bandwidth_allocations ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['allocated_bandwidth', 'used_bandwidth', 'utilization_pct']);

    const prompt = `You are an expert telecom bandwidth planner. Analyze these bandwidth allocations.

Allocation Summary (${summary.count} total allocations):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "over_provisioned": [{"id": number, "waste_pct": number}],
  "under_provisioned": [{"id": number, "deficit_pct": number}],
  "recommendations": [string],
  "findings": [string],
  "priority_actions": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom bandwidth optimization specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { over_provisioned: [], under_provisioned: [], recommendations: [content], findings: [], priority_actions: [] };

    await persistResult(req.user.id || req.user.userId, 'bandwidth-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Bandwidth Allocation Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5G Rollout Analysis
router.post('/rollout-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rollout_plans ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['budget', 'spent', 'completion_pct', 'sites_planned', 'sites_completed']);

    const prompt = `You are an expert 5G deployment strategist. Analyze these rollout plans.

Rollout Summary (${summary.count} plans):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "at_risk_plans": [{"id": number, "reason": string}],
  "budget_summary": {"total_allocated": number, "total_spent": number, "efficiency_pct": number}
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI 5G deployment strategist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], at_risk_plans: [], budget_summary: {} };

    await persistResult(req.user.id || req.user.userId, 'rollout-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: '5G Rollout Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Coverage Analysis
router.post('/coverage-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM coverage_gaps ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['area_sqkm', 'population_affected', 'signal_strength']);

    const prompt = `You are an expert telecom coverage analyst. Analyze these coverage gaps.

Coverage Summary (${summary.count} gaps):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "high_priority_gaps": [{"id": number, "reason": string, "population_impact": number}],
  "total_population_affected": number
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom coverage analysis specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], high_priority_gaps: [], total_population_affected: 0 };

    await persistResult(req.user.id || req.user.userId, 'coverage-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Coverage Gap Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Demand Analysis
router.post('/demand-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM demand_forecasts ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['current_demand', 'forecasted_demand', 'growth_rate_pct']);

    const prompt = `You are an expert telecom demand forecasting analyst. Analyze these demand forecasts.

Demand Summary (${summary.count} forecasts):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "high_growth_regions": [{"id": number, "region": string, "growth_rate": number}],
  "capacity_risk_areas": [{"id": number, "reason": string}]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom demand forecasting specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], high_growth_regions: [], capacity_risk_areas: [] };

    await persistResult(req.user.id || req.user.userId, 'demand-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Demand Forecasting Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load Analysis
router.post('/load-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM network_load ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['cpu_utilization', 'bandwidth_utilization', 'latency_ms', 'packet_loss_pct']);

    const prompt = `You are an expert network load balancing engineer. Analyze these network load metrics.

Load Summary (${summary.count} nodes):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "overloaded_nodes": [{"id": number, "utilization": number, "action": string}],
  "rebalancing_plan": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI network load balancing specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], overloaded_nodes: [], rebalancing_plan: [] };

    await persistResult(req.user.id || req.user.userId, 'load-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Network Load Balancing Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spectrum Analysis
router.post('/spectrum-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM spectrum_management ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['bandwidth_mhz', 'utilization_pct', 'license_cost']);

    const prompt = `You are an expert spectrum management consultant. Analyze these spectrum holdings.

Spectrum Summary (${summary.count} spectrum bands):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "underutilized_bands": [{"id": number, "band": string, "utilization_pct": number}],
  "refarming_opportunities": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI spectrum management specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], underutilized_bands: [], refarming_opportunities: [] };

    await persistResult(req.user.id || req.user.userId, 'spectrum-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Spectrum Management Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// QoS Analysis
router.post('/qos-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM qos_monitoring ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['latency_ms', 'jitter_ms', 'packet_loss_pct', 'throughput_mbps', 'availability_pct']);

    const prompt = `You are an expert QoS and SLA management consultant. Analyze these QoS metrics.

QoS Summary (${summary.count} services):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "sla_violations": [{"id": number, "service": string, "metric": string, "value": number}],
  "at_risk_services": [{"id": number, "reason": string}]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI QoS monitoring specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], sla_violations: [], at_risk_services: [] };

    await persistResult(req.user.id || req.user.userId, 'qos-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'QoS Monitoring Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cost Analysis
router.post('/cost-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM infrastructure_costs ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['capex', 'opex', 'total_cost', 'roi_pct']);

    const prompt = `You are an expert telecom infrastructure financial analyst. Analyze these infrastructure costs.

Cost Summary (${summary.count} cost items):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "cost_reduction_opportunities": [{"id": number, "description": string, "estimated_savings": number}],
  "roi_summary": {"total_capex": number, "total_opex": number, "avg_roi_pct": number}
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom infrastructure financial analyst. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], cost_reduction_opportunities: [], roi_summary: {} };

    await persistResult(req.user.id || req.user.userId, 'cost-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Infrastructure Cost Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Interference Analysis
router.post('/interference-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM signal_interference ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['signal_strength_dbm', 'interference_level_dbm', 'affected_users']);

    const prompt = `You are an expert RF interference analyst. Analyze these signal interference incidents.

Interference Summary (${summary.count} incidents):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "critical_incidents": [{"id": number, "type": string, "affected_users": number, "mitigation": string}],
  "total_affected_users": number
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI RF interference analysis specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], critical_incidents: [], total_affected_users: 0 };

    await persistResult(req.user.id || req.user.userId, 'interference-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Signal Interference Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alarm Analysis
router.post('/alarm-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM network_alarms ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['severity_level', 'duration_minutes', 'affected_users']);

    const prompt = `You are an expert NOC analyst. Analyze these network alarms.

Alarm Summary (${summary.count} alarms):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "critical_alarms": [{"id": number, "type": string, "severity": string, "action": string}],
  "patterns": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI NOC operations specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], critical_alarms: [], patterns: [] };

    await persistResult(req.user.id || req.user.userId, 'alarm-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Network Alarm Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscriber Analysis
router.post('/subscriber-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM subscriber_analytics ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['total_subscribers', 'arpu', 'churn_rate_pct', 'nps_score']);

    const prompt = `You are an expert telecom subscriber analytics consultant. Analyze these subscriber metrics.

Subscriber Summary (${summary.count} segments):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "high_churn_segments": [{"id": number, "segment": string, "churn_rate": number, "retention_strategy": string}],
  "arpu_optimization": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom subscriber analytics specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], high_churn_segments: [], arpu_optimization: [] };

    await persistResult(req.user.id || req.user.userId, 'subscriber-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Subscriber Analytics' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fiber Analysis
router.post('/fiber-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM fiber_routes ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['length_km', 'capacity_gbps', 'utilization_pct', 'age_years']);

    const prompt = `You are an expert fiber optic network planner. Analyze these fiber routes.

Fiber Summary (${summary.count} routes):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "upgrade_candidates": [{"id": number, "reason": string, "urgency": string}],
  "redundancy_gaps": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI fiber optic network planning specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], upgrade_candidates: [], redundancy_gaps: [] };

    await persistResult(req.user.id || req.user.userId, 'fiber-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Fiber Route Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Maintenance Analysis
router.post('/maintenance-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM maintenance_schedules ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['estimated_duration_hours', 'cost_estimate', 'affected_users']);

    const prompt = `You are an expert telecom maintenance planning consultant. Analyze these maintenance schedules.

Maintenance Summary (${summary.count} schedules):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "schedule_conflicts": [{"ids": [number], "description": string}],
  "optimization_plan": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom maintenance planning specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], schedule_conflicts: [], optimization_plan: [] };

    await persistResult(req.user.id || req.user.userId, 'maintenance-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Maintenance Schedule Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Energy Analysis
router.post('/energy-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM energy_consumption ORDER BY id LIMIT 50');
    const summary = buildSummary(rows, ['consumption_kwh', 'cost_usd', 'pue', 'renewable_pct']);

    const prompt = `You are an expert telecom energy and sustainability consultant. Analyze these energy metrics.

Energy Summary (${summary.count} sites):
${JSON.stringify(summary, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Return ONLY valid JSON:
{
  "findings": [string],
  "recommendations": [string],
  "priority_actions": [string],
  "high_consumption_sites": [{"id": number, "site": string, "consumption_kwh": number, "action": string}],
  "carbon_footprint_estimate_tons": number,
  "potential_savings_usd": number
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom energy and sustainability specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { findings: [content], recommendations: [], priority_actions: [], high_consumption_sites: [], carbon_footprint_estimate_tons: 0, potential_savings_usd: 0 };

    await persistResult(req.user.id || req.user.userId, 'energy-analysis', { question: req.body.question, summary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Energy Consumption Analysis' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEW CUSTOM FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

// What-If Capacity Simulator
router.post('/capacity-simulate', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { region, growth_percentage } = req.body;
    if (!region || growth_percentage === undefined) {
      return res.status(400).json({ error: 'region and growth_percentage are required' });
    }

    const [towers, bandwidth] = await Promise.all([
      pool.query('SELECT * FROM cell_towers WHERE region ILIKE $1 LIMIT 50', [`%${region}%`]),
      pool.query('SELECT * FROM bandwidth_allocations WHERE region ILIKE $1 LIMIT 50', [`%${region}%`]),
    ]);

    const towerSummary = buildSummary(towers.rows, ['capacity', 'utilization']);
    const bwSummary = buildSummary(bandwidth.rows, ['allocated_bandwidth', 'used_bandwidth']);

    const prompt = `You are a telecom CapEx planning specialist. Model capacity growth scenarios.

Region: ${region}
Projected Growth: ${growth_percentage}%

Current Tower Capacity:
${JSON.stringify(towerSummary, null, 2)}

Current Bandwidth:
${JSON.stringify(bwSummary, null, 2)}

Return ONLY valid JSON:
{
  "scenarios": [
    {"action": string, "cost_usd": number, "roi_pct": number, "timeline_months": number, "coverage_increase_pct": number}
  ],
  "recommended_scenario": string,
  "total_investment_required_usd": number,
  "payback_period_months": number,
  "findings": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom CapEx planning specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { scenarios: [], recommended_scenario: content, total_investment_required_usd: 0, payback_period_months: 0, findings: [] };

    await persistResult(req.user.id || req.user.userId, 'capacity-simulate', { region, growth_percentage }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Capacity Simulator' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alarm Correlation (24h clustering)
router.post('/correlate-alarms', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { rows } = await pool.query(
      'SELECT * FROM network_alarms WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 50',
      [cutoff]
    );

    if (rows.length === 0) {
      return res.json({ analysis: { clusters: [], message: 'No alarms in last 24h' }, feature: 'Alarm Correlation' });
    }

    const prompt = `You are a NOC specialist. Cluster these last-24h network alarms by probable root cause.

Alarms (${rows.length} total):
${JSON.stringify(rows.slice(0, 20), null, 2)}

Return ONLY valid JSON:
{
  "clusters": [
    {
      "alarm_ids": [number],
      "probable_cause": string,
      "severity": "critical|high|medium|low",
      "recommended_playbook": string
    }
  ],
  "total_alarms": number,
  "findings": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI NOC correlation specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { clusters: [], total_alarms: rows.length, findings: [content] };

    await persistResult(req.user.id || req.user.userId, 'correlate-alarms', { period: '24h', count: rows.length }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Alarm Correlation' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Energy & Carbon Optimizer
router.post('/energy-optimize', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const [energy, load] = await Promise.all([
      pool.query('SELECT * FROM energy_consumption ORDER BY id LIMIT 30'),
      pool.query('SELECT * FROM network_load ORDER BY id LIMIT 30'),
    ]);

    const energySummary = buildSummary(energy.rows, ['consumption_kwh', 'cost_usd', 'pue', 'renewable_pct']);
    const loadSummary = buildSummary(load.rows, ['cpu_utilization', 'bandwidth_utilization']);

    const prompt = `You are an energy efficiency and carbon reduction specialist for telecom networks.

Energy Consumption Summary:
${JSON.stringify(energySummary, null, 2)}

Network Load Summary:
${JSON.stringify(loadSummary, null, 2)}

Return ONLY valid JSON:
{
  "sleep_window_recommendations": [{"site_id": number, "window_start": string, "window_end": string, "estimated_savings_kwh": number}],
  "peak_offloading_recommendations": [string],
  "carbon_footprint_current_tons_per_year": number,
  "carbon_reduction_potential_pct": number,
  "estimated_cost_savings_usd_per_year": number,
  "renewable_energy_roadmap": [string],
  "findings": [string],
  "priority_actions": [string]
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI energy optimization specialist for telecom. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || {
      sleep_window_recommendations: [],
      peak_offloading_recommendations: [content],
      carbon_footprint_current_tons_per_year: 0,
      carbon_reduction_potential_pct: 0,
      estimated_cost_savings_usd_per_year: 0,
      renewable_energy_roadmap: [],
      findings: [],
      priority_actions: [],
    };

    await persistResult(req.user.id || req.user.userId, 'energy-optimize', { energySummary, loadSummary }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Energy & Carbon Optimizer' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI History endpoint
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const userId = req.user.id || req.user.userId;

    const { rows } = await pool.query(
      'SELECT id, endpoint, input_data, result, created_at FROM ai_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM ai_results WHERE user_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5G Deployment Planner — prioritize 5G rollout based on demand/ROI
router.post('/5g-deployment-plan', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const towers = await pool.query('SELECT * FROM cell_towers ORDER BY id LIMIT 50').catch(() => ({ rows: [] }));
    const subs = await pool.query('SELECT * FROM subscribers ORDER BY id LIMIT 50').catch(() => ({ rows: [] }));
    const towerSummary = buildSummary(towers.rows, ['height', 'frequency', 'coverage_radius', 'capacity', 'utilization']);
    const subSummary = buildSummary(subs.rows, ['data_usage_gb', 'arpu']);

    const prompt = `You are a 5G deployment strategist. Recommend which sites to upgrade to 5G first to maximize ROI.

Towers summary: ${JSON.stringify(towerSummary)}
Subscribers summary: ${JSON.stringify(subSummary)}
${req.body.budget_usd ? `Budget: $${req.body.budget_usd}` : ''}
${req.body.region ? `Region focus: ${req.body.region}` : ''}

Return ONLY valid JSON:
{
  "priority_sites": [{"tower_id": <id>, "rationale": "...", "expected_roi_months": <number>, "competitive_pressure": "low|medium|high"}],
  "phased_plan": [{"phase": <number>, "sites": <number>, "investment_usd": <number>, "expected_revenue_lift_usd": <number>}],
  "total_capex_estimate_usd": <number>,
  "key_risks": ["..."],
  "summary": "..."
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI 5G deployment strategist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);
    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { raw: content };
    await persistResult(req.user.id || req.user.userId, '5g-deployment-plan', { budget: req.body.budget_usd, region: req.body.region }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: '5G Deployment Planner' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Predictive maintenance — flag equipment likely to fail
router.post('/predictive-maintenance', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const towers = await pool.query('SELECT * FROM cell_towers ORDER BY id LIMIT 50').catch(() => ({ rows: [] }));
    let alarms = [];
    try {
      const r = await pool.query('SELECT * FROM alarms ORDER BY created_at DESC LIMIT 50');
      alarms = r.rows;
    } catch (_) {}
    const towerSummary = buildSummary(towers.rows, ['height', 'frequency', 'coverage_radius', 'capacity', 'utilization']);

    const prompt = `You are a network reliability engineer. Identify equipment likely to fail and recommend preventive maintenance windows.

Towers summary: ${JSON.stringify(towerSummary)}
Recent alarms: ${JSON.stringify(alarms.slice(0, 30))}

Return ONLY valid JSON:
{
  "at_risk_equipment": [{"tower_id": <id>, "component": "...", "failure_probability_pct": <0-100>, "recommended_action": "...", "window_days": <number>}],
  "spare_parts_to_stock": ["..."],
  "preventive_maintenance_schedule": [{"week_of": "YYYY-MM-DD", "tasks": ["..."]}],
  "summary": "..."
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI predictive maintenance specialist. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);
    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { raw: content };
    await persistResult(req.user.id || req.user.userId, 'predictive-maintenance', {}, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Predictive Maintenance' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Apply pass 4 (mechanical backlog)
// ═══════════════════════════════════════════════════════════════════════════════

// Dynamic spectrum sharing optimizer
router.post('/spectrum-sharing-optimize', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (!hasOpenRouterKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const allocations = await pool.query('SELECT * FROM spectrum_allocations ORDER BY id LIMIT 50').catch(() => ({ rows: [] }));
    const towers = await pool.query('SELECT * FROM cell_towers ORDER BY id LIMIT 50').catch(() => ({ rows: [] }));
    const allocSummary = buildSummary(allocations.rows, ['frequency_mhz', 'bandwidth_mhz', 'utilization_pct']);
    const towerSummary = buildSummary(towers.rows, ['frequency', 'utilization', 'capacity']);

    const prompt = `You are a spectrum allocation engineer. Optimize dynamic spectrum sharing across primary/secondary users.

Allocations summary: ${JSON.stringify(allocSummary)}
Towers summary: ${JSON.stringify(towerSummary)}
${req.body.region ? `Region: ${req.body.region}` : ''}
${req.body.priority ? `Priority traffic class: ${req.body.priority}` : ''}

Return ONLY valid JSON:
{
  "reallocations": [ { "tower_id": <id>, "from_band": "...", "to_band": "...", "rationale": "...", "expected_capacity_gain_pct": <number> } ],
  "shared_bands": [ { "band": "...", "primary_user": "...", "secondary_users": ["..."], "sharing_rules": "..." } ],
  "expected_overall_capacity_gain_pct": <number>,
  "interference_risks": ["..."],
  "summary": "..."
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI spectrum-sharing optimizer. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);
    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { raw: content };
    await persistResult(req.user.id || req.user.userId, 'spectrum-sharing-optimize', { region: req.body.region, priority: req.body.priority }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Spectrum Sharing Optimizer' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Network slicing optimizer
router.post('/network-slicing-optimize', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (!hasOpenRouterKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const subs = await pool.query('SELECT * FROM subscribers ORDER BY id LIMIT 50').catch(() => ({ rows: [] }));
    const towers = await pool.query('SELECT * FROM cell_towers ORDER BY id LIMIT 50').catch(() => ({ rows: [] }));
    const subSummary = buildSummary(subs.rows, ['data_usage_gb', 'arpu']);
    const towerSummary = buildSummary(towers.rows, ['capacity', 'utilization']);

    const prompt = `You are a 5G network-slicing engineer. Recommend slice configurations across eMBB, URLLC, mMTC.

Subscribers summary: ${JSON.stringify(subSummary)}
Towers summary: ${JSON.stringify(towerSummary)}
${Array.isArray(req.body.target_use_cases) ? `Target use-cases: ${req.body.target_use_cases.join(', ')}` : ''}
${req.body.sla_targets ? `SLA targets: ${JSON.stringify(req.body.sla_targets)}` : ''}

Return ONLY valid JSON:
{
  "slices": [ { "name": "...", "type": "eMBB|URLLC|mMTC", "allocation_pct": <0-100>, "sla": { "throughput_mbps": <number>, "latency_ms": <number>, "reliability_pct": <number> }, "use_cases": ["..."] } ],
  "tower_assignments": [ { "tower_id": <id>, "slice_mix": [ { "slice": "...", "pct": <number> } ] } ],
  "expected_revenue_uplift_pct": <number>,
  "risks": ["..."],
  "summary": "..."
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI network-slicing optimizer. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);
    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { raw: content };
    await persistResult(req.user.id || req.user.userId, 'network-slicing-optimize', { target_use_cases: req.body.target_use_cases }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Network Slicing Optimizer' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Energy efficiency PUE scoring
router.post('/energy-efficiency-score', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (!hasOpenRouterKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const towers = await pool.query('SELECT * FROM cell_towers ORDER BY id LIMIT 50').catch(() => ({ rows: [] }));
    const energy = await pool.query('SELECT * FROM energy_consumption ORDER BY id DESC LIMIT 50').catch(() => ({ rows: [] }));
    const towerSummary = buildSummary(towers.rows, ['height', 'capacity', 'utilization']);
    const energySummary = buildSummary(energy.rows, ['power_consumption_kw', 'pue', 'cost_usd']);

    const prompt = `You are a telecom energy-efficiency analyst. Score the network on Power Usage Effectiveness (PUE) and identify savings.

Towers summary: ${JSON.stringify(towerSummary)}
Energy summary: ${JSON.stringify(energySummary)}
${req.body.target_pue ? `Target PUE: ${req.body.target_pue}` : ''}

Return ONLY valid JSON:
{
  "overall_pue": <number>,
  "efficiency_grade": "A|B|C|D|F",
  "energy_savings_opportunities": [ { "site_or_component": "...", "estimated_savings_kw": <number>, "estimated_savings_usd": <number>, "action": "..." } ],
  "top_offenders": [ { "tower_id": <id>, "pue": <number>, "issue": "..." } ],
  "carbon_footprint_kgco2_per_year": <number>,
  "recommendations": ["..."],
  "summary": "..."
}`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom energy-efficiency analyst. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);
    const content = result.choices[0].message.content;
    const structured = parseAIJson(content) || { raw: content };
    await persistResult(req.user.id || req.user.userId, 'energy-efficiency-score', { target_pue: req.body.target_pue }, structured);
    res.json({ analysis: structured, model: result.model, usage: result.usage, feature: 'Energy Efficiency Score' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
