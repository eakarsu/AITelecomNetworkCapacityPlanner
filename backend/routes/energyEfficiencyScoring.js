const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../db');

// Energy efficiency scoring by PUE
// Feature: energy-efficiency-scoring

async function callOpenRouter(systemPrompt, userPrompt, opts = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing. TODO: configure credentials');
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  const base = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const httpResp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: opts.maxTokens || 2048,
      temperature: opts.temperature ?? 0.5,
    }),
  });
  if (!httpResp.ok) throw new Error(`OpenRouter HTTP ${httpResp.status}`);
  const data = await httpResp.json();
  let txt = data.choices[0].message.content.trim();
  txt = txt.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

async function persist(userId, feature, input, output) {
  try {
    if (typeof pool !== 'undefined' && pool && pool.query) {
      await pool.query(
        `INSERT INTO ai_results (user_id, feature, input, output) VALUES ($1,$2,$3,$4)`,
        [userId, feature, JSON.stringify(input).slice(0, 4000), JSON.stringify(output)]
      ).catch(() => {});
    }
  } catch (_) {}
}

// POST /analyze - main feature endpoint
router.post('/analyze', authMiddleware, async (req, res) => {
  const payload = req.body || {};
  try {
    const result = await callOpenRouter(
      'You are an expert assistant for the "AITelecomNetworkCapacityPlanner" platform. Always return strict JSON only — no markdown, no commentary.',
      `Feature: Energy efficiency scoring by PUE.\nUser input: ${JSON.stringify(payload).slice(0, 3500)}\n\nProduce JSON in this shape:\n{\n  "summary": "...",\n  "findings": [...],\n  "recommendations": [...],\n  "score": 0.0,\n  "details": {}\n}`
    );
    const uid = req.user && (req.user.id || req.user.userId || req.user.user_id);
    await persist(uid, 'energy-efficiency-scoring', payload, result);
    res.json({ success: true, feature: 'energy-efficiency-scoring', ...result });
  } catch (err) {
    console.error('energy-efficiency-scoring analyze error:', err.message);
    res.status(500).json({ error: err.message || 'AI request failed' });
  }
});

// POST /batch - batch processing
router.post('/batch', authMiddleware, async (req, res) => {
  const { items = [] } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items array required' });
  try {
    const result = await callOpenRouter(
      'You analyze batches of items for "AITelecomNetworkCapacityPlanner". Return strict JSON only.',
      `Feature: Energy efficiency scoring by PUE. Batch of ${items.length} items.\nItems: ${JSON.stringify(items).slice(0, 3500)}\nReturn JSON: { results:[{index, score, summary, recommendation}], aggregate:{count, mean_score, top_concerns:[]} }`,
      { maxTokens: 3072 }
    );
    res.json({ success: true, feature: 'energy-efficiency-scoring', count: items.length, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history - past invocations
router.get('/history', authMiddleware, async (req, res) => {
  try {
    if (typeof pool === 'undefined' || !pool || !pool.query) return res.json({ history: [] });
    const uid = req.user && (req.user.id || req.user.userId || req.user.user_id);
    const { rows } = await pool.query(
      `SELECT id, input, output, created_at FROM ai_results WHERE user_id=$1 AND feature=$2 ORDER BY created_at DESC LIMIT 50`,
      [uid, 'energy-efficiency-scoring']
    );
    res.json({ history: rows });
  } catch (err) {
    res.json({ history: [], note: 'history table unavailable' });
  }
});

// GET /info - feature metadata
router.get('/info', authMiddleware, (req, res) => {
  res.json({ feature: 'energy-efficiency-scoring', title: 'Energy efficiency scoring by PUE', project: 'AITelecomNetworkCapacityPlanner' });
});

module.exports = router;
