import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  const bucket = searchParams.get('bucket') || 'menu-images'

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  try {
    const client = await getAdminClient()
    const { data } = client.storage.from(bucket).getPublicUrl(path)
    if (!data?.publicUrl) {
      return NextResponse.json({ error: 'Failed to resolve URL' }, { status: 404 })
    }
    return NextResponse.redirect(data.publicUrl, 302)
  } catch (error) {
    console.error('Image resolution error:', error)
    return NextResponse.json({ error: 'Failed to resolve image' }, { status: 500 })
  }
}
