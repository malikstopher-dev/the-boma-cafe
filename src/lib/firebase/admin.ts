import type { App } from 'firebase-admin/app'

let adminApp: App | null = null

function buildCredential() {
  try {
    const { cert } = require('firebase-admin/app')
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
    if (clientEmail && privateKey) {
      return cert({ projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') })
    }
  } catch {
  }
  return undefined
}

export function getFirebaseAdminApp(): App | null {
  if (adminApp) return adminApp
  try {
    const { initializeApp, getApps } = require('firebase-admin/app')
    if (getApps().length === 0) {
      const credential = buildCredential()
      adminApp = initializeApp(
        credential
          ? { credential, projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
          : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID },
      )
    } else {
      adminApp = getApps()[0]
    }
  } catch {
    return null
  }
  return adminApp
}

export function getFirebaseMessagingAdmin() {
  const fbApp = getFirebaseAdminApp()
  if (!fbApp) return null
  try {
    const { getMessaging } = require('firebase-admin/messaging')
    return getMessaging(fbApp)
  } catch {
    return null
  }
}
