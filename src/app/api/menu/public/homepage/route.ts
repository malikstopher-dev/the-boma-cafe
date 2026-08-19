import { NextResponse } from 'next/server'
import { loadPublicMenu, PUBLIC_MENU_CACHE_HEADERS } from '@/lib/public-menu'

export const revalidate = 60

export async function GET() {
  try {
    return NextResponse.json(await loadPublicMenu('homepage'), { headers: PUBLIC_MENU_CACHE_HEADERS })
  } catch (error) {
    console.error('Error reading homepage menu:', error)
    return NextResponse.json({ error: 'Failed to read menu' }, { status: 500 })
  }
}
