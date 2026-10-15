const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { z } = require('zod');

function load(file, dependencies) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

function setup(email = 'owner@example.com') {
  const sessions = [];
  const cookies = [];
  const user = { id: 'a'.repeat(24), email, name: 'Owner', emailVerified: true, passwordHash: 'hash', sessionKey: 'version' };
  const auth = load('src/app/(store)/auth-actions.ts', {
    'next/headers': { cookies: async () => ({ set: (...args) => cookies.push(args) }) },
    'next/navigation': { redirect: (path) => { throw new Error(`redirect:${path}`); } },
    'next/server': { after: () => {} }, zod: { z },
    '@/lib/customer': { safeNext: (next) => next || '/shop' },
    '@/lib/db': { db: { user: { findUnique: async () => user } } },
    '@/lib/auth-throttle': { allowAuthRequest: async () => true },
    '@/lib/session': {
      ADMIN_COOKIE: 'admin', CUSTOMER_COOKIE: 'customer', SESSION_DAYS: 7, CUSTOMER_SESSION_DAYS: 14,
      sessionsConfigured: () => true, isAdminEmail: (value) => value === 'owner@example.com',
      createSession: async (kind, account) => { sessions.push({ kind, account }); return 'signed'; },
    },
    '@/lib/auth': {
      signupSchema: z.object({ email: z.string().email() }), loginSchema: z.object({ email: z.string(), password: z.string() }),
      setPasswordSchema: z.object({ email: z.string(), code: z.string(), password: z.string() }),
      verifyPassword: async () => true, sendPasswordCode: async () => ({ ok: true }),
      setPasswordWithCode: async () => ({ ok: true, user }),
    },
  });
  const form = (fields = {}) => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ email, password: 'password', code: '123456', role: 'admin', ...fields })) data.set(key, value);
    return data;
  };
  return { auth, sessions, cookies, form };
}

test('verified owner password login issues an admin session and opens dashboard', async () => {
  const { auth, sessions, cookies, form } = setup();
  await assert.rejects(auth.loginCustomerAction({}, form()), /redirect:\/admin/);
  assert.equal(sessions[0].kind, 'admin');
  assert.equal(sessions[0].account.version, 'version');
  assert.equal(cookies[0][0], 'admin');
});

test('admin signup preserves destination through verification and creates admin session only afterward', async () => {
  const { auth, sessions, form } = setup();
  await assert.rejects(auth.signupCustomerAction({}, form()), /next=%2Fadmin/);
  assert.equal(sessions.length, 0);
  await assert.rejects(auth.setPasswordAction({}, form({ role: '', next: '/admin' })), /redirect:\/admin/);
  assert.equal(sessions[0].kind, 'admin');
});

test('customer cannot claim admin through signup, login, or verification destination', async () => {
  const { auth, sessions, form } = setup('customer@example.com');
  assert.ok((await auth.signupCustomerAction({}, form())).error);
  assert.ok((await auth.loginCustomerAction({}, form())).error);
  assert.ok((await auth.setPasswordAction({}, form({ role: 'customer', next: '/admin' }))).error);
  assert.equal(sessions.length, 0);
});

test('owner can choose an ordinary customer session', async () => {
  const { auth, sessions, form } = setup();
  await assert.rejects(auth.loginCustomerAction({}, form({ role: 'customer', next: '/checkout' })), /redirect:\/checkout/);
  assert.equal(sessions[0].kind, 'customer');
});

test('admin allowlist accepts exactly one unique owner and fails closed for multiple owners', () => {
  const { isAdminEmail } = load('src/lib/session.ts', { jose: {} });
  const previous = process.env.ADMIN_EMAILS;
  try {
    process.env.ADMIN_EMAILS = ' Owner@Example.com ';
    assert.equal(isAdminEmail('owner@example.com'), true);
    assert.equal(isAdminEmail('customer@example.com'), false);
    process.env.ADMIN_EMAILS = 'owner@example.com,another@example.com';
    assert.equal(isAdminEmail('owner@example.com'), false);
    process.env.ADMIN_EMAILS = '';
    assert.equal(isAdminEmail('owner@example.com'), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previous;
  }
});
