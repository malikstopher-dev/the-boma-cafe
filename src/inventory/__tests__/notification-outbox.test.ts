import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient = { rpc: vi.fn() }
vi.mock('../../lib/supabase', () => ({ getAdminClient: () => mockClient }))

import {
  beginNotificationAttempt,
  claimNotification,
  finishNotificationAttempt,
  notificationProviderKey,
} from '../../jobs/utils/notification-outbox'

describe('notification outbox contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('claims one logical notification through the outbox RPC', async () => {
    mockClient.rpc.mockResolvedValue({
      data: { id: 'notification-1', status: 'pending', should_send: true },
      error: null,
    })

    await expect(claimNotification('customer', 'quote_ready', 'BMC-1', {
      quote_id: 'quote-1',
    })).resolves.toEqual({ id: 'notification-1', status: 'pending', should_send: true })
    expect(mockClient.rpc).toHaveBeenCalledWith('claim_notification_outbox', {
      p_recipient_type: 'customer',
      p_notification_type: 'quote_ready',
      p_recipient_identifier: 'BMC-1',
      p_template_data: { quote_id: 'quote-1' },
    })
  })

  it('does not begin provider delivery when the outbox is already final', async () => {
    mockClient.rpc.mockResolvedValue({
      data: { should_send: false, status: 'sent', attempt_id: null },
      error: null,
    })

    await expect(beginNotificationAttempt('notification-1', 'stable-key')).resolves.toBeNull()
  })

  it('returns an attempt id for a pending delivery', async () => {
    mockClient.rpc.mockResolvedValue({
      data: { should_send: true, status: 'pending', attempt_id: 'attempt-1' },
      error: null,
    })

    await expect(beginNotificationAttempt('notification-1', 'stable-key')).resolves.toBe('attempt-1')
    expect(mockClient.rpc).toHaveBeenCalledWith('begin_notification_delivery', {
      p_notification_id: 'notification-1',
      p_idempotency_key: 'stable-key',
    })
  })

  it('finishes the exact claimed attempt with provider ids', async () => {
    mockClient.rpc.mockResolvedValue({ data: null, error: null })

    await finishNotificationAttempt('notification-1', 'attempt-1', ['provider-1'], null)
    expect(mockClient.rpc).toHaveBeenCalledWith('finish_notification_delivery', {
      p_notification_id: 'notification-1',
      p_attempt_id: 'attempt-1',
      p_provider_ids: ['provider-1'],
      p_error: null,
    })
  })

  it('uses the same provider idempotency key after a crash and retry', () => {
    const first = notificationProviderKey('quote_ready', 'quote-1', 2)
    const retry = notificationProviderKey('quote_ready', 'quote-1', 2)
    expect(first).toBe('quote-ready-quote-1-v2')
    expect(retry).toBe(first)
    expect(notificationProviderKey('admin_new_booking', 'quote-1', 2))
      .toBe('admin-new-booking-quote-1-v2')
  })

  it('fails closed when the outbox cannot be claimed', async () => {
    mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'database unavailable' } })

    await expect(claimNotification('admin', 'admin_new_booking', 'BMC-1', {}))
      .rejects.toThrow('Failed to claim admin_new_booking outbox: database unavailable')
  })
})
