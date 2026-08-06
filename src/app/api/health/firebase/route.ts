import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  const checks: Record<string, any> = {
    connected: false,
    firebaseAdmin: false,
    serviceWorker: false,
    pushTable: false,
    env: { firebase: false, supabase: false },
  }

  // 1. Firebase env vars
  const hasFirebaseEnv =
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  checks.env.firebase = hasFirebaseEnv

  // 2. Supabase env vars
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  checks.env.supabase = hasSupabaseEnv

  // 3. Firebase Admin initialization
  try {
    const { getFirebaseAdminApp, getFirebaseMessagingAdmin } = await import('@/lib/firebase/admin')
    const app = getFirebaseAdminApp()
    const messaging = getFirebaseMessagingAdmin()
    checks.firebaseAdmin = !!app && !!messaging
  } catch {
    checks.firebaseAdmin = false
  }

  // 4. Service worker reachability
  try {
    const swRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/firebase-messaging-sw.js`,
      { signal: AbortSignal.timeout(3000) },
    )
    checks.serviceWorker = swRes.ok
  } catch {
    checks.serviceWorker = false
  }

  // 5. push_subscriptions table
  try {
    const { count, error } = await getAdminClient()
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
    checks.pushTable = !error
  } catch {
    checks.pushTable = false
  }

  checks.connected = checks.firebaseAdmin && checks.serviceWorker && checks.pushTable && hasFirebaseEnv

  return NextResponse.json({
    connected: checks.connected,
    firebaseAdmin: checks.firebaseAdmin,
    serviceWorker: checks.serviceWorker,
    pushTable: checks.pushTable,
    env: checks.env,
    timestamp: new Date().toISOString(),
  })
}
