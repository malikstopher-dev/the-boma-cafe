import { getAdminClient } from '../../lib/supabase'

export type NotificationClaim = {
  id: string
  status: string
  should_send: boolean
}

export async function claimNotification(
  recipientType: 'customer' | 'admin',
  notificationType: 'quote_ready' | 'admin_new_booking',
  recipientIdentifier: string,
  templateData: Record<string, unknown>,
): Promise<NotificationClaim> {
  const { data, error } = await getAdminClient().rpc('claim_notification_outbox', {
    p_recipient_type: recipientType,
    p_notification_type: notificationType,
    p_recipient_identifier: recipientIdentifier,
    p_template_data: templateData,
  })
  if (error || !data) {
    throw new Error(`Failed to claim ${notificationType} outbox: ${error?.message ?? 'no result returned'}`)
  }
  return data as NotificationClaim
}

export async function beginNotificationAttempt(
  notificationId: string,
  idempotencyKey: string,
): Promise<string | null> {
  const { data, error } = await getAdminClient().rpc('begin_notification_delivery', {
    p_notification_id: notificationId,
    p_idempotency_key: idempotencyKey,
  })
  if (error || !data) {
    throw new Error(`Failed to begin notification delivery: ${error?.message ?? 'no result returned'}`)
  }
  const result = data as { should_send: boolean; attempt_id: string | null }
  return result.should_send ? result.attempt_id : null
}

export async function finishNotificationAttempt(
  notificationId: string,
  attemptId: string,
  providerIds: Array<string | null> | null,
  errorMessage: string | null,
): Promise<void> {
  const { error } = await getAdminClient().rpc('finish_notification_delivery', {
    p_notification_id: notificationId,
    p_attempt_id: attemptId,
    p_provider_ids: providerIds,
    p_error: errorMessage,
  })
  if (error) throw new Error(`Failed to finish notification delivery: ${error.message}`)
}

export function notificationProviderKey(
  notificationType: 'quote_ready' | 'admin_new_booking',
  quoteId: string,
  version: number,
): string {
  return `${notificationType === 'quote_ready' ? 'quote-ready' : 'admin-new-booking'}-${quoteId}-v${version}`
}
