// Admin audit logging — every management action, attributed to the admin identity.
// Never throws (audit must not block the main operation).
import { getAdminClient } from '@/lib/supabase'
import type { AdminAuditEntry } from './types'

export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    await getAdminClient()
      .from('admin_audit_log')
      .insert({
        admin_id: entry.adminId || null,
        admin_name: entry.adminName || null,
        admin_role: entry.adminRole || null,
        action: entry.action,
        target_type: entry.targetType || null,
        target_id: entry.targetId || null,
        before_values: entry.before || null,
        after_values: entry.after || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        session_id: entry.sessionId || null,
      })
  } catch (err) {
    console.error('[AdminAudit] Failed to log:', err)
  }
}

export async function getAdminAuditLog(filters?: {
  limit?: number
  targetType?: string
  targetId?: string
}): Promise<any[]> {
  let query = getAdminClient()
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 50)

  if (filters?.targetType) query = query.eq('target_type', filters.targetType)
  if (filters?.targetId) query = query.eq('target_id', filters.targetId)

  const { data } = await query
  return data || []
}
