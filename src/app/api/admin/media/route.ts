import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
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
  const authError = await requireAdmin(request)
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

  if (item) {
    const parts = item.url.split('/boma-images/')
    if (parts[1]) {
      await client.storage.from('boma-images').remove([parts[1]])
    }
  }

  const { error } = await client.from('media').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to access media' }, { status: 500 })

  return NextResponse.json({ success: true })
}
