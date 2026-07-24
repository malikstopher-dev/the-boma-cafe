export function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr)
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

export function isPeakSeason(dateStr: string): boolean {
  const date = new Date(dateStr)
  const month = date.getUTCMonth()
  // December peak season
  if (month === 11) return true
  return false
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100)
}

export function calculateTaxInclusive(subtotal: number, taxRate: number): number {
  return subtotal + calculateTax(subtotal, taxRate)
}

export function getTodayFormatted(): string {
  return new Date().toISOString().split('T')[0]
}

export function getDateAfterDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}