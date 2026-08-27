'use client'

import { useEffect, useRef } from 'react'

export default function FcmRegistration() {
  const registeredRef = useRef(false)

  useEffect(() => {
    if (registeredRef.current) return
    registeredRef.current = true

    console.log('FCM mounted')

    // Don't block rendering — fire-and-forget
    ;(async () => {
      try {
        const { getFirebaseMessaging, getFirebaseApp } = await import('@/lib/firebase/client')
        const app = getFirebaseApp()
        if (!app) {
          console.log('FCM: Firebase app not available')
          return
        }
        console.log('FCM: Firebase app initialized')

        const messaging = await getFirebaseMessaging()
        if (!messaging) {
          console.log('FCM: Messaging not supported')
          return
        }
        console.log('FCM: Messaging supported')

        const { getToken } = await import('firebase/messaging')

        // Request permission
        let permission: NotificationPermission
        try {
          permission = await Notification.requestPermission()
        } catch {
          console.log('FCM: Notification API not available in this context')
          return
        }
        console.log('Permission:', permission)
        if (permission !== 'granted') return

        // Get existing token
        let existingToken = localStorage.getItem('boma_fcm_token')

        console.log('Getting token...')
        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        })

        console.log('Token received:', !!currentToken)
        if (!currentToken) return

        // If token changed, unregister old one
        if (existingToken && existingToken !== currentToken) {
          console.log('FCM: Token changed — unregistering old')
          await fetch('/api/push/unregister', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fcm_token: existingToken }),
          }).catch((e) => { console.log('FCM: unregister failed', e) })
        }

        // Register new token
        const deviceType = /android/i.test(navigator.userAgent) ? 'android' :
          /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'web'

        console.log('Registering token...')
        const regRes = await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fcm_token: currentToken,
            device_type: deviceType,
            app_version: '1.0.0',
          }),
        })
        console.log('Registration success:', regRes.ok)
        if (!regRes.ok) {
          console.log('FCM: register failed with status', regRes.status, await regRes.text().catch(() => ''))
        }

        localStorage.setItem('boma_fcm_token', currentToken)
      } catch (e) {
        console.log('FCM: error in registration flow:', e)
      }
    })()
  }, [])

  return null
}
