// Visibility-gated polling: ticks at `delay` ms but only while the document is
// visible, and fires an immediate refresh when the tab becomes visible again.
//
// Ingress rationale: background tabs that sites leave open (cafe PCs, kiosks,
// phones) keep hitting the API every interval; browsers even re-throttle long
// timers in hidden tabs, which can *raise* request rate. Gating on
// visibilityState drops hidden-tab traffic to zero.

'use client'

import { useEffect, useRef } from 'react'

export function useVisibleInterval(callback: () => void, delay: number | null): void {
  const saved = useRef(callback)
  saved.current = callback

  useEffect(() => {
    if (delay === null) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') saved.current()
    }, delay)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') saved.current()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [delay])
}