import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { getAdminContext } from '@/lib/admin/context'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { resolveStaffIdentity, type StaffIdentity } from '@/lib/staff/identity'

export const dynamic = 'force-dynamic'

const SAFE_PROFILE_COLUMNS = [
  'id',
  'user_id',
  'name',
  'role',
  'employee_id',
  'avatar_url',
  'phone',
  'on_duty',
  'online',
  'last_seen',
  'created_at',
].join(', ')

const PRESENCE_FIELDS = new Set(['online', 'on_duty', 'avatar_url'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SafeProfile = {
  id: string
  user_id: string
  name: string
  role: string
  employee_id: string | null
  avatar_url: string | null
  phone: string | null
  on_duty: boolean
  online: boolean
  last_seen: string | null
  created_at: string
}

function toSafeProfile(row: Record<string, unknown>): SafeProfile {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    role: String(row.role),
    employee_id: typeof row.employee_id === 'string' ? row.employee_id : null,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    phone: typeof row.phone === 'string' ? row.phone : null,
    on_duty: row.on_duty === true,
    online: row.online === true,
    last_seen: typeof row.last_seen === 'string' ? row.last_seen : null,
    created_at: String(row.created_at),
  }
}

function buildPresenceUpdate(body: Record<string, unknown>): { update?: Record<string, unknown>; error?: string } {
  const unexpected = Object.keys(body).filter((key) => !PRESENCE_FIELDS.has(key))
  if (unexpected.length > 0) {
    return { error: 'Identity and security fields cannot be updated through the presence profile endpoint' }
  }

  const update: Record<string, unknown> = {}
  if ('online' in body) {
    if (typeof body.online !== 'boolean') return { error: 'online must be a boolean' }
    update.online = body.online
  }
  if ('on_duty' in body) {
    if (typeof body.on_duty !== 'boolean') return { error: 'on_duty must be a boolean' }
    update.on_duty = body.on_duty
  }
  if ('avatar_url' in body) {
    if (body.avatar_url !== null && typeof body.avatar_url !== 'string') {
      return { error: 'avatar_url must be a string or null' }
    }
    update.avatar_url = typeof body.avatar_url === 'string' ? body.avatar_url.trim() || null : null
  }

  if (Object.keys(update).length === 0) return { error: 'No valid presence fields to update' }
  update.last_seen = new Date().toISOString()
  return { update }
}

async function getOwnProfile(identity: StaffIdentity): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
  let query = getAdminClient()
    .from('staff_profiles')
    .select(SAFE_PROFILE_COLUMNS)

  if (UUID_PATTERN.test(identity.staffId)) {
    query = query.eq('id', identity.staffId)
  } else {
    const aliases = Array.from(new Set([
      ...identity.aliases,
      identity.role,
      identity.role.toUpperCase(),
    ].filter(Boolean)))
    query = query.or(`user_id.in.(${aliases.join(',')}),employee_id.in.(${aliases.join(',')})`)
  }

  const result = await query.limit(1).maybeSingle()
  return { data: result.data as unknown as Record<string, unknown> | null, error: result.error }
}

export async function GET(request: NextRequest) {
  const admin = await getAdminContext(request)
  if (admin) {
    const authError = await requireAdminPermission(request, 'view:staff_management')
    if (authError) return authError

    const profileId = new URL(request.url).searchParams.get('profile_id')
    let query = getAdminClient()
      .from('staff_profiles')
      .select(SAFE_PROFILE_COLUMNS)
      .order('name')
    if (profileId) query = query.eq('id', profileId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch staff profiles' }, { status: 500 })
    return NextResponse.json((data || []).map((row) => toSafeProfile(row as unknown as Record<string, unknown>)))
  }

  const identity = await resolveStaffIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getOwnProfile(identity)
  if (error) return NextResponse.json({ error: 'Failed to fetch staff profile' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
  return NextResponse.json(toSafeProfile(data))
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'waiter.write')
  if (authError) return authError
  return NextResponse.json({
    error: 'Staff identity creation is available only through /api/waiters',
  }, { status: 405 })
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = await getAdminContext(request)
  let profileId: string
  let presenceBody = body

  if (admin) {
    const authError = await requireAdminPermission(request, 'waiter.write')
    if (authError) return authError

    if (typeof body.profile_id !== 'string' || !UUID_PATTERN.test(body.profile_id)) {
      return NextResponse.json({ error: 'A valid profile_id is required' }, { status: 400 })
    }
    profileId = body.profile_id
    const { profile_id: _profileId, ...rest } = body
    presenceBody = rest
  } else {
    const identity = await resolveStaffIdentity(request)
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ownProfile = await getOwnProfile(identity)
    if (ownProfile.error) return NextResponse.json({ error: 'Failed to resolve staff profile' }, { status: 500 })
    if (!ownProfile.data) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    profileId = String(ownProfile.data.id)
  }

  const parsed = buildPresenceUpdate(presenceBody)
  if (!parsed.update) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await getAdminClient()
    .from('staff_profiles')
    .update(parsed.update)
    .eq('id', profileId)
    .select(SAFE_PROFILE_COLUMNS)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Failed to update staff profile' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
  return NextResponse.json(toSafeProfile(data as unknown as Record<string, unknown>))
}
