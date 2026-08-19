import { describe, expect, it } from 'vitest'
import { createSignalCursor } from '../lib/realtime-cursor'

describe('createSignalCursor', () => {
  it('accepts each signal once and advances a monotonic string cursor', () => {
    const cursor = createSignalCursor()
    expect(cursor.accept('9007199254740993')).toBe(true)
    expect(cursor.accept('9007199254740993')).toBe(false)
    expect(cursor.accept('9007199254740992')).toBe(true)
    expect(cursor.lastId).toBe('9007199254740993')
  })

  it('rejects malformed IDs and expires only the bounded dedup history', () => {
    const cursor = createSignalCursor(2)
    expect(cursor.accept(null)).toBe(false)
    expect(cursor.accept('bad')).toBe(false)
    expect(cursor.accept(1)).toBe(true)
    expect(cursor.accept(2)).toBe(true)
    expect(cursor.accept(3)).toBe(true)
    expect(cursor.accept(1)).toBe(true)
    expect(cursor.lastId).toBe('3')
  })
})
