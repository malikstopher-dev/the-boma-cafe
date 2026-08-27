import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { removeStorageObjectOrQueue } from '@/lib/storage/media'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'media.write')
  if (authError) return authError

  const client = getAdminClient()
  const { data, error } = await client
    .from('media')
    .select('*')
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to access media' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'media.write')
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const client = getAdminClient()

  const { data: item } = await client
    .from('media')
    .select('url')
    .eq('id', id)
    .single()

  const { error } = await client.from('media').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to access media' }, { status: 500 })

  if (item) {
    const parts = item.url.split('/boma-images/')
    if (parts[1] && !(await removeStorageObjectOrQueue('boma-images', parts[1]))) {
      return NextResponse.json({ error: 'Media deleted, but storage cleanup could not be scheduled' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
