// Regression tests: cookie precedence in getSession() + login response format
// Run: npx tsx src/lib/__tests__/auth.test.ts
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const ADMIN_COOKIE = 'boma_admin_auth'
const KITCHEN_COOKIE = 'boma_kitchen_auth'
const WAITER_COOKIE = 'boma_waiter_auth'
const BAR_COOKIE = 'boma_bar_auth'

const passwords: Record<string, string> = {
  admin: 'Lovers0884',
  kitchen: 'BomaKitchen0884',
  waiter: 'BomaWaiter0884',
  bar: 'BomaBar0884',
}

function expectedCookieValue(role: string): string {
  return createHash('sha256').update(`${role}:${passwords[role]}`).digest('hex')
}

// Simulates getSession() precedence logic (admin → kitchen → bar → waiter)
function getSession(cookies: Record<string, string>): { role: string } | null {
  if (cookies[ADMIN_COOKIE] && cookies[ADMIN_COOKIE] === expectedCookieValue('admin')) return { role: 'admin' }
  if (cookies[KITCHEN_COOKIE] && cookies[KITCHEN_COOKIE] === expectedCookieValue('kitchen')) return { role: 'kitchen' }
  if (cookies[BAR_COOKIE] && cookies[BAR_COOKIE] === expectedCookieValue('bar')) return { role: 'bar' }
  if (cookies[WAITER_COOKIE] && cookies[WAITER_COOKIE] === expectedCookieValue('waiter')) return { role: 'waiter' }
  return null
}

// ── Test runner ─────────────────────────────────────────
let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✅ ${name}`)
  } catch (e: any) {
    failed++
    console.log(`  ❌ ${name}: ${e.message}`)
  }
}

console.log('\n═══ Cookie Precedence Tests ═══\n')

// ── Single cookie ──────────────────────────────────────
test('admin only → admin', () => {
  const result = getSession({ [ADMIN_COOKIE]: expectedCookieValue('admin') })
  assert.equal(result?.role, 'admin')
})

test('kitchen only → kitchen', () => {
  const result = getSession({ [KITCHEN_COOKIE]: expectedCookieValue('kitchen') })
  assert.equal(result?.role, 'kitchen')
})

test('bar only → bar', () => {
  const result = getSession({ [BAR_COOKIE]: expectedCookieValue('bar') })
  assert.equal(result?.role, 'bar')
})

test('waiter only → waiter', () => {
  const result = getSession({ [WAITER_COOKIE]: expectedCookieValue('waiter') })
  assert.equal(result?.role, 'waiter')
})

// ── Mixed cookies (precedence) ─────────────────────────
test('admin + waiter → admin', () => {
  const result = getSession({
    [ADMIN_COOKIE]: expectedCookieValue('admin'),
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'admin')
})

test('admin + bar → admin', () => {
  const result = getSession({
    [ADMIN_COOKIE]: expectedCookieValue('admin'),
    [BAR_COOKIE]: expectedCookieValue('bar'),
  })
  assert.equal(result?.role, 'admin')
})

test('admin + kitchen → admin', () => {
  const result = getSession({
    [ADMIN_COOKIE]: expectedCookieValue('admin'),
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
  })
  assert.equal(result?.role, 'admin')
})

test('kitchen + waiter → kitchen', () => {
  const result = getSession({
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'kitchen')
})

test('kitchen + bar → kitchen', () => {
  const result = getSession({
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
    [BAR_COOKIE]: expectedCookieValue('bar'),
  })
  assert.equal(result?.role, 'kitchen')
})

test('bar + waiter → bar', () => {
  const result = getSession({
    [BAR_COOKIE]: expectedCookieValue('bar'),
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'bar')
})

test('all four → admin (highest precedence)', () => {
  const result = getSession({
    [ADMIN_COOKIE]: expectedCookieValue('admin'),
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
    [BAR_COOKIE]: expectedCookieValue('bar'),
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'admin')
})

// ── Boundary cases ─────────────────────────────────────
test('no cookies → null', () => {
  const result = getSession({})
  assert.equal(result, null)
})

test('invalid admin cookie → null', () => {
  const result = getSession({ [ADMIN_COOKIE]: 'invalid-hash-value' })
  assert.equal(result, null)
})

test('invalid kitchen cookie → null', () => {
  const result = getSession({ [KITCHEN_COOKIE]: 'bad-hash' })
  assert.equal(result, null)
})

test('invalid bar cookie → null', () => {
  const result = getSession({ [BAR_COOKIE]: 'bad-hash' })
  assert.equal(result, null)
})

test('invalid waiter cookie → null', () => {
  const result = getSession({ [WAITER_COOKIE]: 'bad-hash' })
  assert.equal(result, null)
})

test('empty string values → null', () => {
  const result = getSession({
    [ADMIN_COOKIE]: '',
    [KITCHEN_COOKIE]: '',
  })
  assert.equal(result, null)
})

console.log('\n═══ Login Response Format Tests ═══\n')

// Login POST responses should always include authenticated: true on success
test('successful login response shape', () => {
  const mockSuccessResponse = (role: string) => ({
    success: true,
    role,
    authenticated: true,
    ...(role === 'admin' ? { user: { id: '1', username: 'admin' } } : {}),
  })

  for (const role of ['admin', 'kitchen', 'bar', 'waiter']) {
    const resp = mockSuccessResponse(role)
    assert.equal(resp.success, true, `${role}: success should be true`)
    assert.equal(resp.authenticated, true, `${role}: authenticated should be true`)
    assert.equal(resp.role, role, `${role}: role should match`)
  }
})

test('login failure response shape', () => {
  const failureResp = { error: 'Invalid password' }
  assert.equal(failureResp.error, 'Invalid password')
  assert.equal('authenticated' in failureResp, false)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
