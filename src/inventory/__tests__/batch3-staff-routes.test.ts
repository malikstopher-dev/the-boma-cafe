import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  resolveStaffIdentity: vi.fn(),
  resolvePushOwner: vi.fn(),
  getAdminClient: vi.fn(),
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  membership: { data: { conversation_id: 'conversation-1' }, error: null } as any,
}))

vi.mock('@/lib/staff/identity', () => ({ resolveStaffIdentity: mocks.resolveStaffIdentity }))
vi.mock('@/lib/push/identity', () => ({
  resolvePushOwner: mocks.resolvePushOwner,
  isPushOwnerConflict: (error: { message?: string } | null) => error?.message?.includes('push_subscription_owner_conflict') ?? false,
}))
vi.mock('@/lib/supabase', () => ({ getAdminClient: mocks.getAdminClient }))

import { POST as uploadVoice } from '@/app/api/staff/voice-upload/route'
import { POST as registerPush } from '@/app/api/push/register/route'
import { POST as unregisterPush } from '@/app/api/push/unregister/route'

function voiceRequest(file: File): NextRequest {
  const form = new FormData()
  form.append('conversation_id', 'conversation-1')
  form.append('file', file)
  return new NextRequest('https://example.test/api/staff/voice-upload', { method: 'POST', body: form })
}

function jsonRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(`https://example.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function voiceClient() {
  const membershipChain: any = {
    select: vi.fn(() => membershipChain),
    eq: vi.fn(() => membershipChain),
    in: vi.fn(() => membershipChain),
    maybeSingle: vi.fn(async () => mocks.membership),
  }
  return {
    from: vi.fn(() => membershipChain),
    storage: {
      from: vi.fn(() => ({
        upload: mocks.upload,
        createSignedUrl: mocks.createSignedUrl,
        remove: mocks.remove,
      })),
    },
    rpc: mocks.rpc,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.membership = { data: { conversation_id: 'conversation-1' }, error: null }
  mocks.resolveStaffIdentity.mockResolvedValue({
    role: 'waiter',
    staffId: 'staff-1',
    employeeId: 'W001',
    userId: null,
    name: 'Waiter One',
    textId: 'W001',
    aliases: ['W001', 'staff-1'],
    isAdmin: false,
  })
  mocks.resolvePushOwner.mockResolvedValue({ userId: 'W001', role: 'waiter', aliases: ['W001', 'staff-1'] })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.test/voice' }, error: null })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.rpc.mockResolvedValue({ data: [{ id: 'subscription-1', outcome: 'registered' }], error: null })
  mocks.getAdminClient.mockImplementation(voiceClient)
})

describe('Batch 3 private voice uploads', () => {
  it('rejects a foreign conversation before creating a storage object', async () => {
    mocks.membership = { data: null, error: null }
    const file = new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x77, 0x65, 0x62, 0x6d])], 'voice.webm', { type: 'audio/webm' })
    const response = await uploadVoice(voiceRequest(file))

    expect(response.status).toBe(403)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('rejects arbitrary bytes renamed as WebM without creating a storage object', async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'voice.webm', { type: 'audio/webm' })
    const response = await uploadVoice(voiceRequest(file))

    expect(response.status).toBe(415)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('server-generates the private path for a valid member upload', async () => {
    const file = new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x77, 0x65, 0x62, 0x6d])], 'forged-name.exe', { type: 'audio/webm' })
    const response = await uploadVoice(voiceRequest(file))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.storage_path).toMatch(/^voice-notes\/conversation-1\/[0-9a-f-]+\.webm$/)
    expect(mocks.upload).toHaveBeenCalledWith(
      body.storage_path,
      expect.any(Uint8Array),
      { contentType: 'audio/webm', upsert: false },
    )
    expect(JSON.stringify(body)).not.toContain('forged-name.exe')
  })
})

describe('Batch 3 push-token ownership', () => {
  it('rejects a client-supplied foreign owner before the RPC', async () => {
    const response = await registerPush(jsonRequest('/api/push/register', {
      fcm_token: 'token-1',
      user_id: 'OTHER-USER',
    }))

    expect(response.status).toBe(403)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('registers with the server-resolved owner and returns no token or user ID', async () => {
    const response = await registerPush(jsonRequest('/api/push/register', {
      fcm_token: 'token-1',
      device_type: 'web',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('register_owned_push_subscription', expect.objectContaining({
      p_user_id: 'W001',
      p_role: 'waiter',
      p_fcm_token: 'token-1',
    }))
    expect(body).toEqual({ success: true, subscription: { id: 'subscription-1', role: 'waiter' } })
  })

  it('maps an atomic ownership conflict to 403 for register and unregister', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'push_subscription_owner_conflict' } })

    expect((await registerPush(jsonRequest('/api/push/register', { fcm_token: 'token-1' }))).status).toBe(403)
    expect((await unregisterPush(jsonRequest('/api/push/unregister', { fcm_token: 'token-1' }))).status).toBe(403)
  })
})
