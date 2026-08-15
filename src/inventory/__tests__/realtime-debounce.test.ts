import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLeadingDebouncer } from '../lib/realtime-debounce'

describe('createLeadingDebouncer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('fires immediately on an isolated event (E1-1 <1s requirement)', () => {
    const fn = vi.fn()
    const d = createLeadingDebouncer(2000, fn)
    d.trigger()
    expect(fn).toHaveBeenCalledTimes(1)
    d.dispose()
  })

  it('coalesces a burst: immediate fire + single trailing catch-up', () => {
    const fn = vi.fn()
    const d = createLeadingDebouncer(2000, fn)
    d.trigger() // t=0 -> immediate
    vi.advanceTimersByTime(500)
    d.trigger()
    d.trigger() // burst inside the window
    vi.advanceTimersByTime(1499)
    expect(fn).toHaveBeenCalledTimes(1) // still suppressed
    vi.advanceTimersByTime(1) // trailing fires at window end from last event
    expect(fn).toHaveBeenCalledTimes(2)
    d.dispose()
  })

  it('fires immediately again once the window has elapsed', () => {
    const fn = vi.fn()
    const d = createLeadingDebouncer(2000, fn)
    d.trigger() // t=0
    vi.advanceTimersByTime(2000)
    d.trigger() // t=2000 -> window elapsed -> immediate
    expect(fn).toHaveBeenCalledTimes(2)
    d.dispose()
  })

  it('dispose cancels pending trailing timers', () => {
    const fn = vi.fn()
    const d = createLeadingDebouncer(2000, fn)
    d.trigger() // t=0
    vi.advanceTimersByTime(500)
    d.trigger() // schedules trailing
    d.dispose()
    vi.advanceTimersByTime(5000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('a multi-line PO receive burst coalesces into 2 refreshes, not one per line', () => {
    // receiveItems/074 RPC inserts N ledger rows -> N stock.moved events,
    // plus the PO status update -> 1 po.received event.
    const fn = vi.fn()
    const d = createLeadingDebouncer(2000, fn)
    d.trigger() // line 1 -> immediate refresh
    for (let line = 1; line < 6; line++) {
      vi.advanceTimersByTime(100)
      d.trigger() // lines 2-6 land inside the coalescing window
    }
    vi.advanceTimersByTime(1499)
    expect(fn).toHaveBeenCalledTimes(1) // burst still suppressed
    vi.advanceTimersByTime(1) // trailing catch-up at window end
    expect(fn).toHaveBeenCalledTimes(2) // never one refresh per line
    d.dispose()
  })
})