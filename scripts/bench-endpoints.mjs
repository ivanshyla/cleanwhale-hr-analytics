#!/usr/bin/env node

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ITER = Number(process.env.BENCH_ITER || 5);

const USERS = [
  { login: process.env.TEST_ADMIN_LOGIN || 'admin', password: process.env.TEST_ADMIN_PASS || 'admin123', label: 'ADMIN' },
  { login: process.env.TEST_CM_LOGIN || 'country_manager', password: process.env.TEST_CM_PASS || 'country123', label: 'COUNTRY_MANAGER' },
];

const ENDPOINTS = [
  { path: '/api/auth/me', method: 'GET' },
  { path: '/api/dashboard-stats', method: 'GET' },
  // Heavier endpoints (optional): '/api/analytics-data?weekIso=2025-W41'
];

async function login(login, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });
  const cookie = res.headers.get('set-cookie');
  if (!res.ok || !cookie) throw new Error(`Login failed for ${login} (${res.status})`);
  return cookie;
}

async function callWithCookie(cookie, endpoint) {
  const url = endpoint.path.includes('?') ? `${BASE}${endpoint.path}` : `${BASE}${endpoint.path}`;
  const t0 = Date.now();
  const res = await fetch(url, { method: endpoint.method, headers: { Cookie: cookie } });
  const ms = Date.now() - t0;
  return { status: res.status, ms };
}

async function benchUser(user) {
  const cookie = await login(user.login, user.password);
  const results = [];
  for (const endpoint of ENDPOINTS) {
    const times = [];
    for (let i = 0; i < ITER; i++) {
      const r = await callWithCookie(cookie, endpoint);
      times.push(r);
      await new Promise((r) => setTimeout(r, 100));
    }
    const ok = times.filter(t => t.status === 200);
    const avg = ok.length ? Math.round(ok.reduce((s, t) => s + t.ms, 0) / ok.length) : null;
    const p95 = ok.length ? ok.map(t => t.ms).sort((a,b)=>a-b)[Math.floor(ok.length*0.95)-1] || ok[ok.length-1] : null;
    results.push({ endpoint: endpoint.path, calls: times.length, ok: ok.length, avgMs: avg, p95Ms: p95 });
  }
  return { user: user.label, results };
}

async function main() {
  const out = { base: BASE, iter: ITER, benches: [] };
  for (const u of USERS) {
    try {
      out.benches.push(await benchUser(u));
    } catch (e) {
      out.benches.push({ user: u.label, error: e.message });
    }
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error('Benchmark failed:', e?.message || e);
  process.exit(2);
});
