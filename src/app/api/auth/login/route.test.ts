import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const users = [
    { id: '1', login: 'admin', password: 'hash', isActive: true, role: 'ADMIN', city: 'WARSAW' },
    { id: '2', login: 'Country_Manager', password: 'hash', isActive: true, role: 'COUNTRY_MANAGER', city: 'WARSAW' },
  ];
  return {
    prisma: {
      user: {
        findFirst: vi.fn(async ({ where }: any) => {
          const equals = where.login.equals;
          const target = String(equals).toLowerCase();
          return users.find(u => u.login.toLowerCase() === target) || null;
        }),
      },
    },
  };
});

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(async () => true) },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(() => 'jwt-token') },
}));

vi.mock('@/lib/env', () => ({
  getJwtSecret: () => 'x'.repeat(32),
}));

// Minimal NextResponse polyfill
class MockResponse {
  status = 200;
  body: any = null;
  cookies = { set: vi.fn() } as any;
  static json(body: any, init?: { status?: number }) {
    const res = new MockResponse();
    res.body = body;
    if (init?.status) res.status = init.status;
    return res;
  }
}

vi.mock('next/server', async () => {
  const actual = await vi.importActual<any>('next/server');
  return { ...actual, NextResponse: MockResponse };
});

import { POST } from './route';

function makeRequest(payload: any) {
  return { json: async () => payload } as any;
}

describe('login POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds user case-insensitively and trims login', async () => {
    const req = makeRequest({ login: '  COUNTRY_manager  ', password: 'any' });
    const res: any = await POST(req);
    expect(res.status).toBe(200);
    expect(res.body.user.login).toBeDefined();
  });

  it('rejects when login missing after normalization', async () => {
    const req = makeRequest({ login: '   ', password: 'any' });
    const res: any = await POST(req);
    expect(res.status).toBe(400);
  });
});
