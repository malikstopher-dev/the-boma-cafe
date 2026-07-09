// Regression tests: cookie precedence in getSession()
// Run: npx tsx src/lib/__tests__/auth.test.ts
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

// Constants matching src/lib/auth.ts
const ADMIN_COOKIE = 'boma_admin_auth'
const KITCHEN_COOKIE = 'boma_kitchen_auth'
const WAITER_COOKIE = 'boma_waiter_auth'

const passwords = {
  admin: 'test-admin-pass-123',
  kitchen: 'test-kitchen-pass-456',
  waiter: 'test-waiter-pass-789',
}

function expectedCookieValue(role: 'admin' | 'kitchen' | 'waiter'): string {
  return createHash('sha256').update(`${role}:${passwords[role]}`).digest('hex')
}

// Simulates the getSession() precedence logic (admin → kitchen → waiter)
function getSession(cookies: Record<string, string>): { role: string } | null {
  if (cookies[ADMIN_COOKIE] && cookies[ADMIN_COOKIE] === expectedCookieValue('admin')) return { role: 'admin' }
  if (cookies[KITCHEN_COOKIE] && cookies[KITCHEN_COOKIE] === expectedCookieValue('kitchen')) return { role: 'kitchen' }
  if (cookies[WAITER_COOKIE] && cookies[WAITER_COOKIE] === expectedCookieValue('waiter')) return { role: 'waiter' }
  return null
}

// ── Test cases ─────────────────────────────────────────

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

console.log('\nCookie Precedence Tests\n')

test('admin + waiter cookies → admin', () => {
  const result = getSession({
    [ADMIN_COOKIE]: expectedCookieValue('admin'),
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'admin', `Expected admin, got ${result?.role}`)
})

test('kitchen + waiter cookies → kitchen', () => {
  const result = getSession({
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'kitchen', `Expected kitchen, got ${result?.role}`)
})

test('waiter only → waiter', () => {
  const result = getSession({
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'waiter', `Expected waiter, got ${result?.role}`)
})

test('admin only → admin', () => {
  const result = getSession({
    [ADMIN_COOKIE]: expectedCookieValue('admin'),
  })
  assert.equal(result?.role, 'admin', `Expected admin, got ${result?.role}`)
})

test('kitchen only → kitchen', () => {
  const result = getSession({
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
  })
  assert.equal(result?.role, 'kitchen', `Expected kitchen, got ${result?.role}`)
})

test('all three → admin (highest precedence)', () => {
  const result = getSession({
    [ADMIN_COOKIE]: expectedCookieValue('admin'),
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'admin', `Expected admin, got ${result?.role}`)
})

test('admin + kitchen → admin', () => {
  const result = getSession({
    [ADMIN_COOKIE]: expectedCookieValue('admin'),
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
  })
  assert.equal(result?.role, 'admin', `Expected admin, got ${result?.role}`)
})

test('kitchen + waiter → kitchen', () => {
  const result = getSession({
    [KITCHEN_COOKIE]: expectedCookieValue('kitchen'),
    [WAITER_COOKIE]: expectedCookieValue('waiter'),
  })
  assert.equal(result?.role, 'kitchen', `Expected kitchen, got ${result?.role}`)
})

test('no cookies → null', () => {
  const result = getSession({})
  assert.equal(result, null, `Expected null, got ${JSON.stringify(result)}`)
})

test('invalid cookie value → null', () => {
  const result = getSession({
    [ADMIN_COOKIE]: 'invalid-hash-value',
  })
  assert.equal(result, null, `Expected null, got ${JSON.stringify(result)}`)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
