#!/usr/bin/env node

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_LOGIN = process.env.TEST_ADMIN_LOGIN || 'admin';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS || 'admin123';

async function main() {
  const report = { steps: [], ok: true };

  // 1) Login
  const loginStart = Date.now();
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: ADMIN_LOGIN, password: ADMIN_PASS })
  });
  const loginMs = Date.now() - loginStart;
  const setCookie = loginRes.headers.get('set-cookie');
  report.steps.push({ step: 'login', status: loginRes.status, ms: loginMs, cookie: !!setCookie });
  if (!setCookie || !loginRes.ok) {
    report.ok = false;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  // 2) /api/auth/me
  const meStart = Date.now();
  const meRes = await fetch(`${BASE}/api/auth/me`, {
    method: 'GET',
    headers: { Cookie: setCookie }
  });
  const meMs = Date.now() - meStart;
  const meBody = await meRes.text();
  report.steps.push({ step: 'auth_me', status: meRes.status, ms: meMs, fallback: meRes.headers.get('x-auth-me-fallback') || 'none' });
  if (!meRes.ok) {
    report.ok = false;
    report.error = meBody;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  // 3) /api/users/me (secondary check)
  const me2Start = Date.now();
  const me2Res = await fetch(`${BASE}/api/users/me`, {
    method: 'GET',
    headers: { Cookie: setCookie }
  });
  const me2Ms = Date.now() - me2Start;
  report.steps.push({ step: 'users_me', status: me2Res.status, ms: me2Ms });
  if (!me2Res.ok) {
    report.ok = false;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  // 4) Logout
  const outStart = Date.now();
  const outRes = await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: setCookie }
  });
  const outMs = Date.now() - outStart;
  report.steps.push({ step: 'logout', status: outRes.status, ms: outMs });
  if (!outRes.ok) report.ok = false;

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error('Test failed:', e?.message || e);
  process.exit(2);
});
