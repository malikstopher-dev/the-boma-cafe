// Admin identity system types (Mission E8 — separate from staff system)

export type AdminRole = 'owner' | 'full_manager' | 'manager' | 'assistant_manager'

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Owner',
  full_manager: 'Full Manager',
  manager: 'Manager',
  assistant_manager: 'Assistant Manager',
}

export const ADMIN_EMAIL = 'info@thebomacafe.co.za'

export interface AdminAccount {
  id: string
  username: string
  display_name: string
  email: string
  role: AdminRole
  password_hash: string | null
  must_change_password: boolean
  is_active: boolean
  failed_attempts: number
  locked_until: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string | null
  created_by: string | null
}

export interface AdminSessionInfo {
  sessionId: string
  adminId: string
  username: string
  displayName: string
  role: AdminRole
  startedAt: string
  expiresAt: string
}

export interface AdminContext {
  adminId: string
  username: string
  displayName: string
  role: AdminRole
  legacy: boolean
  sessionId: string | null
}

export interface AdminAuditEntry {
  adminId: string | null
  adminName: string | null
  adminRole: string | null
  action: string
  targetType?: string
  targetId?: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  sessionId?: string | null
}
