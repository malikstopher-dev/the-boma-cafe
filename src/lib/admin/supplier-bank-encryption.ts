import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const KEY_VERSION = 1
const ALGORITHM = 'aes-256-gcm'

type BankPayload = {
  bank_name: string
  account_holder: string
  account_number: string
  branch_code: string
  account_type: string
  payment_reference_note: string
}

function encryptionKey(): Buffer {
  const encoded = process.env.SUPPLIER_BANK_ENCRYPTION_KEY_V1
  if (!encoded) throw new Error('SUPPLIER_BANK_ENCRYPTION_KEY_V1 is not configured')
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32) throw new Error('SUPPLIER_BANK_ENCRYPTION_KEY_V1 must decode to 32 bytes')
  return key
}

function encode(value: Buffer): string {
  return value.toString('base64')
}

function decode(value: string): Buffer {
  return Buffer.from(value, 'base64')
}

export function encryptSupplierBankDetails(supplierId: string, payload: BankPayload) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
  cipher.setAAD(Buffer.from(`${supplierId}:v${KEY_VERSION}`, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  return {
    payload_ciphertext: encode(ciphertext),
    payload_iv: encode(iv),
    payload_auth_tag: encode(cipher.getAuthTag()),
    key_version: KEY_VERSION,
    account_last4: payload.account_number.slice(-4),
  }
}

export function decryptSupplierBankDetails(
  supplierId: string,
  encrypted: { payload_ciphertext: string; payload_iv: string; payload_auth_tag: string; key_version: number },
): BankPayload {
  if (encrypted.key_version !== KEY_VERSION) throw new Error(`Unsupported supplier bank key version: ${encrypted.key_version}`)
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), decode(encrypted.payload_iv))
  decipher.setAAD(Buffer.from(`${supplierId}:v${encrypted.key_version}`, 'utf8'))
  decipher.setAuthTag(decode(encrypted.payload_auth_tag))
  const plaintext = Buffer.concat([decipher.update(decode(encrypted.payload_ciphertext)), decipher.final()]).toString('utf8')
  return JSON.parse(plaintext) as BankPayload
}

export type { BankPayload }
