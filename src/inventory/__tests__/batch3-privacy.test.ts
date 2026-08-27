import { describe, expect, it } from 'vitest'
import { can } from '../../lib/admin/permissions'
import { parseManualBackgroundJob, redactBackgroundJob } from '../../lib/jobs/admin-api'
import { toPublicSiteSettings } from '../../lib/cms-supabase'
import { toPublicStaffLoginDto } from '../../lib/staff/public-login'
import { isWebmVoice, voiceStoragePath } from '../../lib/staff/voice-media'

const ORDER_ID = '10000000-0000-4000-8000-000000000001'
const LOCATION_ID = '20000000-0000-4000-8000-000000000002'

describe('Batch 3 permission matrix', () => {
  it('limits management configuration and job permissions to owner and full manager', () => {
    const permissions = [
      'settings.write',
      'pricing.write',
      'cms.write',
      'bar_menu.write',
      'media.write',
      'background_jobs.read',
      'background_jobs.write',
    ] as const

    for (const permission of permissions) {
      expect(can('owner', permission)).toBe(true)
      expect(can('full_manager', permission)).toBe(true)
      expect(can('manager', permission)).toBe(false)
      expect(can('assistant_manager', permission)).toBe(false)
    }
  })
})

describe('Batch 3 public DTOs', () => {
  it('drops operational and future unknown settings from the public CMS DTO', () => {
    const settings = toPublicSiteSettings([
      { key: 'homepage', value: '{"heroTitle":"Boma","nested":{"notification_emails":["nested-private@example.com"]}}' },
      { key: 'booking:notification_emails', value: '["private@example.com"]' },
      { key: 'future:secret', value: 'do-not-publish' },
    ])

    expect(settings).toEqual({ homepage: { heroTitle: 'Boma', nested: {} } })
    expect(JSON.stringify(settings)).not.toContain('private@example.com')
    expect(JSON.stringify(settings)).not.toContain('nested-private@example.com')
    expect(JSON.stringify(settings)).not.toContain('future:secret')
  })

  it('returns only the login-safe staff selector fields', () => {
    const dto = toPublicStaffLoginDto({
      id: 'staff-1',
      name: 'Waiter One',
      role: 'waiter',
      pin_hash: 'hash',
    })

    expect(dto).toEqual({ id: 'staff-1', name: 'Waiter One', role: 'waiter', has_pin: true })
    expect(Object.keys(dto).sort()).toEqual(['has_pin', 'id', 'name', 'role'])
  })
})

describe('Batch 3 background-job API boundary', () => {
  it('accepts only exact non-PII manual job schemas', () => {
    expect(parseManualBackgroundJob({
      job_type: 'order_deduction',
      payload: { order_id: ORDER_ID, station: 'bar', location_id: LOCATION_ID },
    })).toMatchObject({
      jobType: 'order_deduction',
      idempotencyKey: `order_deduction:${ORDER_ID}`,
    })

    expect(parseManualBackgroundJob({
      job_type: 'pdf_generation',
      payload: { customerEmail: 'private@example.com' },
    })).toBeNull()
    expect(parseManualBackgroundJob({
      job_type: 'order_deduction',
      payload: { order_id: ORDER_ID, station: 'bar', location_id: LOCATION_ID, customer: 'leak' },
    })).toBeNull()
  })

  it('redacts payloads, lease details, idempotency keys, raw results, and raw errors', () => {
    const redacted = redactBackgroundJob({
      id: 'job-1',
      job_type: 'reservation_lifecycle',
      status: 'failed',
      payload: { customer_email: 'private@example.com' },
      result: { expected: 3, processed: 2, failed: 1, failures: [{ booking_id: 'secret' }] },
      error: { message: 'private@example.com failed', stack: 'secret stack' },
      idempotency_key: 'secret-key',
      locked_by: 'worker-host',
      lease_token: 'lease-secret',
      priority: 0,
      retry_count: 1,
      max_retries: 3,
      scheduled_at: '2026-08-27T00:00:00Z',
      heartbeat_at: null,
      created_at: '2026-08-27T00:00:00Z',
      started_at: null,
      completed_at: null,
    })

    expect(redacted.result).toEqual({ expected: 3, processed: 2, failed: 1 })
    expect(redacted.error).toEqual({ message: 'Job failed' })
    const serialized = JSON.stringify(redacted)
    expect(serialized).not.toContain('private@example.com')
    expect(serialized).not.toContain('secret-key')
    expect(serialized).not.toContain('worker-host')
    expect(serialized).not.toContain('lease-secret')
  })
})

describe('Batch 3 voice signature validation', () => {
  it('accepts the WebM EBML signature and rejects renamed arbitrary bytes', () => {
    expect(isWebmVoice(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x77, 0x65, 0x62, 0x6d]))).toBe(true)
    expect(isWebmVoice(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(false)
  })

  it('converts historical public staff-media URLs to private storage paths', () => {
    expect(voiceStoragePath('voice-notes/conversation-1/note.webm')).toBe('voice-notes/conversation-1/note.webm')
    expect(voiceStoragePath(
      'https://example.supabase.co/storage/v1/object/public/staff-media/voice-notes/conversation-1/note.webm',
    )).toBe('voice-notes/conversation-1/note.webm')
  })
})
