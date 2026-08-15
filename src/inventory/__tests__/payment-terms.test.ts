import { describe, it, expect } from 'vitest'
import {
  computeDueDate, deriveDueDate, daysUntilDue, isOverdue,
  PAYMENT_TERM_TYPES, PAYMENT_TERM_LABELS, ACCOUNT_DEFAULT_DAYS,
} from '../engine/payment-terms'

describe('computeDueDate', () => {
  it('CASH is due on the invoice date', () => {
    expect(computeDueDate('2026-08-15', 'CASH', null)).toBe('2026-08-15')
  })

  it('COD is due on the invoice date', () => {
    expect(computeDueDate('2026-08-15', 'COD', null)).toBe('2026-08-15')
  })

  it('NULL term (legacy supplier) is due on the invoice date', () => {
    expect(computeDueDate('2026-08-15', null, null)).toBe('2026-08-15')
  })

  it('WEEKLY is due 7 days later', () => {
    expect(computeDueDate('2026-08-15', 'WEEKLY', null)).toBe('2026-08-22')
  })

  it('MONTHLY is due the same day next month', () => {
    expect(computeDueDate('2026-08-15', 'MONTHLY', null)).toBe('2026-09-15')
  })

  it('MONTHLY clamps month ends like Postgres (Jan 31 -> Feb 28)', () => {
    expect(computeDueDate('2026-01-31', 'MONTHLY', null)).toBe('2026-02-28')
  })

  it('MONTHLY clamps to Feb 29 in leap years', () => {
    expect(computeDueDate('2024-01-31', 'MONTHLY', null)).toBe('2024-02-29')
  })

  it('MONTHLY across year boundary', () => {
    expect(computeDueDate('2026-12-10', 'MONTHLY', null)).toBe('2027-01-10')
  })

  it('ACCOUNT uses the custom days', () => {
    expect(computeDueDate('2026-08-15', 'ACCOUNT', 30)).toBe('2026-09-14')
  })

  it('ACCOUNT defaults to 30 days when days is NULL', () => {
    expect(ACCOUNT_DEFAULT_DAYS).toBe(30)
    expect(computeDueDate('2026-08-15', 'ACCOUNT', null)).toBe('2026-09-14')
  })
})

describe('deriveDueDate', () => {
  it('returns null for a missing invoice date', () => {
    expect(deriveDueDate(null, 'MONTHLY', null)).toBeNull()
  })

  it('derives from the supplier term for historical invoices', () => {
    expect(deriveDueDate('2026-08-01', 'WEEKLY', null)).toBe('2026-08-08')
  })
})

describe('daysUntilDue / isOverdue (read-time)', () => {
  it('counts days remaining as positive', () => {
    expect(daysUntilDue('2026-08-20', '2026-08-15')).toBe(5)
  })

  it('is zero when due today', () => {
    expect(daysUntilDue('2026-08-15', '2026-08-15')).toBe(0)
  })

  it('is negative when overdue', () => {
    expect(daysUntilDue('2026-08-10', '2026-08-15')).toBe(-5)
  })

  it('returns null for a missing due date', () => {
    expect(daysUntilDue(null, '2026-08-15')).toBeNull()
  })

  it('isOverdue is false for future and today, true for the past', () => {
    expect(isOverdue('2026-08-20', '2026-08-15')).toBe(false)
    expect(isOverdue('2026-08-15', '2026-08-15')).toBe(false)
    expect(isOverdue('2026-08-10', '2026-08-15')).toBe(true)
    expect(isOverdue(null, '2026-08-15')).toBe(false)
  })
})

describe('constants', () => {
  it('allowlist matches the DB CHECK constraint', () => {
    expect(PAYMENT_TERM_TYPES).toEqual(['CASH', 'COD', 'ACCOUNT', 'WEEKLY', 'MONTHLY'])
  })

  it('has a label for every allowed type', () => {
    for (const t of PAYMENT_TERM_TYPES) {
      expect(PAYMENT_TERM_LABELS[t]).toBeTruthy()
    }
  })
})