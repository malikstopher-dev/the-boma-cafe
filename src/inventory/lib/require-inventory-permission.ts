// SYNC-1 Ship 3 — route-level RBAC seam for inventory mutations.
//
// MASTER_TECHNICAL_ARCHITECTURE.md specified a requireInventoryRole() guard
// that was never built. The E8/SYNC-1C model superseded header-trusting role
// checks: identity resolves ONLY from validated admin sessions. This wrapper
// delegates to the existing fail-closed requireAdminPermission() so inventory
// routes share one authorization path with the rest of the admin surface.
//
// Tiers (owner-approved 2026-08-25):
//   inventory.config.write    — catalog/configuration mutations (manager+)
//   inventory.approve         — ledger-posting movements (manager+)
//   inventory.final_approve   — stock-count / daily-stock APPROVAL only
//                               (owner + full_manager)
//   inventory.destructive     — hard deletes (owner + full_manager)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/requireRole'

export type InventoryPermission =
  | 'inventory.config.write'
  | 'inventory.approve'
  | 'inventory.final_approve'
  | 'inventory.destructive'

export async function requireInventoryPermission(
  request: NextRequest,
  permission: InventoryPermission,
): Promise<NextResponse<any> | null> {
  // NextResponse<any>: handlers annotate precise generics
  // (NextResponse<ApiResponse<T>>); NextResponse is invariant in its body
  // type, so the shared denial response must be any to flow into all of them.
  return requireAdminPermission(request, permission)
}
