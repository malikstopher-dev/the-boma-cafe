// Admin RBAC permission map (Mission E8)
import type { AdminRole } from './types'

export type AdminPermission =
  | 'view:owner_dashboard'
  | 'view:reports'
  | 'view:staff_management'
  | 'view:settings'
  | 'view:accounts'
  | 'waiter.write'
  | 'waiter.pin_reset'
  | 'settings.write'
  | 'pricing.write'
  | 'cms.write'
  | 'bar_menu.write'
  | 'media.write'
  | 'background_jobs.read'
  | 'background_jobs.write'
  | 'inventory.config.write'
  | 'inventory.approve'
  | 'inventory.final_approve'
  | 'inventory.destructive'
  | 'accounts.write'
  | 'accounts.delete'
  | 'accounts.change_role'
  | 'security.settings'
  | 'security.sessions'
  | 'supplier.bank.read'
  | 'supplier.bank.write'
  | 'supplier.bank.delete'
  | 'supplier.finance.read'
  | 'supplier.finance.write'

const ALL: AdminPermission[] = [
  'view:owner_dashboard',
  'view:reports',
  'view:staff_management',
  'view:settings',
  'view:accounts',
  'waiter.write',
  'waiter.pin_reset',
  'settings.write',
  'pricing.write',
  'cms.write',
  'bar_menu.write',
  'media.write',
  'background_jobs.read',
  'background_jobs.write',
  'inventory.config.write',
  'inventory.approve',
  // Stock-count / daily-stock APPROVAL only — owner + full_manager (Ship 3,
  // owner decision 2026-08-25: submissions stay manager-tier, approvals do not).
  'inventory.final_approve',
  'inventory.destructive',
  'accounts.write',
  'accounts.delete',
  'accounts.change_role',
  'security.settings',
  'security.sessions',
  'supplier.bank.read',
  'supplier.bank.write',
  'supplier.bank.delete',
  'supplier.finance.read',
  'supplier.finance.write',
]

// Manager: operational administration, no user/security/system config.
const MANAGER: AdminPermission[] = [
  'view:reports',
  'view:staff_management',
  'view:settings',
  'waiter.write',
  'waiter.pin_reset',
  'inventory.config.write',
  'inventory.approve',
]

// Assistant manager: daily operations, no configuration/approvals that post ledger.
const ASSISTANT_MANAGER: AdminPermission[] = [
  'waiter.pin_reset', // reset of waiter PINs is a daily operational task (manager + assistant per examples)
]

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  owner: ALL,
  full_manager: ALL.filter(p => !['accounts.delete', 'accounts.change_role', 'security.settings', 'security.sessions', 'supplier.bank.delete'].includes(p)),
  manager: MANAGER,
  assistant_manager: ASSISTANT_MANAGER,
}

export function can(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function roleLabel(role: AdminRole): string {
  return role === 'owner' ? 'Owner' : role === 'full_manager' ? 'Main Manager' : role === 'manager' ? 'Manager' : 'Assistant Manager'
}
