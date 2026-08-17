import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSuggestions } from '../engine/reorder'

const mockClient = {
  from: vi.fn(),
}

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

function ok<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

type Row = Record<string, unknown>

let rulesRows: Row[]
let anyRuleRows: Row[]
let productsRows: Row[]
let balancesRows: Row[]
let saleRows: Row[]

function resetFixtures() {
  rulesRows = []
  anyRuleRows = []
  productsRows = []
  balancesRows = []
  saleRows = []
}

describe('getSuggestions rule-less fallback (O4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFixtures()
    mockClient.from.mockImplementation((table: string) => {
      const chainObj: Record<string, unknown> = {}
      let selectStr = ''
      const eqs: [string, unknown][] = []
      chainObj.select = (s: string) => { selectStr = s ?? ''; return chainObj }
      chainObj.order = () => chainObj
      chainObj.eq = (col: string, val: unknown) => { eqs.push([col, val]); return chainObj }
      chainObj.is = () => chainObj
      chainObj.in = () => chainObj
      chainObj.gte = () => chainObj
      chainObj.limit = () => chainObj

      const getResult = () => {
        if (table === 'inventory_reorder_rules' && selectStr.startsWith('*, inventory_products!inner')) {
          return ok(rulesRows)
        }
        if (table === 'inventory_reorder_rules') {
          return ok(anyRuleRows)
        }
        if (table === 'inventory_products') {
          const typeFilter = eqs.find(([c]) => c === 'inventory_type')?.[1]
          if (typeFilter) {
            return ok(productsRows.filter(p => p.inventory_type === typeFilter))
          }
          return ok(productsRows)
        }
        if (table === 'inventory_product_balances') {
          if (selectStr === 'balance') {
            const pid = eqs.find(([c]) => c === 'product_id')?.[1]
            return ok(balancesRows.find(b => b.product_id === pid) ?? null)
          }
          return ok(balancesRows)
        }
        if (table === 'inventory_transactions') {
          if (selectStr === 'quantity') {
            const pid = eqs.find(([c]) => c === 'product_id')?.[1]
            return ok(saleRows.filter(t => t.product_id === pid))
          }
          return ok(saleRows)
        }
        if (table === 'inventory_suppliers') {
          return ok(null)
        }
        return ok(null)
      }

      chainObj.single = () => getResult()
      chainObj.maybeSingle = () => getResult()
      chainObj.then = (onF: (v: unknown) => unknown) => getResult().then(onF)
      return chainObj
    })
  })

  it('includes a rule-less out-of-stock product as critical with a sensible quantity', async () => {
    productsRows = [{ id: 'p1', name: 'CHICKEN', sku: 'CHK-1', inventory_type: 'FOOD' }]
    balancesRows = [{ product_id: 'p1', balance: 0 }]
    saleRows = []

    const suggestions = await getSuggestions('loc-1')

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      productId: 'p1',
      productName: 'CHICKEN',
      currentStock: 0,
      urgency: 'critical',
      suggestedQuantity: 1,
      minLevel: 0,
      leadTimeDays: 3,
      estimatedDaysUntilStockout: 0,
    })
  })

  it('excludes healthy rule-less products', async () => {
    productsRows = [{ id: 'p1', name: 'CHICKEN', sku: 'CHK-1', inventory_type: 'FOOD' }]
    balancesRows = [{ product_id: 'p1', balance: 50 }]
    saleRows = []

    const suggestions = await getSuggestions('loc-1')

    expect(suggestions).toHaveLength(0)
  })

  it('includes a rule-less product heading for stockout inside the lead time', async () => {
    productsRows = [{ id: 'p2', name: 'WINE', sku: 'WIN-1', inventory_type: 'BEVERAGE' }]
    balancesRows = [{ product_id: 'p2', balance: 2 }]
    saleRows = [{ product_id: 'p2', quantity: -30 }]

    const suggestions = await getSuggestions('loc-1')

    expect(suggestions).toHaveLength(1)
    const s0 = suggestions[0]!
    expect(s0.urgency).toBe('critical')
    expect(s0.dailyUsage).toBe(1)
    expect(s0.estimatedDaysUntilStockout).toBe(2)
    expect(s0.suggestedQuantity).toBe(1)
  })

  it('keeps rule-driven suggestions unchanged (medium band still applies)', async () => {
    rulesRows = [{
      product_id: 'p1',
      min_level: 5,
      max_level: 100,
      par_level: null,
      lead_time_days: 3,
      auto_suggest: true,
      preferred_supplier_id: null,
      inventory_products: { id: 'p1', name: 'VODKA', sku: 'VOD-1', inventory_type: 'BEVERAGE' },
    }]
    anyRuleRows = [{ product_id: 'p1' }]
    productsRows = [{ id: 'p1', name: 'VODKA', sku: 'VOD-1', inventory_type: 'BEVERAGE' }]
    balancesRows = [{ product_id: 'p1', balance: 40 }]
    saleRows = []

    const suggestions = await getSuggestions('loc-1')

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]!).toMatchObject({ urgency: 'medium', suggestedQuantity: 60 })
  })

  it('honours auto_suggest=false: a disabled rule product is never added by the fallback', async () => {
    anyRuleRows = [{ product_id: 'p1' }]
    productsRows = [{ id: 'p1', name: 'CHICKEN', sku: 'CHK-1', inventory_type: 'FOOD' }]
    balancesRows = [{ product_id: 'p1', balance: 0 }]
    saleRows = []

    const suggestions = await getSuggestions('loc-1')

    expect(suggestions).toHaveLength(0)
  })

  it('applies the inventory_type filter to the fallback universe', async () => {
    productsRows = [
      { id: 'p1', name: 'CHICKEN', sku: 'CHK-1', inventory_type: 'FOOD' },
      { id: 'p2', name: 'WINE', sku: 'WIN-1', inventory_type: 'BEVERAGE' },
    ]
    balancesRows = [
      { product_id: 'p1', balance: 0 },
      { product_id: 'p2', balance: 0 },
    ]
    saleRows = []

    const suggestions = await getSuggestions('loc-1', 'FOOD')

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]!.productId).toBe('p1')
  })
})