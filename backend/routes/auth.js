const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();
require('dotenv').config({ path: '../.env' });

const JWT_SECRET = process.env.JWT_SECRET;

// Local demo autofill is opt-in. Never expose configured credentials in production.
router.get('/demo-credentials', (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL !== 'true' || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip)) {
    return res.status(404).json({ error: 'Demo credential autofill is unavailable.' });
  }
  const pairs = [
    ['DEMO_EMAIL', 'DEMO_PASSWORD'],
    ['DEMO_ADMIN_EMAIL', 'DEMO_ADMIN_PASSWORD'],
    ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'],
    ['ADMIN_EMAIL', 'ADMIN_PASSWORD'],
    ['DEFAULT_EMAIL', 'DEFAULT_PASSWORD'],
  ];
  const pair = pairs.find(([email, password]) => process.env[email] && process.env[password]);
  if (!pair) return res.status(404).json({ error: 'No configured demo account credentials are available.' });
  res.set('Cache-Control', 'no-store');
  return res.json({ email: process.env[pair[0]], password: process.env[pair[1]] });
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Public registration cannot grant an elevated role.
    const userRole = 'viewer';

    const result = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [email, hashedPassword, name, userRole]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
