import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { getAdminAuditLog } from '@/lib/admin/audit'

export const dynamic = 'force-dynamic'

// Recent management activity for the Owner Dashboard feed
export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'view:owner_dashboard')
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100)

  const rows = await getAdminAuditLog({ limit })

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      admin_id: r.admin_id,
      admin_name: r.admin_name,
      admin_role: r.admin_role,
      action: r.action,
      target_type: r.target_type,
      target_id: r.target_id,
      created_at: r.created_at,
    })),
  })
}