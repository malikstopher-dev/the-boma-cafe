import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

// Public endpoint used by the login page: active account names + roles.
// No sensitive fields (no ids, no emails beyond the shared display email).
export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await getAdminClient()
    .from('admin_accounts')
    .select('username, display_name, role')
    .eq('is_active', true)
    .order('display_name')

  if (error) return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}