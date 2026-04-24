const express = require('express');
const https = require('https');
const http = require('http');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
require('dotenv').config({ path: '../.env' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

function callOpenRouter(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: messages,
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
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// AI Analysis for Cell Tower Optimization
router.post('/tower-optimization', authMiddleware, async (req, res) => {
  try {
    const towers = await pool.query('SELECT * FROM cell_towers ORDER BY id');
    const prompt = `You are an expert telecom network engineer. Analyze these cell tower deployments and provide optimization recommendations.

Tower Data:
${JSON.stringify(towers.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Tower placement efficiency and coverage overlap
2. Load balancing recommendations
3. Capacity upgrade priorities
4. Cost-effective expansion suggestions
5. Signal coverage optimization

Format your response with clear sections, bullet points, and specific actionable recommendations with metrics where possible.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom network optimization specialist. Provide detailed, actionable analysis with specific metrics and recommendations.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Cell Tower Optimization'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Bandwidth Allocation
router.post('/bandwidth-analysis', authMiddleware, async (req, res) => {
  try {
    const allocations = await pool.query('SELECT * FROM bandwidth_allocations ORDER BY id');
    const prompt = `You are an expert telecom bandwidth planner. Analyze these bandwidth allocations and provide optimization recommendations.

Bandwidth Data:
${JSON.stringify(allocations.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Current utilization efficiency across regions
2. Over-provisioned and under-provisioned allocations
3. Priority rebalancing suggestions
4. Cost optimization opportunities
5. Future allocation recommendations

Format with clear sections, percentages, and specific reallocation suggestions.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom bandwidth optimization specialist. Provide detailed analysis with specific reallocation numbers and cost savings.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Bandwidth Allocation Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for 5G Rollout Planning
router.post('/rollout-analysis', authMiddleware, async (req, res) => {
  try {
    const plans = await pool.query('SELECT * FROM rollout_plans ORDER BY id');
    const prompt = `You are an expert 5G deployment strategist. Analyze these 5G rollout plans and provide strategic recommendations.

Rollout Plans:
${JSON.stringify(plans.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Rollout progress assessment and timeline adherence
2. Budget utilization and ROI projections
3. Priority region recommendations
4. Technology mix optimization (NR vs mmWave vs FWA)
5. Risk assessment and mitigation strategies

Format with clear sections, timelines, and specific prioritization rankings.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI 5G deployment strategist. Provide detailed rollout analysis with timelines, budget recommendations, and risk assessments.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: '5G Rollout Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Coverage Gaps
router.post('/coverage-analysis', authMiddleware, async (req, res) => {
  try {
    const gaps = await pool.query('SELECT * FROM coverage_gaps ORDER BY id');
    const prompt = `You are an expert telecom coverage analyst. Analyze these coverage gaps and provide remediation recommendations.

Coverage Gap Data:
${JSON.stringify(gaps.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Priority ranking of coverage gaps by impact
2. Cost-effective remediation strategies
3. Population impact assessment
4. Technical solutions for each gap type
5. Timeline and resource allocation recommendations

Format with clear priority rankings, estimated costs, and implementation timelines.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom coverage analysis specialist. Provide prioritized remediation plans with cost estimates and impact metrics.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Coverage Gap Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Demand Forecasting
router.post('/demand-analysis', authMiddleware, async (req, res) => {
  try {
    const forecasts = await pool.query('SELECT * FROM demand_forecasts ORDER BY id');
    const prompt = `You are an expert telecom demand forecasting analyst. Analyze these demand forecasts and provide strategic insights.

Forecast Data:
${JSON.stringify(forecasts.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Demand growth trend analysis by region and data type
2. Capacity planning recommendations
3. Investment priority areas
4. Risk factors that could alter forecasts
5. Infrastructure scaling recommendations

Format with growth projections, confidence assessments, and specific capacity recommendations.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom demand forecasting specialist. Provide detailed demand analysis with growth projections and infrastructure recommendations.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Demand Forecasting Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Network Load Balancing
router.post('/load-analysis', authMiddleware, async (req, res) => {
  try {
    const loads = await pool.query('SELECT * FROM network_load ORDER BY id');
    const prompt = `You are an expert network load balancing engineer. Analyze these network load metrics and provide optimization recommendations.

Network Load Data:
${JSON.stringify(loads.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Current load distribution assessment
2. Nodes at risk of overload
3. Optimal load balancing strategy recommendations
4. Latency and packet loss improvements
5. Capacity scaling priorities

Format with specific traffic redistribution recommendations and expected performance improvements.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI network load balancing specialist. Provide detailed load analysis with specific redistribution and optimization recommendations.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Network Load Balancing Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Spectrum Management
router.post('/spectrum-analysis', authMiddleware, async (req, res) => {
  try {
    const spectrum = await pool.query('SELECT * FROM spectrum_management ORDER BY id');
    const prompt = `You are an expert spectrum management consultant. Analyze these spectrum holdings and provide optimization recommendations.

Spectrum Data:
${JSON.stringify(spectrum.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Spectrum utilization efficiency by band
2. Underutilized and overutilized bands
3. Refarming and technology migration opportunities
4. License renewal and acquisition strategy
5. Interference management recommendations

Format with specific utilization metrics, refarming recommendations, and spectrum strategy priorities.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI spectrum management specialist. Provide detailed spectrum analysis with utilization metrics and strategic recommendations.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Spectrum Management Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for QoS Monitoring
router.post('/qos-analysis', authMiddleware, async (req, res) => {
  try {
    const qos = await pool.query('SELECT * FROM qos_monitoring ORDER BY id');
    const prompt = `You are an expert QoS and SLA management consultant. Analyze these QoS metrics and provide improvement recommendations.

QoS Data:
${JSON.stringify(qos.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. SLA compliance assessment across services
2. Services at risk of violation
3. Root cause analysis for current violations
4. Improvement recommendations per service
5. Proactive monitoring and alerting recommendations

Format with SLA compliance scores, risk rankings, and specific improvement actions.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI QoS monitoring specialist. Provide detailed SLA analysis with compliance metrics and improvement recommendations.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'QoS Monitoring Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Infrastructure Cost
router.post('/cost-analysis', authMiddleware, async (req, res) => {
  try {
    const costs = await pool.query('SELECT * FROM infrastructure_costs ORDER BY id');
    const prompt = `You are an expert telecom infrastructure financial analyst. Analyze these infrastructure costs and provide optimization recommendations.

Cost Data:
${JSON.stringify(costs.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Total CapEx and OpEx breakdown analysis
2. ROI assessment and investment priorities
3. Cost reduction opportunities
4. Vendor consolidation recommendations
5. Budget allocation optimization

Format with financial summaries, ROI rankings, and specific cost-saving recommendations with dollar amounts.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom infrastructure financial analyst. Provide detailed cost analysis with ROI metrics and specific cost optimization recommendations.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Infrastructure Cost Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Signal Interference
router.post('/interference-analysis', authMiddleware, async (req, res) => {
  try {
    const interference = await pool.query('SELECT * FROM signal_interference ORDER BY id');
    const prompt = `You are an expert RF interference analyst. Analyze these signal interference incidents and provide mitigation recommendations.

Interference Data:
${JSON.stringify(interference.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Interference severity assessment and prioritization
2. Root cause analysis by interference type
3. Immediate mitigation actions required
4. Long-term prevention strategies
5. Regulatory compliance and enforcement recommendations

Format with severity rankings, affected user counts, and specific mitigation timelines.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI RF interference analysis specialist. Provide detailed interference analysis with severity rankings and specific mitigation strategies.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Signal Interference Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Network Alarms
router.post('/alarm-analysis', authMiddleware, async (req, res) => {
  try {
    const alarms = await pool.query('SELECT * FROM network_alarms ORDER BY id');
    const prompt = `You are an expert network operations center (NOC) analyst. Analyze these network alarms and provide incident management recommendations.

Alarm Data:
${JSON.stringify(alarms.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Critical alarm triage and prioritization
2. Pattern analysis - recurring issues and correlations
3. Mean Time to Acknowledge (MTTA) and Mean Time to Resolve (MTTR) assessment
4. Staffing and escalation recommendations
5. Proactive monitoring improvements to prevent future alarms

Format with severity-based prioritization, correlation insights, and specific operational improvements.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI NOC operations specialist. Provide detailed alarm analysis with triage priorities and operational efficiency recommendations.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Network Alarm Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Subscriber Analytics
router.post('/subscriber-analysis', authMiddleware, async (req, res) => {
  try {
    const subs = await pool.query('SELECT * FROM subscriber_analytics ORDER BY id');
    const prompt = `You are an expert telecom subscriber analytics consultant. Analyze these subscriber metrics and provide growth and retention recommendations.

Subscriber Data:
${JSON.stringify(subs.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Churn risk assessment by segment
2. ARPU optimization opportunities
3. Customer satisfaction improvement strategies
4. Growth segment identification
5. Competitive positioning and pricing recommendations

Format with segment rankings, revenue impact estimates, and specific retention strategies.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom subscriber analytics specialist. Provide detailed subscriber analysis with churn predictions, ARPU optimization, and growth strategies.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Subscriber Analytics'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Fiber Routes
router.post('/fiber-analysis', authMiddleware, async (req, res) => {
  try {
    const fibers = await pool.query('SELECT * FROM fiber_routes ORDER BY id');
    const prompt = `You are an expert fiber optic network planner. Analyze these fiber routes and provide network optimization recommendations.

Fiber Route Data:
${JSON.stringify(fibers.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Network topology assessment and single points of failure
2. Capacity utilization and upgrade priorities
3. Redundancy gap analysis
4. Route optimization and new build recommendations
5. Dark fiber monetization opportunities

Format with topology diagrams (text), capacity projections, and specific route recommendations.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI fiber optic network planning specialist. Provide detailed fiber route analysis with topology assessment and capacity planning.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Fiber Route Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Maintenance Schedules
router.post('/maintenance-analysis', authMiddleware, async (req, res) => {
  try {
    const maint = await pool.query('SELECT * FROM maintenance_schedules ORDER BY id');
    const prompt = `You are an expert telecom maintenance planning consultant. Analyze these maintenance schedules and provide optimization recommendations.

Maintenance Data:
${JSON.stringify(maint.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Schedule conflict detection and risk assessment
2. Maintenance window optimization to minimize impact
3. Resource allocation and team utilization analysis
4. Preventive vs reactive maintenance balance
5. Cost optimization and vendor management recommendations

Format with timeline views, conflict alerts, and specific scheduling improvements.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom maintenance planning specialist. Provide detailed maintenance analysis with schedule optimization and impact minimization strategies.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Maintenance Schedule Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Analysis for Energy Consumption
router.post('/energy-analysis', authMiddleware, async (req, res) => {
  try {
    const energy = await pool.query('SELECT * FROM energy_consumption ORDER BY id');
    const prompt = `You are an expert telecom energy and sustainability consultant. Analyze these energy consumption metrics and provide optimization recommendations.

Energy Data:
${JSON.stringify(energy.rows, null, 2)}

${req.body.question ? `Specific question: ${req.body.question}` : ''}

Provide analysis covering:
1. Total energy cost and consumption analysis
2. PUE (Power Usage Effectiveness) improvement opportunities
3. Renewable energy adoption roadmap
4. Carbon footprint reduction strategies
5. Cost optimization through energy efficiency and procurement

Format with energy cost breakdowns, sustainability metrics, and specific reduction targets with dollar savings.`;

    const result = await callOpenRouter([
      { role: 'system', content: 'You are an AI telecom energy and sustainability specialist. Provide detailed energy analysis with cost optimization and sustainability recommendations.' },
      { role: 'user', content: prompt }
    ]);

    res.json({
      analysis: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      feature: 'Energy Consumption Analysis'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
