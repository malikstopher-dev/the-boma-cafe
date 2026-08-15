// Structured supplier payment terms (migration 089).
// Single source of truth for term values, labels and due-date math used by
// the PO receive invoice creation (P1d + P1e) and the payables read path.

export const PAYMENT_TERM_TYPES = ['CASH', 'COD', 'ACCOUNT', 'WEEKLY', 'MONTHLY'] as const
export type PaymentTermType = (typeof PAYMENT_TERM_TYPES)[number]

export const PAYMENT_TERM_LABELS: Record<string, string> = {
  CASH: 'Cash',
  COD: 'Cash on Delivery',
  ACCOUNT: 'Account',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
}

export const ACCOUNT_DEFAULT_DAYS = 30

function parseDate(iso: string): Date {
  const parts = iso.split('-')
  const y = Number(parts[0])
  const m = Number(parts[1] ?? 1)
  const d = Number(parts[2] ?? 1)
  return new Date(Date.UTC(y, m - 1, d))
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Postgres-compatible month addition: "Jan 31 + 1 month" clamps to Feb 28/29
// (matches `date + interval '1 month'` used by the receive RPC).
function addMonthsClamped(iso: string, months: number): string {
  const date = parseDate(iso)
  const day = date.getUTCDate()
  const targetMonth = date.getUTCMonth() + months
  const year = date.getUTCFullYear() + Math.floor(targetMonth / 12)
  const month = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return toIso(new Date(Date.UTC(year, month, Math.min(day, lastDay))))
}

function addDays(iso: string, days: number): string {
  const date = parseDate(iso)
  return toIso(new Date(date.getTime() + days * 86400000))
}

export function computeDueDate(invoiceDate: string, termType: string | null, termDays: number | null): string {
  switch (termType) {
    case 'WEEKLY':
      return addDays(invoiceDate, 7)
    case 'MONTHLY':
      return addMonthsClamped(invoiceDate, 1)
    case 'ACCOUNT':
      return addDays(invoiceDate, termDays ?? ACCOUNT_DEFAULT_DAYS)
    default:
      // CASH / COD / NULL -> due on the invoice date
      return invoiceDate
  }
}

// Read-time derivation for invoices that predate structured terms
// (due_date column is NULL on historical rows). Never writes to the DB.
export function deriveDueDate(
  invoiceDate: string | null,
  termType: string | null,
  termDays: number | null,
): string | null {
  if (!invoiceDate) return null
  return computeDueDate(invoiceDate, termType, termDays)
}

// Signed days from today: positive = due in N days, 0 = due today,
// negative = overdue by -N days.
export function daysUntilDue(dueDate: string | null, today?: string): number | null {
  if (!dueDate) return null
  const ref = today ?? new Date().toISOString().slice(0, 10)
  return Math.round((parseDate(dueDate).getTime() - parseDate(ref).getTime()) / 86400000)
}

export function isOverdue(dueDate: string | null, today?: string): boolean {
  const days = daysUntilDue(dueDate, today)
  return days !== null && days < 0
}