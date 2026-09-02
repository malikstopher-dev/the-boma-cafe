import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/122_guided_stock_receipts.sql'),
  'utf8',
)

describe('INV-4B atomic receipt migration', () => {
  it('preserves source UOM inputs and admin attribution on ledger and audit rows', () => {
    expect(sql).toContain('source_quantity NUMERIC(15,4)')
    expect(sql).toContain('source_uom_id UUID REFERENCES public.inventory_uoms(id)')
    expect(sql).toContain('source_conversion_factor NUMERIC(20,6)')
    expect(sql).toContain('source_unit_cost NUMERIC(10,2)')
    expect(sql).toContain('admin_actor_id UUID REFERENCES public.admin_accounts(id)')
    expect(sql).toContain('admin_actor_name TEXT')
    expect(sql).toContain('admin_actor_id, admin_actor_name')
  })

  it('validates an active item, active location, linked UOM, and active management actor', () => {
    expect(sql).toContain('is_active AND deleted_at IS NULL')
    expect(sql).toContain('WHERE id = v_location_id AND is_active = TRUE AND deleted_at IS NULL')
    expect(sql).toContain('FROM public.inventory_product_uoms')
    expect(sql).toContain('AND conversion_factor > 0')
    expect(sql).toContain('FROM public.admin_accounts')
    expect(sql).toContain('WHERE id = v_admin_actor_id AND is_active = TRUE')
  })

  it('keeps ledger, audit, and balance cache in the one authoritative RPC', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_inventory_transaction(p_input JSONB)')
    expect(sql).toContain('INSERT INTO public.inventory_transactions')
    expect(sql).toContain('INSERT INTO public.inventory_audit_log')
    expect(sql).toContain('INSERT INTO public.inventory_product_balances')
    expect(sql).toContain('ON CONFLICT (product_id, location_id)')
    expect(sql).not.toContain('CREATE FUNCTION public.create_inventory_transaction_v2')
  })

  it('keeps the function service-role only', () => {
    expect(sql).toContain('FROM PUBLIC, anon, authenticated')
    expect(sql).toContain('TO service_role')
  })
})
