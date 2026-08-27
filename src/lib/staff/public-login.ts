export const PUBLIC_STAFF_LOGIN_ROLES = ['waiter', 'kitchen', 'bar'] as const

type StaffLoginRow = {
  id: string
  name: string
  role: string
  pin_hash: string | null
}

export function toPublicStaffLoginDto(row: StaffLoginRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    has_pin: !!row.pin_hash,
  }
}
