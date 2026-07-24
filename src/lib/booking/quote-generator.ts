let counter = 0

export function generateQuoteNumber(): string {
  counter++
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const seq = counter.toString().padStart(4, '0')
  return `BM${year}${month}${seq}`
}

export function resetQuoteCounter(): void {
  counter = 0
}