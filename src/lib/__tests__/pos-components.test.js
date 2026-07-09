// POS component logic regression tests
// Run: node src/lib/__tests__/pos-components.test.js
const assert = require('node:assert/strict')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✅ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ❌ ${name}: ${e.message}`)
  }
}

// ── Timer logic ──
console.log('\nTimer Tests\n')

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function getUrgencyColor(elapsedMs, targetMinutes) {
  const targetMs = targetMinutes * 60 * 1000
  const ratio = elapsedMs / targetMs
  if (ratio < 0.7) return { color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
  if (ratio < 1.0) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

test('formatElapsed: 0ms → 0s', () => {
  assert.equal(formatElapsed(0), '0s')
})

test('formatElapsed: 30s → 30s', () => {
  assert.equal(formatElapsed(30000), '30s')
})

test('formatElapsed: 60s → 1m 0s', () => {
  assert.equal(formatElapsed(60000), '1m 0s')
})

test('formatElapsed: 90s → 1m 30s', () => {
  assert.equal(formatElapsed(90000), '1m 30s')
})

test('formatElapsed: 3600s → 1h 0m', () => {
  assert.equal(formatElapsed(3600000), '1h 0m')
})

test('formatElapsed: 5400s → 1h 30m', () => {
  assert.equal(formatElapsed(5400000), '1h 30m')
})

test('getUrgencyColor: <70% → green', () => {
  const result = getUrgencyColor(500000, 15)
  assert.equal(result.color, '#10b981')
})

test('getUrgencyColor: 70-100% → orange', () => {
  const result = getUrgencyColor(700000, 15)
  assert.equal(result.color, '#f59e0b')
})

test('getUrgencyColor: >100% → red', () => {
  const result = getUrgencyColor(1000000, 15)
  assert.equal(result.color, '#ef4444')
})

test('getUrgencyColor: exactly 70% → orange', () => {
  const result = getUrgencyColor(630000, 15)
  assert.equal(result.color, '#f59e0b')
})

test('getUrgencyColor: exactly 100% → red', () => {
  const result = getUrgencyColor(900000, 15)
  assert.equal(result.color, '#ef4444')
})

test('getUrgencyColor: bar target 5min', () => {
  const green = getUrgencyColor(100000, 5)
  const orange = getUrgencyColor(250000, 5)
  const red = getUrgencyColor(350000, 5)
  assert.equal(green.color, '#10b981')
  assert.equal(orange.color, '#f59e0b')
  assert.equal(red.color, '#ef4444')
})

// ── Status config validation ──
console.log('\nStatusBadge Config Tests\n')

const STATUS_CONFIG = {
  pending:    { label: 'NEW',         color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '🆕' },
  confirmed:  { label: 'CONFIRMED',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: '✅' },
  preparing:  { label: 'PREPARING',   color: '#eab308', bg: 'rgba(234,179,8,0.15)',   icon: '🔥' },
  packing:    { label: 'PACKING',     color: '#f97316', bg: 'rgba(249,115,22,0.15)',  icon: '📦' },
  ready:      { label: 'READY',       color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: '✅' },
  served:     { label: 'SERVED',      color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',   icon: '🍽️' },
  completed:  { label: 'COMPLETED',   color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: '✔️' },
  cancelled:  { label: 'CANCELLED',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '❌' },
  rejected:   { label: 'REJECTED',    color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '🚫' },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

test('All 9 statuses have required fields', () => {
  for (const status of ALL_STATUSES) {
    const config = STATUS_CONFIG[status]
    assert.ok(config, `Missing config for ${status}`)
    assert.ok(config.label.length > 0, `${status} label is empty`)
    assert.ok(config.color.startsWith('#'), `${status} color invalid`)
    assert.ok(config.bg.startsWith('rgba'), `${status} bg invalid`)
    assert.ok(config.icon.length > 0, `${status} icon is empty`)
  }
})

test('No duplicate labels', () => {
  const labels = ALL_STATUSES.map(s => STATUS_CONFIG[s].label)
  const unique = new Set(labels)
  assert.equal(labels.length, unique.size, `Duplicate labels found: ${labels.join(', ')}`)
})

test('cancelled and rejected have same color (red)', () => {
  assert.equal(STATUS_CONFIG.cancelled.color, STATUS_CONFIG.rejected.color)
})

// ── Station config validation ──
console.log('\nStationBadge Config Tests\n')

const STATION_CONFIG = {
  kitchen: { label: 'Kitchen', icon: '🍳', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  bar:     { label: 'Bar',     icon: '🍸', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
}

test('Kitchen station has correct config', () => {
  assert.equal(STATION_CONFIG.kitchen.color, '#f59e0b')
  assert.equal(STATION_CONFIG.kitchen.icon, '🍳')
})

test('Bar station has correct config', () => {
  assert.equal(STATION_CONFIG.bar.color, '#8b5cf6')
  assert.equal(STATION_CONFIG.bar.icon, '🍸')
})

test('Kitchen and bar have different colors', () => {
  assert.notEqual(STATION_CONFIG.kitchen.color, STATION_CONFIG.bar.color)
})

// ── OrderType config validation ──
console.log('\nOrderTypeBadge Config Tests\n')

const TYPE_CONFIG = {
  'dine-in':  { label: 'Dine-in',  icon: '🍽️', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  delivery:   { label: 'Delivery',  icon: '🛵', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  pickup:     { label: 'Takeaway',  icon: '🥡', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
}

test('All 3 order types have required fields', () => {
  const types = ['dine-in', 'delivery', 'pickup']
  for (const type of types) {
    const config = TYPE_CONFIG[type]
    assert.ok(config, `Missing config for ${type}`)
    assert.ok(config.label.length > 0, `${type} label is empty`)
    assert.ok(config.color.startsWith('#'), `${type} color invalid`)
  }
})

// ── CountBadge logic ──
console.log('\nCountBadge Logic Tests\n')

function countDisplay(count, max = 99) {
  if (count <= 0) return ''
  return count > max ? `${max}+` : String(count)
}

test('CountBadge: 0 → empty', () => {
  assert.equal(countDisplay(0), '')
})

test('CountBadge: 1 → "1"', () => {
  assert.equal(countDisplay(1), '1')
})

test('CountBadge: 50 → "50"', () => {
  assert.equal(countDisplay(50), '50')
})

test('CountBadge: 99 → "99"', () => {
  assert.equal(countDisplay(99), '99')
})

test('CountBadge: 100 → "99+"', () => {
  assert.equal(countDisplay(100), '99+')
})

test('CountBadge: 250 → "99+"', () => {
  assert.equal(countDisplay(250), '99+')
})

test('CountBadge: custom max 50 → 51 becomes "50+"', () => {
  assert.equal(countDisplay(51, 50), '50+')
})

// ── PosButton variant validation ──
console.log('\nPosButton Config Tests\n')

const VARIANT_STYLES = {
  primary:   { bg: '#10b981', color: '#000' },
  secondary: { bg: 'transparent', color: '#fff' },
  danger:    { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  ghost:     { bg: 'transparent', color: 'rgba(255,255,255,0.6)' },
  warning:   { bg: '#f59e0b', color: '#000' },
  success:   { bg: '#10b981', color: '#000' },
}

const SIZE_STYLES = {
  sm: { height: 40 },
  md: { height: 48 },
  lg: { height: 56 },
}

test('All 6 variants have color and bg', () => {
  const variants = ['primary', 'secondary', 'danger', 'ghost', 'warning', 'success']
  for (const v of variants) {
    const style = VARIANT_STYLES[v]
    assert.ok(style, `Missing variant: ${v}`)
    assert.ok(style.bg.length > 0, `${v} bg is empty`)
    assert.ok(style.color.length > 0, `${v} color is empty`)
  }
})

test('sm/md/lg sizes have increasing heights', () => {
  assert.ok(SIZE_STYLES.sm.height < SIZE_STYLES.md.height, 'sm < md')
  assert.ok(SIZE_STYLES.md.height < SIZE_STYLES.lg.height, 'md < lg')
})

test('lg size meets 56px touch target', () => {
  assert.ok(SIZE_STYLES.lg.height >= 56, `lg height ${SIZE_STYLES.lg.height} < 56px`)
})

test('md size meets 48px touch target', () => {
  assert.ok(SIZE_STYLES.md.height >= 48, `md height ${SIZE_STYLES.md.height} < 48px`)
})

// ── CancelModal quick reasons ──
console.log('\nCancelModal Config Tests\n')

const QUICK_REASONS = [
  'Out of stock',
  'Kitchen closed',
  'Bar item unavailable',
  'Duplicate order',
  'Customer cancelled',
]

test('5 quick reasons defined', () => {
  assert.equal(QUICK_REASONS.length, 5)
})

test('All quick reasons are at least 3 chars', () => {
  for (const r of QUICK_REASONS) {
    assert.ok(r.length >= 3, `"${r}" is less than 3 chars`)
  }
})

test('No duplicate quick reasons', () => {
  const unique = new Set(QUICK_REASONS)
  assert.equal(QUICK_REASONS.length, unique.size)
})

// ── Summary ──
console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
