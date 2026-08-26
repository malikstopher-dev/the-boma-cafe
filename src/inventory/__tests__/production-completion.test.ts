import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  run: {
    id: 'run-1',
    recipe_id: 'recipe-1',
    location_id: 'loc-1',
    status: 'completed',
    quantity_planned: 2,
    quantity_completed: 2,
    cost_centre_id: 'cc-1',
    started_by: null,
    started_at: null,
    completed_by: null,
    completed_at: '2026-08-26T00:00:00Z',
    notes: null,
    created_at: '2026-08-26T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
    inventory_recipes: { name: 'Sauce' },
  },
  items: [{
    id: 'item-1',
    production_run_id: 'run-1',
    product_id: 'prod-1',
    direction: 'consumed',
    quantity: 2,
    transaction_id: 'txn-1',
    wastage_pct: 0,
    sort_order: 1,
    inventory_products: { name: 'Tomato' },
  }],
}))

function query(result: unknown, terminal: 'single' | 'list') {
  const chain: any = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => terminal === 'list'
    ? Promise.resolve({ data: result, error: null })
    : chain)
  chain.maybeSingle = vi.fn(async () => ({ data: result, error: null }))
  return chain
}

vi.mock('../lib/db', () => ({
  getInventoryClient: () => ({ rpc: state.rpc, from: state.from }),
}))

import { completeProductionRun } from '../engine/production-runs'

beforeEach(() => {
  vi.clearAllMocks()
  state.rpc.mockResolvedValue({
    data: {
      production_run_id: 'run-1',
      status: 'completed',
      created: 1,
      transaction_ids: ['txn-1'],
      already_completed: false,
    },
    error: null,
  })
  state.from.mockImplementation((table: string) => {
    if (table === 'inventory_production_runs') return query(state.run, 'single')
    if (table === 'inventory_production_run_items') return query(state.items, 'list')
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('atomic production completion engine', () => {
  it('uses exactly one completion RPC and returns the committed detail', async () => {
    const result = await completeProductionRun('run-1', 2, null)
    expect(state.rpc).toHaveBeenCalledTimes(1)
    expect(state.rpc).toHaveBeenCalledWith('complete_production_run', {
      p_run_id: 'run-1',
      p_quantity_completed: 2,
      p_completed_by: null,
    })
    expect(result.status).toBe('completed')
    expect(result.items[0]?.transaction_id).toBe('txn-1')
  })

  it('does not execute a partial TypeScript fallback when the RPC fails', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: 'Insufficient stock for product prod-1' } })
    await expect(completeProductionRun('run-1', 2, null)).rejects.toThrow('Insufficient stock')
    expect(state.from).not.toHaveBeenCalled()
  })

  it('treats an idempotent/concurrent completed result as success without new writes', async () => {
    state.rpc.mockResolvedValue({
      data: {
        production_run_id: 'run-1',
        status: 'completed',
        created: 0,
        transaction_ids: ['txn-1'],
        already_completed: true,
      },
      error: null,
    })
    await expect(completeProductionRun('run-1')).resolves.toMatchObject({ status: 'completed' })
    expect(state.rpc).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid completed quantity before the database call', async () => {
    await expect(completeProductionRun('run-1', 0)).rejects.toThrow('greater than zero')
    expect(state.rpc).not.toHaveBeenCalled()
  })
})

describe('atomic production completion migration contract', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/110_atomic_production_completion.sql'),
    'utf8',
  )

  it('locks the run and all run items before validating or writing', () => {
    const runLock = sql.indexOf('FOR UPDATE OF run')
    const itemLock = sql.indexOf('PERFORM 1\n  FROM public.inventory_production_run_items')
    const validation = sql.indexOf('FOR v_required IN')
    const transactionInsert = sql.indexOf('INSERT INTO public.inventory_transactions')
    expect(runLock).toBeGreaterThan(-1)
    expect(itemLock).toBeGreaterThan(runLock)
    expect(validation).toBeGreaterThan(itemLock)
    expect(transactionInsert).toBeGreaterThan(validation)
  })

  it('validates aggregated consumed quantities against the authoritative ledger', () => {
    expect(sql).toContain("item.direction = 'consumed'")
    expect(sql).toContain('SUM(item.quantity * v_scale * (1 + COALESCE(item.wastage_pct, 0) / 100))')
    expect(sql).toContain('FROM public.inventory_transactions transaction')
    expect(sql).toContain('IF v_balance < v_required.quantity THEN')
    expect(sql).toContain('Insufficient stock for product % at location %')
  })

  it('writes signed consumed/produced movements, audit, cache, links, and final status atomically', () => {
    expect(sql).toContain("IF v_item.direction = 'consumed' THEN")
    expect(sql).toContain('v_movement_qty := -ROUND')
    expect(sql).toContain('INSERT INTO public.inventory_audit_log')
    expect(sql).toContain('UPDATE public.inventory_production_run_items')
    expect(sql).toContain('INSERT INTO public.inventory_product_balances')
    expect(sql).toContain("SET status = 'completed'")
  })

  it('is retry/concurrency idempotent and service-role only', () => {
    expect(sql).toContain("IF v_run.status = 'completed' THEN")
    expect(sql).toContain("'already_completed', TRUE")
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.complete_production_run')
    expect(sql).toContain('TO service_role')
  })
})
