import { getAdminClient } from '@/lib/supabase'

type PushRole = 'admin' | 'kitchen' | 'bar' | 'waiter'

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, string>
  priority?: 'high' | 'normal'
  ttl?: number
}

interface PushSubscription {
  id: string
  user_id: string
  role: PushRole
  fcm_token: string
  device_type: string | null
  is_active: boolean
  app_version: string | null
  last_seen_at: string | null
}

/**
 * Send push notification to all active tokens for a specific role.
 * Returns counts but never throws — fire-and-forget.
 */
export async function sendToRole(
  role: PushRole,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  try {
    const { data: subscriptions } = await getAdminClient()
      .from('push_subscriptions')
      .select('*')
      .eq('role', role)
      .eq('is_active', true)

    return sendToSubscriptions(subscriptions || [], payload)
  } catch (err) {
    console.error(`[push] sendToRole(${role}) failed:`, err)
    return { sent: 0, failed: 0 }
  }
}

export async function notifyOrderCreated(
  orderRef: string,
  role: PushRole,
  source: string,
  station?: string,
): Promise<void> {
  if (source === 'waiter') {
    const promises: Promise<unknown>[] = []
    if (!station || station === 'kitchen') {
      promises.push(sendToRole('kitchen', {
        title: '🍽️ New Waiter Order',
        body: `Order ${orderRef} — ready for kitchen`,
        priority: 'high',
        data: { link: '/staff/kitchen', type: 'new_order', order_ref: orderRef },
      }))
    }
    if (!station || station === 'bar') {
      promises.push(sendToRole('bar', {
        title: '🍸 New Bar Order',
        body: `Order ${orderRef} — ready for bar`,
        priority: 'high',
        data: { link: '/staff/bar', type: 'new_order', order_ref: orderRef },
      }))
    }
    await Promise.all(promises)
  } else {
    await sendToRole('admin', {
      title: '🛒 New Online Order',
      body: `Order ${orderRef} — pending your approval`,
      priority: 'high',
      data: { link: '/staff/admin', type: 'new_order', order_ref: orderRef },
    })
  }
}

export async function notifyOrderConfirmed(orderRef: string): Promise<void> {
  await sendToRole('kitchen', {
    title: '✅ Order Accepted',
    body: `Order ${orderRef} — start preparing`,
    priority: 'high',
    data: { link: '/staff/kitchen', type: 'order_confirmed', order_ref: orderRef },
  })
}

export async function notifyOrderRejected(orderRef: string): Promise<void> {
  await sendToRole('kitchen', {
    title: '❌ Order Rejected',
    body: `Order ${orderRef} was rejected`,
    priority: 'normal',
    data: { link: '/staff/kitchen', type: 'order_rejected', order_ref: orderRef },
  })
}

export async function notifyOrderPreparing(orderRef: string): Promise<void> {
  await sendToRole('admin', {
    title: '👨‍🍳 Preparing',
    body: `Order ${orderRef} is being prepared`,
    priority: 'normal',
    data: { link: '/staff/admin', type: 'order_preparing', order_ref: orderRef },
  })
}

export async function notifyOrderReady(orderRef: string): Promise<void> {
  await sendToRole('admin', {
    title: '🟢 Order Ready',
    body: `Order ${orderRef} is ready for pickup/serving`,
    priority: 'high',
    data: { link: '/staff/admin', type: 'order_ready', order_ref: orderRef },
  })
}

// ── Internal helpers ──────────────────────────────────────

async function sendToSubscriptions(
  subscriptions: PushSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const tokens = subscriptions.map((s) => s.fcm_token)
  const result = await sendMessages(tokens, payload)

  if (result.invalidTokens.length > 0) {
    try {
      await getAdminClient()
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('fcm_token', result.invalidTokens)
    } catch (err) {
      console.error('[push] Failed to deactivate invalid tokens:', err)
    }
  }

  return { sent: result.sent, failed: result.failed }
}

async function sendMessages(
  tokens: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  if (tokens.length === 0) return { sent: 0, failed: 0, invalidTokens: [] }

  try {
    const { getFirebaseMessagingAdmin } = await import('@/lib/firebase/admin')
    const messaging = getFirebaseMessagingAdmin()
    if (!messaging) {
      console.warn('[push] Firebase Admin not available — notification skipped')
      return { sent: 0, failed: 0, invalidTokens: [] }
    }

    const message = {
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data || {},
      android: {
        priority: payload.priority === 'high' ? 'high' as const : 'normal' as const,
        ttl: (payload.ttl || 86400) * 1000,
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1, 'content-available': 1 },
        },
      },
      webpush: {
        notification: {
          icon: payload.icon || '/icons/icon-192.svg',
          badge: payload.badge || '/icons/icon-192.svg',
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: payload.data?.link || '/staff' },
      },
    }

    const response = await messaging.sendEachForMulticast(message)
    const invalidTokens: string[] = []

    response.responses.forEach((resp: { success: boolean; error?: { code?: string } }, idx: number) => {
      if (!resp.success) {
        const code = resp.error?.code
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/unregistered'
        ) {
          const token = tokens[idx]
          if (token) {
            invalidTokens.push(token)
          }
        }
      }
    })

    return {
      sent: response.successCount,
      failed: response.failureCount,
      invalidTokens,
    }
  } catch (err) {
    console.error('[push] FCM send failed:', err)
    return { sent: 0, failed: tokens.length, invalidTokens: [] }
  }
}
