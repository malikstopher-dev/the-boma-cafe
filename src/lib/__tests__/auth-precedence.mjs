// Regression tests: cookie precedence — kitchen → waiter (legacy admin scrapped)
// Run: node src/lib/__tests__/auth-precedence.mjs
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const ADMIN_COOKIE = 'boma_admin_auth'
const KITCHEN_COOKIE = 'boma_kitchen_auth'
const WAITER_COOKIE = 'boma_waiter_auth'

function expectedCookieValue(role, pwd) {
  return createHash('sha256').update(`${role}:${pwd}`).digest('hex')
}

const P = {
  admin: expectedCookieValue('admin', 'test-admin-pass-123'),
  kitchen: expectedCookieValue('kitchen', 'test-kitchen-pass-456'),
  waiter: expectedCookieValue('waiter', 'test-waiter-pass-789'),
}

// Replicates getSession() precedence: kitchen → waiter (the legacy
// shared-password admin cookie is scrapped and never resolves)
function getSession(cookies) {
  if (cookies[KITCHEN_COOKIE] === P.kitchen) return { role: 'kitchen' }
  if (cookies[WAITER_COOKIE] === P.waiter) return { role: 'waiter' }
  return null
}

let pass = 0, fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`  ✅ ${name}`) }
  catch (e) { fail++; console.log(`  ❌ ${name}: ${e.message}`) }
}

console.log('\nCookie Precedence Tests\n')

t('legacy admin + waiter cookies → waiter (admin ignored)', () => {
  assert.equal(getSession({ [ADMIN_COOKIE]: P.admin, [WAITER_COOKIE]: P.waiter })?.role, 'waiter')
})

t('kitchen + waiter cookies → kitchen', () => {
  assert.equal(getSession({ [KITCHEN_COOKIE]: P.kitchen, [WAITER_COOKIE]: P.waiter })?.role, 'kitchen')
})

t('waiter only → waiter', () => {
  assert.equal(getSession({ [WAITER_COOKIE]: P.waiter })?.role, 'waiter')
})

t('kitchen only → kitchen', () => {
  assert.equal(getSession({ [KITCHEN_COOKIE]: P.kitchen })?.role, 'kitchen')
})

t('legacy admin cookie only → null (scrapped)', () => {
  assert.equal(getSession({ [ADMIN_COOKIE]: P.admin }), null)
})

t('legacy admin + kitchen → kitchen (admin ignored)', () => {
  assert.equal(getSession({ [ADMIN_COOKIE]: P.admin, [KITCHEN_COOKIE]: P.kitchen })?.role, 'kitchen')
})

t('kitchen + waiter → kitchen', () => {
  assert.equal(getSession({ [KITCHEN_COOKIE]: P.kitchen, [WAITER_COOKIE]: P.waiter })?.role, 'kitchen')
})

t('no cookies → null', () => {
  assert.equal(getSession({}), null)
})

t('invalid cookie → null', () => {
  assert.equal(getSession({ [ADMIN_COOKIE]: 'garbage' }), null)
})

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail > 0 ? 1 : 0)
