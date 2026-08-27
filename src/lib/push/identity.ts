import type { NextRequest } from 'next/server'
import { resolveStaffIdentity } from '@/lib/staff/identity'

export type PushOwner = {
  userId: string
  role: 'admin' | 'kitchen' | 'waiter' | 'bar'
  aliases: string[]
}

export async function resolvePushOwner(request: NextRequest): Promise<PushOwner | null> {
  const identity = await resolveStaffIdentity(request)
  if (!identity) return null
  return {
    userId: identity.textId,
    role: identity.role,
    aliases: identity.aliases,
  }
}

export function isPushOwnerConflict(error: { message?: string } | null): boolean {
  return error?.message?.includes('push_subscription_owner_conflict') ?? false
}
