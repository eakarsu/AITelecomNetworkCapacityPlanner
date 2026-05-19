const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function isLoggedIn() {
  return !!getToken();
}

export async function fetchAll(endpoint) {
  const res = await fetch(`${API_BASE}/${endpoint}`, { headers: headers() });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  return res.json();
}

export async function fetchOne(endpoint, id) {
  const res = await fetch(`${API_BASE}/${endpoint}/${id}`, { headers: headers() });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  return res.json();
}

export async function createItem(endpoint, data) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}

export async function updateItem(endpoint, id, data) {
  const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}

export async function deleteItem(endpoint, id) {
  const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}

export async function aiAnalyze(aiEndpoint, question = '') {
  const res = await fetch(`${API_BASE}/ai/${aiEndpoint}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ question }),
  });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}

export async function postAI(endpoint, data = {}) {
  const res = await fetch(`${API_BASE}/ai/${endpoint}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}

export async function fetchMapData() {
  const res = await fetch(`${API_BASE}/cell-towers/map-data`, { headers: headers() });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats/summary`, { headers: headers() });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  return res.json();
}

export async function fetchNetworkHealth() {
  const res = await fetch(`${API_BASE}/stats/network-health`, { headers: headers() });
  if (res.status === 401) { logout(); window.location.href = '/'; throw new Error('Session expired'); }
  return res.json();
}

export async function register(email, password, name, role) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}
