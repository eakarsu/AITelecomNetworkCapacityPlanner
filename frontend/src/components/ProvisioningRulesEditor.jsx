import React, { useEffect, useState } from 'react';

function authHeaders() {
  const t = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const EMPTY = {
  name: '', region: '', metric: 'utilization', threshold_pct: 80,
  action: '', priority: 'medium', enabled: true, notes: '',
};

export default function ProvisioningRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/custom-views/provisioning-rules', { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'HTTP ' + res.status);
      setRules(d.rules || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `/api/custom-views/provisioning-rules/${editingId}`
        : '/api/custom-views/provisioning-rules';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({ ...form, threshold_pct: Number(form.threshold_pct) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'HTTP ' + res.status);
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (e) { setError(e.message); }
  };

  const edit = (r) => {
    setEditingId(r.id);
    setForm({
      name: r.name || '', region: r.region || '', metric: r.metric || 'utilization',
      threshold_pct: r.threshold_pct, action: r.action || '',
      priority: r.priority || 'medium', enabled: !!r.enabled, notes: r.notes || '',
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      const res = await fetch(`/api/custom-views/provisioning-rules/${id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      load();
    } catch (e) { setError(e.message); }
  };

  const input = { background: '#0d1117', color: '#fff', border: '1px solid #2a3142', padding: '8px 10px', borderRadius: 4, width: '100%' };
  const label = { display: 'block', fontSize: 12, color: '#9aa4b8', marginBottom: 4 };
  const cell = { padding: 8, borderBottom: '1px solid #2a3142', color: '#cfd6e4', fontSize: 13 };

  return (
    <div style={{ background: '#1a1f2e', padding: 20, borderRadius: 8, border: '1px solid #2a3142' }} data-testid="provisioning-rules-editor">
      <h3 style={{ margin: '0 0 6px 0', color: '#fff' }}>Provisioning Rules Editor</h3>
      <div style={{ color: '#9aa4b8', fontSize: 13, marginBottom: 16 }}>
        Define growth thresholds that trigger auto-scaling, capacity uplifts, or rollout actions.
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div><label style={label}>Name *</label><input style={input} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label style={label}>Region</label><input style={input} value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="e.g. Northeast" /></div>
        <div><label style={label}>Metric *</label>
          <select style={input} value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value })}>
            <option value="utilization">utilization</option>
            <option value="bandwidth_utilization">bandwidth_utilization</option>
            <option value="signal_strength">signal_strength</option>
            <option value="latency_ms">latency_ms</option>
            <option value="growth_rate">growth_rate</option>
          </select>
        </div>
        <div><label style={label}>Threshold % *</label><input style={input} type="number" min="0" max="100" required value={form.threshold_pct} onChange={e => setForm({ ...form, threshold_pct: e.target.value })} /></div>
        <div><label style={label}>Action *</label><input style={input} required value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} placeholder="e.g. Add 1 cell tower" /></div>
        <div><label style={label}>Priority</label>
          <select style={input} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
          </select>
        </div>
        <div><label style={label}>Enabled</label>
          <select style={input} value={form.enabled ? 'true' : 'false'} onChange={e => setForm({ ...form, enabled: e.target.value === 'true' })}>
            <option value="true">true</option><option value="false">false</option>
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={label}>Notes</label>
          <input style={input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
          <button type="submit" style={{ background: '#4a9eff', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>
            {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} style={{ background: '#444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 4, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <div style={{ color: '#f44336', marginBottom: 12 }}>Error: {error}</div>}
      {loading ? <div style={{ color: '#9aa4b8' }}>Loading rules...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0d1117', borderRadius: 4 }}>
          <thead>
            <tr style={{ background: '#0d1117' }}>
              <th style={{ ...cell, color: '#9aa4b8', textAlign: 'left' }}>Name</th>
              <th style={{ ...cell, color: '#9aa4b8', textAlign: 'left' }}>Region</th>
              <th style={{ ...cell, color: '#9aa4b8', textAlign: 'left' }}>Metric</th>
              <th style={{ ...cell, color: '#9aa4b8', textAlign: 'left' }}>Threshold</th>
              <th style={{ ...cell, color: '#9aa4b8', textAlign: 'left' }}>Action</th>
              <th style={{ ...cell, color: '#9aa4b8', textAlign: 'left' }}>Priority</th>
              <th style={{ ...cell, color: '#9aa4b8', textAlign: 'left' }}>Enabled</th>
              <th style={{ ...cell, color: '#9aa4b8', textAlign: 'left' }}>—</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <td style={cell}>{r.name}</td>
                <td style={cell}>{r.region || '—'}</td>
                <td style={cell}>{r.metric}</td>
                <td style={cell}>{r.threshold_pct}%</td>
                <td style={cell}>{r.action}</td>
                <td style={cell}>{r.priority}</td>
                <td style={cell}>{r.enabled ? 'yes' : 'no'}</td>
                <td style={cell}>
                  <button onClick={() => edit(r)} style={{ background: 'transparent', color: '#4a9eff', border: '1px solid #4a9eff', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', marginRight: 6 }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ background: 'transparent', color: '#f44336', border: '1px solid #f44336', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
            {!rules.length && (
              <tr><td colSpan={8} style={{ ...cell, textAlign: 'center', color: '#9aa4b8' }}>No rules defined.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
