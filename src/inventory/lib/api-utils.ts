import type { InventoryType } from '../engine/types'

export function getInventoryTypeFilter(searchParams: URLSearchParams): InventoryType | null {
  const val = searchParams.get('inventory_type')
  if (!val) return null
  const upper = val.toUpperCase() as InventoryType
  if (['FOOD', 'BEVERAGE', 'CLEANING', 'PACKAGING', 'GENERAL', 'GAS'].includes(upper)) {
    return upper
  }
  return null
}

export function applyInventoryTypeFilter(
  query: any,
  inventoryType: InventoryType | null,
): any {
  if (inventoryType) {
    return query.eq('inventory_type', inventoryType)
  }
  return query
}

export function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`)
  return value.trim()
}

export function getHeader(
  request: { headers: Headers | { get(name: string): string | null } },
  name: string,
): string | null {
  return request.headers.get(name)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * True when the value is a well-formed UUID. Approver identity columns are
 * UUID FKs into staff_profiles; anything else (e.g. the legacy 'admin'
 * string) must never reach the database.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Structured 400 payload for malformed UUID path/body values, so callers get
 * a clean VALIDATION_ERROR instead of a PostgreSQL 22P02 syntax error.
 */
export function uuidError(name: string): { code: string; message: string } {
  return { code: 'VALIDATION_ERROR', message: `${name} must be a valid UUID` }
}
