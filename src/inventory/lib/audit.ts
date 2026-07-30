import { getInventoryClient } from './db'

export type AuditAction = 'created' | 'updated' | 'archived' | 'restored' | 'hard_deleted'

export async function writeAuditLog(
  tableName: string,
  recordId: string,
  action: AuditAction,
  changes?: Record<string, unknown> | null,
  performedBy?: string | null,
): Promise<void> {
  try {
    const supabase = getInventoryClient()
    await supabase
      .from('inventory_audit_log')
      .insert({
        table_name: tableName,
        record_id: recordId,
        action,
        changes: changes ?? null,
        performed_by: performedBy ?? null,
      })
  } catch {
    /* audit logging is non-critical — never throw */
  }
}
