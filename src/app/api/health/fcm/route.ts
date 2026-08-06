import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

interface EnvCheck {
  key: string
  present: boolean
}

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  // ── 1. Environment ───────────────────────────────────────────
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const envChecks: EnvCheck[] = requiredEnvVars.map((key) => ({
    key,
    present: !!process.env[key] && process.env[key]!.length > 0,
  }))

  const missingKeys = envChecks.filter((c) => !c.present).map((c) => c.key)
  const hasAllFirebaseWeb = envChecks
    .filter((c) => c.key.startsWith('NEXT_PUBLIC_FIREBASE_'))
    .every((c) => c.present)
  const hasAdminCreds =
    !!process.env.FIREBASE_CLIENT_EMAIL && !!process.env.FIREBASE_PRIVATE_KEY

  // ── 2. Firebase Admin ────────────────────────────────────────
  let firebaseAdminStatus: Record<string, any> = { app: false, messaging: false }
  try {
    const { getFirebaseAdminApp, getFirebaseMessagingAdmin } = await import(
      '@/lib/firebase/admin'
    )
    const app = getFirebaseAdminApp()
    const messaging = getFirebaseMessagingAdmin()
    firebaseAdminStatus = { app: !!app, messaging: !!messaging }
  } catch (err) {
    firebaseAdminStatus = { app: false, messaging: false, error: String(err) }
  }

  // ── 3. Service Worker ────────────────────────────────────────
  let serviceWorkerStatus: Record<string, any> = { reachable: false }
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const swRes = await fetch(`${baseUrl}/firebase-messaging-sw.js`, {
      signal: AbortSignal.timeout(3000),
    })
    serviceWorkerStatus = { reachable: swRes.ok, status: swRes.status }
    if (swRes.ok) {
      const text = await swRes.text()
      serviceWorkerStatus.hasImportScripts = text.includes('importScripts')
      serviceWorkerStatus.hasOnBackgroundMessage = text.includes('onBackgroundMessage')
    }
  } catch (err) {
    serviceWorkerStatus = { reachable: false, error: String(err) }
  }

  // ── 4. Database ──────────────────────────────────────────────
  let databaseStatus: Record<string, any> = { tableExists: false }
  try {
    const supabase = getAdminClient()

    // Check table exists
    const { data: tableData, error: tableError } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })

    if (!tableError) {
      databaseStatus.tableExists = true
      databaseStatus.rowCount = tableData?.length ?? 0

      // Subscription counts
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('role, is_active, device_type')

      const byRole: Record<string, number> = {}
      const activeByRole: Record<string, number> = {}
      let totalActive = 0
      const deviceTypes = new Set<string>()

      if (subscriptions) {
        for (const sub of subscriptions) {
          byRole[sub.role] = (byRole[sub.role] || 0) + 1
          if (sub.is_active) {
            activeByRole[sub.role] = (activeByRole[sub.role] || 0) + 1
            totalActive++
          }
          if (sub.device_type) deviceTypes.add(sub.device_type)
        }
      }

      databaseStatus.subscriptions = {
        total: subscriptions?.length ?? 0,
        active: totalActive,
        byRole,
        activeByRole,
        deviceTypes: Array.from(deviceTypes),
      }
    } else {
      databaseStatus.tableError = tableError.message
    }
  } catch (err) {
    databaseStatus = { tableExists: false, error: String(err) }
  }

  // ── 5. Overall Status ────────────────────────────────────────
  const allPassing =
    firebaseAdminStatus.app &&
    firebaseAdminStatus.messaging &&
    serviceWorkerStatus.reachable &&
    databaseStatus.tableExists &&
    hasAllFirebaseWeb

  const status = allPassing ? 'healthy' : missingKeys.length > 0 ? 'error' : 'warning'

  return NextResponse.json({
    overallStatus: status,
    timestamp: new Date().toISOString(),
    env: {
      allWebVarsPresent: hasAllFirebaseWeb,
      adminCredentialsPresent: hasAdminCreds,
    },
    firebase: {
      app: firebaseAdminStatus.app,
      messaging: firebaseAdminStatus.messaging,
    },
    serviceWorker: {
      reachable: serviceWorkerStatus.reachable,
      status: serviceWorkerStatus.status,
    },
    database: {
      tableExists: databaseStatus.tableExists,
      subscriptions: databaseStatus.subscriptions,
    },
  })
}
