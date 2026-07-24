import { getAdminClient } from '@/lib/supabase'

export async function createAuditEntry(params: {
  booking_id: string
  previous_status: string | null
  new_status: string
  changed_by: string
  changed_by_id?: string
  reason?: string
}): Promise<void> {
  await (await getAdminClient())
    .from('booking_status_history')
    .insert({
      booking_id: params.booking_id,
      previous_status: params.previous_status,
      new_status: params.new_status,
      changed_by: params.changed_by,
      changed_by_id: params.changed_by_id || null,
      reason: params.reason || null,
    })
}