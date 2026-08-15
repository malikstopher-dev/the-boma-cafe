export interface LeadingDebouncer {
  trigger: () => void
  dispose: () => void
}

// Leading-edge debounce with trailing catch-up.
//
// E1-1 contract: "debounce multiple events (≈2 seconds)" while still
// proving "<1s after a live change". A pure trailing debounce would
// always wait the full window, so the FIRST event of a burst fires
// immediately; events arriving inside the window are coalesced and a
// single trailing refetch fires once the burst goes quiet.
//
// Behavior:
//   - isolated event  -> callback fires immediately (1 refetch)
//   - burst of events -> immediate fire + one trailing fire after
//     `windowMs` of quiet (2 refetches total, burst-tail state included)
//   - dispose() cancels any pending trailing timer
export function createLeadingDebouncer(
  windowMs: number,
  fn: () => void,
): LeadingDebouncer {
  let lastFire = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const fire = () => {
    lastFire = Date.now()
    fn()
  }

  const trigger = () => {
    const now = Date.now()
    if (now - lastFire >= windowMs) {
      fire()
      return
    }
    if (timer) clearTimeout(timer)
    timer = setTimeout(fire, windowMs - (now - lastFire))
  }

  const dispose = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { trigger, dispose }
}