import { MarketingRole, MarketingPermission, MARKETING_PERMISSIONS } from './types'

export function getMarketingRole(cookieRole?: string): MarketingRole {
  if (!cookieRole) return 'designer'
  switch (cookieRole) {
    case 'super_admin': return 'super_admin'
    case 'admin': return 'admin'
    case 'marketing_manager': return 'marketing_manager'
    default: return 'designer'
  }
}

export function getMarketingPermissions(role: MarketingRole): MarketingPermission {
  return MARKETING_PERMISSIONS[role] || MARKETING_PERMISSIONS.designer
}

export function canCreateProject(role: MarketingRole): boolean {
  return getMarketingPermissions(role).canCreate
}

export function canEditProject(role: MarketingRole): boolean {
  return getMarketingPermissions(role).canEdit
}

export function canDeleteProject(role: MarketingRole): boolean {
  return getMarketingPermissions(role).canDelete
}

export function canPublishProject(role: MarketingRole): boolean {
  return getMarketingPermissions(role).canPublish
}

export function canManageAssets(role: MarketingRole): boolean {
  return getMarketingPermissions(role).canManageAssets
}

export function canManageTemplates(role: MarketingRole): boolean {
  return getMarketingPermissions(role).canManageTemplates
}

export function canExport(role: MarketingRole): boolean {
  return getMarketingPermissions(role).canExport
}

export function requireMarketingRole(
  allowedRoles: MarketingRole[],
  currentRole: MarketingRole
): boolean {
  return allowedRoles.includes(currentRole)
}

export const MARKETING_ROLES = ['super_admin', 'admin', 'marketing_manager', 'designer'] as const
