'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import { HyperFormula } from 'hyperformula'
import { C, PageTitle, Card, Button, Select, formatMoney, formatQty } from '../kit'
import { weekRange, lastWeekOfYear, currentWeekNumber } from '@/inventory/lib/weeks'
import AddStockWorkspace from '@/inventory-v2/components/AddStockWorkspace'
import MultiReceiptWorkspace from '@/inventory-v2/components/MultiReceiptWorkspace'
import { isLegacyAddStockRollback } from '@/inventory-v2/lib/add-stock'

// ---------------------------------------------------------------------------
// The Stock Sheet is a spreadsheet: a live cell grid where formulas evaluate
// (HyperFormula), Enter moves down, Tab moves right, and every writable cell
// is click-to-type. Ledger columns (RECEIVED / WASTE / COUNTED) dispatch real
// stock movements through the existing ledger APIs; everything else is just
// cells — persisted per sheet (week) in inventory_sheets / sheet_cells.
// ---------------------------------------------------------------------------

interface StockRow {
  productId: string
  productName: string
  sku: string | null
  unit: string | null
  category: string | null
  supplier: string | null
  price: number
  opening: number
  received: number
  used: number
  waste: number
  closing: number
  store: number | null
  orderQty: number | null
  counted: number | null
  notes: string | null
}

interface SheetCellRow {
  row_idx: number
  col_key: string
  raw_value: string
  data_type: string
}

interface SheetApiRow {
  productId: string
  productName: string
  sku: string | null
  unit: string | null
  category: string | null
  supplier: string | null
  inventoryType: string | null
  opening: number
  received: number
  used: number
  waste: number
  adjustments: number
  closing: number
  unitCost: number
  reorderThreshold: number | null
  reorderQuantity: number | null
}

interface ProductApiRow {
  id: string
  name: string
  sku: string | null
  inventory_type: string
  unit_cost: number | null
  reorder_threshold: number | null
  reorder_quantity: number | null
}

interface CategoryApiRow { id: string; name: string; children?: CategoryApiRow[] }
interface SupplierApiRow { id: string; name: string }
interface UomApiRow { id: string; name: string }

type TabId = 'bar' | 'kitchen'

type ColKey =
  | 'sku' | 'productName' | 'category' | 'unit' | 'supplier'
  | 'price' | 'opening' | 'received' | 'used' | 'waste' | 'closing'
  | 'store' | 'orderQty' | 'counted' | 'variance' | 'totalValue' | 'notes' | 'del'

interface GridCol {
  key: ColKey
  name: string
  width: number
  kind: 'text' | 'number' | 'select' | 'computed' | 'button'
}

const TAB_OPTIONS: Array<{ id: TabId; label: string }> = [
  { id: 'bar', label: 'Bar Stock' },
  { id: 'kitchen', label: 'Kitchen / Food Stock (Main Bar)' },
]

const BLANK_ROW: StockRow = {
  productId: '', productName: '', sku: null, unit: null, category: null, supplier: null,
  price: 0, opening: 0, received: 0, used: 0, waste: 0, closing: 0,
  store: null, orderQty: null, counted: 0, notes: null,
}

const TODAY = () => new Date().toISOString().slice(0, 10)

const fmtNum = (v: number | null | undefined, digits = 2): string =>
  v == null || Number.isNaN(v) ? '' : Number(v).toLocaleString('en-ZA', { maximumFractionDigits: digits })

const fmtCell = (v: string): string => {
  const n = Number(v)
  return Number.isFinite(n) ? fmtNum(n) : String(v)
}

function flattenCategories(tree: CategoryApiRow[], out: Array<{ id: string; name: string }> = []): Array<{ id: string; name: string }> {
  for (const node of tree) {
    out.push({ id: node.id, name: node.name })
    if (node.children?.length) flattenCategories(node.children, out)
  }
  return out
}

export default function StockSheetPage() {
  const [tab, setTab] = useState<TabId>('bar')
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [week, setWeek] = useState(() => currentWeekNumber())
  const [mainLocId, setMainLocId] = useState('main')
  const [locations, setLocations] = useState<Array<{ id: string; name: string; is_active: boolean }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [uoms, setUoms] = useState<UomApiRow[]>([])
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [rows, setRows] = useState<StockRow[]>([])
  const [totals, setTotals] = useState<{ opening: number; received: number; used: number; waste: number; closing: number; value: number } | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [raws, setRaws] = useState<Record<string, string>>({})
  const [sel, setSel] = useState<{ i: number; key: ColKey } | null>(null)
  const [q, setQ] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [addStockOpen, setAddStockOpen] = useState(false)
  const [multiReceiptOpen, setMultiReceiptOpen] = useState(false)
  const [legacyAddStock, setLegacyAddStock] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const gridAnchor = useRef<HTMLDivElement | null>(null)
  const saveQueue = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cellQueue = useRef<Map<string, { row_idx: number; col_key: string; raw_value: string }>>(new Map())
  const cellTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = (msg: string) => { setSaved(msg); window.setTimeout(() => setSaved(''), 2600) }
  const typeForTab: Record<TabId, string> = { bar: 'BEVERAGE', kitchen: 'FOOD' }

  useEffect(() => {
    setLegacyAddStock(isLegacyAddStockRollback(window.location.search))
  }, [])

  // ---------------------------- columns (A..) ----------------------------

  const cols: GridCol[] = useMemo(() => {
    const isBar = tab === 'bar'
    const list: GridCol[] = [
      { key: 'sku', name: 'SKU / CODE', width: 108, kind: 'text' },
      { key: 'productName', name: 'STOCK ITEM', width: 210, kind: 'text' },
      { key: 'category', name: 'CATEGORY', width: 136, kind: 'select' },
      { key: 'unit', name: 'UNIT', width: 104, kind: 'select' },
    ]
    if (!isBar) list.push({ key: 'supplier', name: 'SUPPLIER', width: 146, kind: 'select' })
    list.push(
      { key: 'price', name: 'PRICE (R)', width: 92, kind: 'number' },
      { key: 'opening', name: 'OPENING', width: 88, kind: 'computed' },
      { key: 'received', name: 'RECEIVED', width: 92, kind: 'number' },
      { key: 'used', name: 'ISSUED', width: 86, kind: 'computed' },
      { key: 'waste', name: 'WASTE', width: 86, kind: 'number' },
    )
    if (isBar) list.push({ key: 'store', name: 'STORE ROOM', width: 94, kind: 'computed' })
    list.push(
      { key: 'closing', name: 'CLOSING', width: 92, kind: 'computed' },
      { key: 'orderQty', name: 'ORDER QTY', width: 92, kind: 'computed' },
      { key: 'counted', name: 'COUNTED', width: 96, kind: 'number' },
      { key: 'variance', name: 'VARIANCE', width: 94, kind: 'computed' },
      { key: 'totalValue', name: 'TOTAL VALUE', width: 118, kind: 'computed' },
      { key: 'notes', name: 'NOTES', width: 150, kind: 'text' },
      { key: 'del', name: '', width: 36, kind: 'button' },
    )
    return list
  }, [tab])

  const dataCols = useMemo(() => cols.filter(c => c.key !== 'del'), [cols])

  const letterOf = useMemo(() => {
    const m: Partial<Record<ColKey, string>> = {}
    dataCols.forEach((c, i) => { m[c.key] = String.fromCharCode(65 + i) })
    return m
  }, [dataCols])

  // ---------------------------- picklists ----------------------------

  const categoryOptions = useMemo(() => {
    const byName = new Map<string, string>()
    for (const c of categories) byName.set(c.name, c.id)
    return { byName, names: [...byName.keys()].sort((a, b) => a.localeCompare(b)) }
  }, [categories])

  const supplierOptions = useMemo(() => {
    const byName = new Map<string, string>()
    for (const s of suppliers) byName.set(s.name, s.id)
    return { byName, names: [...byName.keys()].sort((a, b) => a.localeCompare(b)) }
  }, [suppliers])

  const uomOptions = useMemo(() => {
    const byName = new Map<string, string>()
    for (const u of uoms) byName.set(u.name, u.id)
    return { byName, names: [...byName.keys()].sort((a, b) => a.localeCompare(b)) }
  }, [uoms])

  const productOptions = useMemo(() => {
    const opts = new Map<string, { id: string; name: string; sku: string | null }>()
    for (const r of rows) if (r.productId) opts.set(r.productId, { id: r.productId, name: r.productName, sku: r.sku })
    return [...opts.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  const renderList = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return rows.map((row, i) => ({ row, i }))
    return rows
      .map((row, i) => ({ row, i }))
      .filter(({ row }) =>
        row.productName.toLowerCase().includes(ql) || (row.sku ?? '').toLowerCase().includes(ql),
      )
  }, [rows, q])

  // ---------------------------- data loading ----------------------------

  const loadLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/locations')
      if (!res.ok) throw new Error(`Locations request failed (${res.status})`)
      const json = await res.json()
      setLocations((json.data ?? []).filter((l: { is_active: boolean }) => l.is_active))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load inventory locations')
    }
  }, [])

  useEffect(() => { void loadLocations() }, [loadLocations])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const today = TODAY()
      const { start, end } = weekRange(year, week)
      const to = end < today ? end : today
      const type = typeForTab[tab]
      const main = mainLocId === 'main' ? 'main' : mainLocId
      const store = locations.find(l => l.id !== main)?.id ?? null

      const sheetParams = new URLSearchParams({ from: start, to, location_id: main })
      sheetParams.set('inventory_type', type)
      const storeParams = store ? new URLSearchParams({ from: start, to, location_id: store }) : null
      if (storeParams) storeParams.set('inventory_type', type)

      const [sheetRes, storeRes, prodRes, dailyRes, catRes, supRes, uomRes, sheetsRes] = await Promise.all([
        fetch(`/api/inventory/stock-sheet?${sheetParams.toString()}`),
        storeParams ? fetch(`/api/inventory/stock-sheet?${storeParams.toString()}`) : null,
        fetch('/api/inventory/products?page_size=500&include_balance=false'),
        fetch(`/api/inventory/daily-stock?location_id=${main}&date=${today}`),
        fetch('/api/inventory/categories'),
        fetch('/api/inventory/suppliers?page_size=100'),
        fetch('/api/inventory/uoms'),
        fetch(`/api/inventory/sheets?tab=${tab}&week=${week}&year=${year}&location_id=${main}`),
      ])

      const sheetJson = await sheetRes.json()
      if (sheetJson.error) throw new Error(sheetJson.error.message)
      const storeJson = storeRes ? await storeRes.json() : { data: { rows: [] } }
      const prodJson = await prodRes.json()
      const dailyJson = await dailyRes.json()
      const catJson = await catRes.json()
      const supJson = await supRes.json()
      const uomJson = await uomRes.json()
      const sheetsJson = await sheetsRes.json()
      if (!dailyRes.ok || dailyJson.error) {
        throw new Error(dailyJson.error?.message ?? `Daily stock request failed (${dailyRes.status})`)
      }
      if (sheetsJson.error) throw new Error(sheetsJson.error.message)

      setCategories(flattenCategories((catJson.data ?? []) as CategoryApiRow[]))
      setSuppliers(((supJson.data ?? []) as SupplierApiRow[]).map(s => ({ id: s.id, name: s.name })))
      setUoms(((uomJson.data ?? []) as UomApiRow[]).filter(u => u && typeof u.name === 'string'))
      setSheetId((sheetsJson.data?.id as string | null) ?? null)
      const sheetCells = (sheetsJson.data?.cells ?? []) as SheetCellRow[]

      const sheetRows = (sheetJson.data?.rows ?? []) as SheetApiRow[]
      const storeRows = (storeJson.data?.rows ?? []) as SheetApiRow[]
      const products = (prodJson.data ?? []).filter((p: ProductApiRow) => (p.inventory_type ?? 'GENERAL') === type) as ProductApiRow[]
      const daily = dailyJson.data ?? null

      const storeMap = new Map(storeRows.map(r => [r.productId, r.closing]))
      const countedMap = new Map<string, number>()
      if (daily?.sections) {
        for (const sec of daily.sections as Array<{ items: Array<{ productId: string; countedUnits: number | null }> }>) {
          for (const it of sec.items) {
            const n = Number(it.countedUnits)
            if (!Number.isNaN(n)) countedMap.set(it.productId, n)
          }
        }
      }
      setSessionId((daily?.sessionId as string | null) ?? null)

      const sheetByProduct = new Map(sheetRows.map(r => [r.productId, r]))
      const present = new Set([...sheetByProduct.keys(), ...products.map(p => p.id)])

      const merged: StockRow[] = []
      const ints = (v: unknown, d: number): number => (Number.isFinite(Number(v)) ? Number(v) : d)
      for (const id of present) {
        const s = sheetByProduct.get(id)
        const p = products.find(pp => pp.id === id)
        const name = s?.productName ?? p?.name ?? 'Unknown product'
        const orderQty =
          s && s.reorderThreshold != null && s.reorderQuantity != null && s.closing <= s.reorderThreshold
            ? Math.max(0, s.reorderQuantity - s.closing)
            : null
        merged.push({
          productId: id,
          productName: name,
          sku: s?.sku ?? p?.sku ?? null,
          unit: s?.unit ?? null,
          category: s?.category ?? null,
          supplier: s?.supplier ?? null,
          price: ints(s?.unitCost ?? p?.unit_cost ?? 0, 0),
          opening: ints(s?.opening ?? 0, 0),
          received: ints(s?.received ?? 0, 0),
          used: ints(s?.used ?? 0, 0),
          waste: ints(s?.waste ?? 0, 0),
          closing: ints(s?.closing ?? 0, 0),
          store: storeMap.get(id) ?? null,
          orderQty,
          counted: countedMap.get(id) ?? null,
          notes: null,
        })
      }
      merged.sort((a, b) => a.productName.localeCompare(b.productName))

      // Persisted draft rows (cells carrying a productName). Drafts always live
      // after the ledger rows, so row_idx === array index and identity is stable.
      const drafts = new Map<number, Map<string, string>>()
      for (const c of sheetCells) {
        if (c.col_key === 'productName') {
          let m = drafts.get(c.row_idx)
          if (!m) { m = new Map(); drafts.set(c.row_idx, m) }
          m.set(c.col_key, c.raw_value)
        }
      }
      for (const c of sheetCells) {
        if (c.col_key === 'productName') continue
        if (c.col_key === 'notes') {
          if (c.row_idx < merged.length) {
            merged[c.row_idx] = { ...merged[c.row_idx], notes: c.raw_value || null }
          } else {
            drafts.get(c.row_idx)?.set(c.col_key, c.raw_value)
          }
          continue
        }
        drafts.get(c.row_idx)?.set(c.col_key, c.raw_value)
      }

      const raws: Record<string, string> = {}
      merged.forEach((_, i) => { if (merged[i]?.notes != null) raws[`${i}:notes`] = merged[i].notes as string })

      const draftIndexes = [...drafts.keys()].sort((a, b) => a - b)
      for (const idx of draftIndexes) {
        const m = drafts.get(idx)!
        merged.push({
          productId: '', productName: m.get('productName') ?? '', sku: m.get('sku') || null,
          unit: m.get('unit') || null, category: m.get('category') || null, supplier: m.get('supplier') || null,
          price: ints(m.get('price'), 0), opening: 0, received: 0, used: 0, waste: 0, closing: 0,
          store: null, orderQty: null, counted: 0, notes: m.get('notes') || null,
        })
        const i = merged.length - 1
        raws[`${i}:productName`] = m.get('productName') ?? ''
        if (m.get('sku') != null) raws[`${i}:sku`] = m.get('sku') ?? ''
        if (m.get('category') != null) raws[`${i}:category`] = m.get('category') ?? ''
        if (m.get('unit') != null) raws[`${i}:unit`] = m.get('unit') ?? ''
        if (m.get('supplier') != null) raws[`${i}:supplier`] = m.get('supplier') ?? ''
        if (m.get('price') != null) raws[`${i}:price`] = m.get('price') ?? ''
        if (m.get('notes') != null) raws[`${i}:notes`] = m.get('notes') ?? ''
      }

      setRows(merged)
      setRaws(raws)
      setTotals(sheetJson.data?.totals ?? null)
      setSel(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the stock sheet')
    } finally {
      setLoading(false)
    }
  }, [tab, year, week, mainLocId, locations])

  useEffect(() => { void load() }, [load])

  // ---------------------------- spreadsheet engine (HyperFormula) ----------------------------

  const rawMatrix = useMemo<(string | number | null)[][]>(() => {
    const L = (k: ColKey) => letterOf[k] ?? '?'
    return rows.map((row, i) => {
      const r = i + 1
      const R: (string | number | null)[] = dataCols.map(c => {
        const k = c.key
        if (k === 'closing') return `=${L('opening')}${r}+${L('received')}${r}-${L('used')}${r}-${L('waste')}${r}`
        if (k === 'variance') return `=${L('counted')}${r}-${L('closing')}${r}`
        if (k === 'totalValue') return `=${L('counted')}${r}*${L('price')}${r}`
        const raw = raws[`${i}:${k}`]
        if (raw != null && raw !== '') {
          if (raw.startsWith('=')) return raw
          const n = Number(raw)
          return n === 0 && raw.trim() === '0' ? 0 : (Number.isFinite(n) ? n : raw)
        }
        const v = (row as unknown as Record<string, unknown>)[k]
        if (v == null) return null
        return typeof v === 'number' ? v : String(v)
      })
      return R
    })
  }, [rows, raws, dataCols, letterOf])

  const evaluated = useMemo(() => {
    const out: Record<string, string> = {}
    if (rawMatrix.length === 0) return out
    try {
      const hf = HyperFormula.buildFromArray(rawMatrix, { licenseKey: 'gpl-v3' })
      const values = hf.getSheetValues(0) as (string | number | null)[][]
      values.forEach((rowArr, i) => {
        rowArr.forEach((v, j) => {
          const key = dataCols[j]?.key
          if (v != null && key) out[`${i}:${key}`] = String(v)
        })
      })
    } catch {
      // malformed formulas degrade to empty rather than crashing the sheet
    }
    return out
  }, [rawMatrix, dataCols])

  // ---------------------------- cell persistence ----------------------------

  const flushCells = async () => {
    const pending = [...cellQueue.current.values()]
    cellQueue.current = new Map()
    if (pending.length === 0 || !sheetId) return
    const res = await fetch(`/api/inventory/sheets/${sheetId}/cells`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Cell save failed')
  }

  const scheduleCellSave = (row_idx: number, col_key: string, raw_value: string) => {
    cellQueue.current.set(`${row_idx}:${col_key}`, { row_idx, col_key, raw_value })
    if (cellTimer.current) clearTimeout(cellTimer.current)
    cellTimer.current = setTimeout(() => {
      cellTimer.current = null
      setSaveState('saving')
      flushCells()
        .then(() => { setSaveState('saved'); saveQueue.current = setTimeout(() => setSaveState('idle'), 2400) })
        .catch((e: unknown) => { setSaveState('idle'); setError(e instanceof Error ? e.message : 'Cell save failed') })
    }, 900)
  }

  const reindexCells = (from: number, shift: number) => {
    if (!sheetId) return
    void fetch(`/api/inventory/sheets/${sheetId}/cells`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'reindex', from, shift }),
    })
  }

  const deleteRowCells = (row: number) => {
    if (!sheetId) return
    void fetch(`/api/inventory/sheets/${sheetId}/cells?row=${row}`, { method: 'DELETE' })
  }

  // ---------------------------- server calls ----------------------------

  const saveCounted = async (productId: string, counted: number | null) => {
    if (!sessionId) throw new Error('Daily stock session is unavailable. Refresh the sheet and try again.')
    if (counted == null) return
    const res = await fetch(`/api/inventory/daily-stock/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, counted }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Save failed')
  }

  const removeCounted = async (productId: string) => {
    if (!sessionId) return
    const res = await fetch(`/api/inventory/daily-stock/${sessionId}/items/${productId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok && !json.error?.code?.startsWith('NOT_FOUND')) throw new Error(json.error?.message ?? 'Delete failed')
  }

  const patchProduct = async (productId: string, updates: Record<string, string | number | null>) => {
    const res = await fetch(`/api/inventory/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Update failed')
  }

  const ensureProduct = async (i: number): Promise<string> => {
    const row = rows[i]
    if (!row) throw new Error('Row not found')
    if (row.productId) return row.productId
    const name = String(row.productName ?? '').trim()
    if (!name) throw new Error('Type an item name in the STOCK ITEM cell first')
    const categoryId = row.category ? categoryOptions.byName.get(row.category) ?? null : null
    const supplierId = row.supplier ? supplierOptions.byName.get(row.supplier) ?? null : null
    const unitId = row.unit ? uomOptions.byName.get(row.unit) ?? null : null
    const body: Record<string, unknown> = {
      name,
      inventory_type: typeForTab[tab],
      sku: row.sku ? String(row.sku).trim() || null : null,
    }
    if (categoryId) body.category_id = categoryId
    if (supplierId) body.preferred_supplier_id = supplierId
    if (unitId) body.uoms = [{ uom_id: unitId, is_base: true, is_display: false, conversion_factor: 1 }]
    const res = await fetch('/api/inventory/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Could not create item')
    const product = (json.data ?? json) as { id: string }
    if (!product?.id) throw new Error('Item created but no id returned')
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, productId: product.id } : r))
    deleteRowCells(i)
    return product.id
  }

  const postReceived = async (row: StockRow, newValue: number, loc: string) => {
    const delta = newValue - (row.received || 0)
    if (delta < 0) throw new Error('To reduce RECEIVED, log it via WASTE or an adjustment — only increases are posted')
    if (delta === 0) return
    const res = await fetch('/api/inventory/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Existing spreadsheet cells are canonical base-quantity entries.
        // New Add Stock receipts use the guided product-linked UOM contract.
        'x-boma-stock-entry-mode': 'legacy-spreadsheet',
      },
      body: JSON.stringify({
        product_id: row.productId,
        location_id: loc,
        transaction_type: 'purchase',
        reason_type: 'DELIVERY',
        quantity: delta,
        unit_cost: row.price > 0 ? row.price : null,
        reason_notes: row.notes ? String(row.notes).trim() || null : null,
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Could not post received')
  }

  const postWaste = async (row: StockRow, newValue: number, loc: string) => {
    const delta = newValue - (row.waste || 0)
    if (delta < 0) throw new Error('To reduce WASTE, log a restock — only increases are posted')
    if (delta === 0) return
    const res = await fetch('/api/inventory/waste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: row.productId,
        location_id: loc,
        transaction_type: 'waste',
        reason_type: 'WASTE',
        quantity: delta,
        reason_notes: row.notes ? String(row.notes).trim() || 'Stock sheet entry' : 'Stock sheet entry',
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Could not post waste')
  }

  // ---------------------------- cell commit (the engine) ----------------------------

  const rawOf = (i: number, key: ColKey) => raws[`${i}:${key}`] ?? ''

  const valueOf = (i: number, key: ColKey): number => {
    const raw = rawOf(i, key)
    if (raw.startsWith('=')) {
      const ev = Number(evaluated[`${i}:${key}`])
      return Number.isFinite(ev) ? ev : Number.NaN
    }
    return Number(raw)
  }

  const commitCell = async (i: number, key: ColKey, rawValue: string) => {
    if (!rows[i]) return
    const row = rows[i]
    const value = rawValue.trim()
    setError('')

    if (key === 'received' || key === 'waste' || key === 'counted' || key === 'price') {
      if (value === '') {
        if (key === 'counted') {
          void removeCounted(row.productId).catch(() => undefined)
          setRows(prev => prev.map((r, idx) => idx === i ? { ...r, counted: null } : r))
        }
        deleteRaws(i, key)
        return
      }
      const numeric = (() => {
        const v = value.startsWith('=') ? Number(evaluated[`${i}:${key}`]) : Number(value)
        return v
      })()
      if (!Number.isFinite(numeric)) {
        flash(`"${value}" is not a number`)
        deleteRaws(i, key)
        return
      }
      if (key === 'received') {
        try {
          const productId = await ensureProduct(i)
          const fresh = rows[i]
          await postReceived({ ...rows[i], productId }, numeric, mainLocId)
          setRows(prev => prev.map((r, idx) => idx === i ? { ...r, received: numeric } : r))
          flash(`+ ${formatQty(numeric - (fresh?.received ?? 0))} received`)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not post received')
          deleteRaws(i, key)
        }
        return
      }
      if (key === 'waste') {
        try {
          const productId = await ensureProduct(i)
          const fresh = rows[i]
          await postWaste({ ...rows[i], productId }, numeric, mainLocId)
          setRows(prev => prev.map((r, idx) => idx === i ? { ...r, waste: numeric } : r))
          flash(`- ${formatQty(numeric - (fresh?.waste ?? 0))} waste logged`)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not post waste')
          deleteRaws(i, key)
        }
        return
      }
      if (key === 'counted') {
        const previousCounted = row.counted
        try {
          const productId = row.productId || (await ensureProduct(i))
          setRows(prev => prev.map((r, idx) => (r.productId === productId ? { ...r, counted: numeric } : r)))
          await saveCounted(productId, numeric)
          flash(`Counted ${formatQty(numeric)}`)
        } catch (e) {
          setRows(prev => prev.map((r, idx) => idx === i ? { ...r, counted: previousCounted } : r))
          setError(e instanceof Error ? e.message : 'Could not save count')
          deleteRaws(i, key)
        }
        return
      }
      if (key === 'price') {
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, price: numeric } : r))
        if (row.productId) {
          setSaveState('saving')
          patchProduct(row.productId, { unit_cost: numeric === 0 ? null : numeric })
            .then(() => { setSaveState('saved'); saveQueue.current = setTimeout(() => setSaveState('idle'), 2400) })
            .catch(() => { setSaveState('idle'); flash('Could not save price') })
        } else {
          scheduleCellSave(i, 'price', value)
        }
        return
      }
    }

    if (key === 'productName') {
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, productName: value } : r))
      if (!row.productId) {
        scheduleCellSave(i, 'productName', value)
        return
      }
      // Existing row: re-pick the product the row refers to (moves counted entry).
      const name = value.toLowerCase()
      const product = productOptions.find(o => o.name.toLowerCase() === name || ((o.sku ?? '').toLowerCase() === name))
      if (!product || product.id === row.productId) return
      try {
        const counted = row.counted
        await removeCounted(row.productId)
        if (counted != null) await saveCounted(product.id, counted)
        flash('Row moved to ' + product.name)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reassign row')
      }
      await load()
      return
    }

    if (key === 'sku') {
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, sku: value || null } : r))
      if (row.productId) {
        if (rawOf(i, 'sku') === value) return
        queueSave(() => patchProduct(row.productId, { sku: value || null }))
      } else {
        scheduleCellSave(i, 'sku', value)
      }
      return
    }

    if (key === 'category' || key === 'unit' || key === 'supplier') {
      const byName = key === 'category' ? categoryOptions.byName : key === 'unit' ? uomOptions.byName : supplierOptions.byName
      const id = value === '' ? null : (byName.get(value) ?? null)
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: value === '' ? null : value } : r))
      if (row.productId && id) {
        queueSave(() => patchProduct(row.productId, key === 'category' ? { category_id: id } : key === 'unit' ? { uom_id: id } : { preferred_supplier_id: id }))
      } else if (!row.productId) {
        scheduleCellSave(i, key, value)
      }
      return
    }

    if (key === 'notes') {
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, notes: value || null } : r))
      scheduleCellSave(i, 'notes', value)
      return
    }
  }

  const queueSave = (fn: () => Promise<void>) => {
    setSaveState('saving')
    if (saveQueue.current) clearTimeout(saveQueue.current)
    saveQueue.current = setTimeout(() => {
      saveQueue.current = null
      fn()
        .then(() => {
          setSaveState('saved')
          saveQueue.current = setTimeout(() => setSaveState('idle'), 2500)
        })
        .catch((e: unknown) => {
          setSaveState('idle')
          setError(e instanceof Error ? e.message : 'Save failed')
        })
    }, 700)
  }

  const deleteRaws = (i: number, key: ColKey) => {
    setRaws(prev => {
      const next = { ...prev }
      delete next[`${i}:${key}`]
      return next
    })
  }

  // ---------------------------- row operations ----------------------------

  const addNewRow = (focusNew = false) => {
    const i = rows.length
    setRows(prev => [...prev, BLANK_ROW])
    setRaws(prev => ({ ...prev, [`${i}:productName`]: '' }))
    flash('New row added — type an item name, then RECEIVED / WASTE / COUNTED')
    if (focusNew) {
      requestAnimationFrame(() => {
        inputRefs.current[`${i}:productName`]?.focus()
        inputRefs.current[`${i}:productName`]?.select()
      })
    }
  }

  const deleteRow = (i: number) => {
    const row = rows[i]
    if (!row) return
    const wasDraft = !row.productId
    if (wasDraft) {
      deleteRowCells(i)
    } else {
      void removeCounted(row.productId).catch(() => undefined)
    }
    reindexCells(i, -1)
    setRows(prev => prev.filter((_, idx) => idx !== i))
    setRaws(prev => {
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        const m = /^(\d+):(.*)$/.exec(k)
        if (!m) continue
        const idx = Number(m[1])
        if (idx === i) continue
        next[`${idx > i ? idx - 1 : idx}:${m[2]}`] = v
      }
      return next
    })
  }

  // ---------------------------- misc ----------------------------

  const doExport = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const head = ['#', ...dataCols.map(c => c.name)]
      const body = rows.map((row, i) =>
        dataCols.map(c => {
          const raw = rawOf(i, c.key)
          if (c.kind === 'computed') {
            const ev = evaluated[`${i}:${c.key}`]
            if (ev == null) return ''
            const n = Number(ev)
            return Number.isFinite(n) ? n : ev
          }
          if (raw !== '') {
            const n = Number(raw)
            return Number.isFinite(n) && raw.trim() !== '' ? n : raw
          }
          const v = (row as unknown as Record<string, unknown>)[c.key]
          return v == null ? '' : v
        }),
      )
      const ws = XLSX.utils.aoa_to_sheet([head, ...body.map((r, idx) => [idx + 1, ...r])])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, tab === 'bar' ? 'Bar Stock' : 'Kitchen Stock')
      XLSX.writeFile(wb, `boma-${tab}-stock-week-${week}-${year}.xlsx`)
      flash(`Exported ${rows.length} rows to .XLSX`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ---------------------------- xlsx import ----------------------------

  const fileRef = useRef<HTMLInputElement | null>(null)

  const importXlsx = async (file: File) => {
    setImporting(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer())
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false }) as string[][]
      if (!aoa.length) { flash('The file is empty'); return }

    // Locate the header row and map column names (case/space-insensitive).
    const norm = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    const keyOf: Record<string, ColKey> = {
      STOCKITEM: 'productName', ITEM: 'productName', PRODUCT: 'productName', PRODUCTNAME: 'productName',
      SKU: 'sku', CODE: 'sku', SKUCODE: 'sku',
      CATEGORY: 'category', UNIT: 'unit', UOM: 'unit', SUPPLIER: 'supplier',
      PRICE: 'price', UNITCOST: 'price', COST: 'price',
      RECEIVED: 'received', DELIVERED: 'received',
      COUNTED: 'counted', PHYSICAL: 'counted', STOCKCOUNT: 'counted',
      WASTE: 'waste', NOTES: 'notes', NOTE: 'notes',
    }
    let headerIdx = aoa.findIndex(row => row.some(c => /item|product/i.test(String(c ?? ''))))
    if (headerIdx < 0) { flash('No column headers found (look for a "STOCK ITEM" column)'); return }
    const header = aoa[headerIdx].map(h => keyOf[norm(String(h ?? ''))] ?? null)

    const num = (v: unknown): number | null => {
      if (v == null || String(v).trim() === '') return null
      const n = Number(String(v).replace(/[R,\s]/g, ''))
      return Number.isFinite(n) ? n : null
    }

    const nameOf = (rowArr: string[]) => {
      const ci = header.findIndex(h => h === 'productName')
      return ci < 0 ? '' : String(rowArr[ci] ?? '').trim()
    }

    let updated = 0
    let created = 0
    let errors = 0
    let nextIdx = rows.length

    for (const rowArr of aoa.slice(headerIdx + 1)) {
      const name = nameOf(rowArr)
      if (!name) continue
      const product = productOptions.find(o => o.name.toLowerCase() === name.toLowerCase() || ((o.sku ?? '').toLowerCase() === name.toLowerCase()))
      const targetIdx = product ? rows.findIndex(r => r.productId === product.id) : -1
      const isDraft = targetIdx < 0
      const i = isDraft ? nextIdx : targetIdx

      const col = (key: ColKey): string => {
        const ci = header.findIndex(h => h === key)
        return ci < 0 ? '' : String(rowArr[ci] ?? '')
      }

      if (isDraft) {
        nextIdx += 1
        created += 1
        const draft: StockRow = { ...BLANK_ROW, productName: name }
        const sku = col('sku'), cat = col('category'), unit = col('unit'), sup = col('supplier')
        if (sku.trim()) draft.sku = sku.trim()
        if (cat.trim()) draft.category = cat.trim()
        if (unit.trim()) draft.unit = unit.trim()
        if (sup.trim()) draft.supplier = sup.trim()
        const p = num(col('price'))
        if (p != null) draft.price = p
        const n = num(col('notes'))
        if (n != null) draft.notes = String(n)
        setRows(prev => [...prev, draft])
        setRaws(prev => ({ ...prev, [`${i}:productName`]: name }))
      }

      // Non-ledger cells: apply directly to the grid.
      const rawsNext: Record<string, string> = {}
      for (const key of ['sku', 'category', 'unit', 'supplier', 'price', 'notes'] as ColKey[]) {
        const v = col(key)
        if (v.trim() === '') continue
        rawsNext[`${i}:${key}`] = v
        if (isDraft) {
          setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: key === 'price' ? num(v) ?? 0 : v } : r))
        }
      }
      if (Object.keys(rawsNext).length) setRaws(prev => ({ ...prev, ...rawsNext }))

      // Ledger cells: commit through the same engine as typing (auto-creates
      // products for new items, posts REAL movements for existing ones).
      for (const key of ['received', 'waste', 'counted'] as ColKey[]) {
        const v = num(col(key))
        if (v == null) continue
        try {
          await commitCell(i, key, String(v))
          updated += 1
        } catch {
          errors += 1
        }
      }
    }
    flash(`Imported: ${created} new item(s), ${updated} movement(s) logged${errors ? `, ${errors} failed` : ''}`)
    if (errors === 0) await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const focusNextRow = (i: number, key: ColKey) => {
    const next = i + 1
    if (next >= rows.length) {
      addNewRow(true)
      return
    }
    inputRefs.current[`${next}:${key}`]?.focus()
    inputRefs.current[`${next}:${key}`]?.select()
  }

  const cellDisplay = (i: number, key: ColKey): string => {
    const raw = rawOf(i, key)
    if (raw !== '') {
      if (raw.startsWith('=')) return evaluated[`${i}:${key}`] ?? ''
      return raw
    }
    const row = rows[i]
    if (!row) return ''
    const v = (row as unknown as Record<string, unknown>)[key]
    if (key === 'price') return v == null ? '' : fmtNum(v as number, 0)
    if (key === 'counted') return v == null ? '' : fmtNum(v as number)
    if (key === 'sku' || key === 'productName' || key === 'category' || key === 'unit' || key === 'supplier' || key === 'notes') return String(v ?? '')
    return v == null ? '' : fmtNum(v as number)
  }

  // ---------------------------- render ----------------------------

  const weekOptions = useMemo(() => {
    const max = lastWeekOfYear(year)
    return Array.from({ length: max }, (_, i) => i + 1)
  }, [year])

  const rangeLabel = useMemo(() => {
    const { start, end } = weekRange(year, week)
    const to = end < TODAY() ? end : TODAY()
    return `${start} → ${to}`
  }, [year, week])

  const summaryCards = useMemo(() => {
    const isBar = tab === 'bar'
    const cards: Array<{ label: string; v: string; gold?: boolean }> = []
    if (totals) {
      cards.push(
        { label: 'Closing value', v: formatMoney(totals.value), gold: true },
        { label: 'Received', v: formatQty(totals.received) },
        { label: isBar ? 'Issued / used' : 'Issued', v: formatQty(totals.used) },
        { label: 'Waste', v: formatQty(totals.waste) },
      )
    }
    const countedRows = rows.filter(r => r.counted != null)
    cards.push({ label: 'Counted items', v: String(countedRows.length) })
    const variance = countedRows.reduce((a, r) => a + (r.counted ?? 0) - r.closing, 0)
    cards.push({ label: 'Net variance', v: formatQty(variance), gold: Math.abs(variance) > 0 })
    return cards
  }, [totals, rows, tab])

  const fxValue = sel ? (rawOf(sel.i, sel.key) || cellDisplay(sel.i, sel.key)) : ''

  const onInputKeyDown = (i: number, key: ColKey) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitCell(i, key, (e.target as HTMLInputElement).value)
      focusNextRow(i, key)
    }
  }

  const selectCellClass = (i: number, key: ColKey): string => {
    const row = rows[i]
    if (key === 'counted') return 'cell-counted'
    if (key === 'variance') {
      const v = Number(evaluated[`${i}:${key}`] ?? 0)
      return v > 0 ? 'cell-positive' : v < 0 ? 'cell-negative' : ''
    }
    if (key === 'received' || key === 'price') return 'cell-positive'
    if (key === 'waste') return 'cell-negative'
    if (key === 'totalValue' || key === 'closing') return 'cell-strong'
    if (key === 'used') return 'cell-issued'
    if (key === 'orderQty') return 'cell-warn'
    if (key === 'productName' && row && !row.productId) return 'cell-new'
    if (key === 'productName' && row && row.counted != null) return 'cell-item-counted'
    return ''
  }

  return (
    <div>
      <style>{`
        .excel { border-collapse: collapse; table-layout: fixed; width: 100%; font-size: 13px; }
        .excel th, .excel td { border: 1px solid #332B21; padding: 0; height: 32px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
        .excel thead th { background: #1F1910; color: #C8A04E; font-weight: 700; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; position: sticky; top: 0; z-index: 5; }
        .excel thead th.letters { background: #241D12; color: #8A7A5C; font-size: 10px; letter-spacing: 0.05em; text-transform: none; padding: 2px 8px; text-align: right; }
        .excel .gutter { background: #1B150E !important; color: #6E5F47; text-align: center; font-size: 11px; width: 40px; user-select: none; position: sticky; left: 0; z-index: 4; border-right: 1px solid #3A3226; font-weight: 700; }
        .excel thead th.gutter { z-index: 6; }
        .excel td.cell-computed { background: #14100B; color: #B8B0A0; padding: 0 8px; }
        .add-row-btn { width: 100%; border: none; background: transparent; color: #8A7A5C; font-size: 12px; font-weight: 700; padding: 10px 0; cursor: pointer; }
        .add-row-btn:hover { color: #C8A04E; background: #1B150E; }
        .excel td.cell-editable { background: transparent; }
        .excel input, .excel select {
          width: 100%; height: 100%; box-sizing: border-box; border: none; outline: none;
          background: transparent; color: #E8DFD0; font-size: 13px; padding: 0 8px;
          font-variant-numeric: tabular-nums; font-family: inherit;
        }
        .excel select { cursor: pointer; color: #D8CFC0; }
        .excel input:focus, .excel select:focus { background: #241C10; box-shadow: inset 0 0 0 1.5px #C8A04E; }
        .excel .sel-cell { background: #2A2113; }
        .excel td.cell-counted { background: rgba(200,160,78,0.10); font-weight: 800; color: #F0EBE3; }
        .excel td.cell-new { color: #C8A04E; font-style: italic; }
        .excel td.cell-item-counted { font-weight: 700; }
        .excel td.cell-positive { color: #57D9A3; }
        .excel td.cell-negative { color: #F87171; }
        .excel td.cell-issued { color: #5A9EE6; }
        .excel td.cell-strong { font-weight: 800; color: #F0EBE3; }
        .excel td.cell-warn { color: #D9A85E; }
        .excel .del-btn { background: transparent; border: none; color: #B08968; font-size: 14px; font-weight: 800; cursor: pointer; width: 100%; height: 100%; }
        .excel .del-btn:hover { color: #F87171; }
        .excel tbody tr:hover td { background: #181310; }
        .excel tbody tr:hover td.gutter { background: #1B150E !important; }
        .excel tbody tr:hover td.cell-counted, .excel tbody tr:hover td.cell-editable { background: #22190F; }
      `}</style>

      <PageTitle
        title="Stock Sheet"
        subtitle="Excel-style spreadsheet — click any cell and type. Formulas evaluate live (=SUM, =F5*N5), Enter moves down, Tab moves right. RECEIVED / WASTE / COUNTED post straight to the ledger."
        right={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="success"
              onClick={() => legacyAddStock ? addNewRow(true) : setAddStockOpen(true)}
            >+ ADD STOCK</Button>
            <Button
              variant="success"
              onClick={() => setMultiReceiptOpen(true)}
            >RECEIVE DELIVERY</Button>
            <Button variant="ghost" onClick={doExport} disabled={rows.length === 0}>Export CSV</Button>
            <Button variant="ghost" onClick={() => void load()} disabled={loading}>⟳ Refresh</Button>
          </div>
        }
      />

      {/* Toolbar */}
      <Card style={{ marginBottom: 14 }} pad={14}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, background: '#1C1710', border: '1px solid #332B21', borderRadius: 10, padding: 3 }}>
            {TAB_OPTIONS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                  border: 'none', background: tab === t.id ? '#C8A04E' : 'transparent',
                  color: tab === t.id ? '#171208' : '#B8B0A0',
                }}
              >{t.label}</button>
            ))}
          </div>

          <Select value={String(year)} onChange={v => { setYear(Number(v)); setWeek(1) }} style={{ maxWidth: 100 }}>
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select value={String(week)} onChange={v => setWeek(Number(v))} style={{ maxWidth: 240 }}>
            {weekOptions.map(w => (
              <option key={w} value={w}>Week {w}{w === currentWeekNumber() && year === new Date().getFullYear() ? ' · now' : ''}</option>
            ))}
          </Select>

          <span style={{ fontSize: 12.5, color: C.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{rangeLabel}</span>

          <div style={{ flex: 1 }} />

          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="🔍 Search items…"
            style={{
              width: 190, background: '#1C1710', border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '8px 12px', color: '#E8DFD0', fontSize: 12.5, outline: 'none',
            }}
          />

          {locations.length > 1 && (
            <Select value={mainLocId} onChange={setMainLocId} style={{ maxWidth: 140 }}>
              <option value="main">Default</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          )}

          {saveState !== 'idle' && (
            <span style={{ fontSize: 12, fontWeight: 700, color: saveState === 'saving' ? '#D9A85E' : '#57D9A3' }}>
              {saveState === 'saving' ? '● Saving…' : '✓ Saved'}
            </span>
          )}

          <Button variant="ghost" onClick={() => addNewRow(false)}>+ Add Row</Button>
          <Button variant="ghost" onClick={() => void doExport()} disabled={rows.length === 0 || exporting}>📤 {exporting ? 'Exporting…' : 'Export .XLSX'}</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={importing}>📥 {importing ? 'Importing…' : 'Import .XLSX'}</Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importXlsx(f) }}
          />
          <Button variant="ghost"><Link href="/admin/operations/imports/new" style={{ textDecoration: 'none', color: 'inherit' }}>⤓ Import wizard</Link></Button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted }}>
          Tips: formulas like <b>=F5*N5</b> or <b>=SUM(H5:H12)</b> work in any editable cell · <b>Enter</b> commits and moves down ·{' '}
          <b>Tab</b> moves right · gold italic names are new items — type a name, SKU, price, then RECEIVED / COUNTED to create it · <b>✕</b> deletes the row.
        </div>
      </Card>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {summaryCards.map(k => (
          <div key={k.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>{k.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: k.gold ? C.goldBright : C.text, fontVariantNumeric: 'tabular-nums' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {(saved || error) && (
        <div
          style={{
            marginBottom: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: error ? 'rgba(232,84,84,0.12)' : 'rgba(87,217,163,0.10)',
            border: `1px solid ${error ? 'rgba(232,84,84,0.45)' : 'rgba(87,217,163,0.35)'}`,
            color: error ? C.dangerText : '#57D9A3',
          }}
        >{error || saved}</div>
      )}

      {/* Formula bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          background: '#1C1710', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 12px',
          fontSize: 13, fontWeight: 800, fontStyle: 'italic', color: '#C8A04E',
        }}>fx</span>
        <div style={{
          flex: 1, background: '#14100B', border: `1px solid ${C.border}`, borderRadius: 8,
          display: 'flex', alignItems: 'center', overflow: 'hidden',
        }}>
          {sel && (
            <span style={{ padding: '0 10px', fontSize: 11, fontWeight: 700, color: '#8A7A5C', background: '#1B150E', alignSelf: 'stretch', display: 'flex', alignItems: 'center', borderRight: `1px solid ${C.border}` }}>
              {letterOf[sel.key] ?? sel.key.toUpperCase()}{sel.i + 1}
            </span>
          )}
          <input
            value={fxValue}
            onChange={e => {
              if (!sel) return
              setRaws(prev => ({ ...prev, [`${sel.i}:${sel.key}`]: e.target.value }))
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && sel) {
                commitCell(sel.i, sel.key, (e.target as HTMLInputElement).value)
                focusNextRow(sel.i, sel.key)
              }
            }}
            placeholder={sel ? 'Type a value or formula, e.g. =F5*N5…' : 'Click a cell to edit its value or formula'}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#E8DFD0',
              fontSize: 13, padding: '7px 10px', fontVariantNumeric: 'tabular-nums', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Grid */}
      <div
        ref={gridAnchor}
        className="excel-scroll"
        style={{
          border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'auto',
          maxHeight: 'calc(100vh - 260px)', minHeight: 420, background: '#14100B',
        }}
      >
        <table className="excel">
          <thead>
            <tr>
              <th className="gutter" style={{ left: 0 }}>#</th>
              {dataCols.map(c => (
                <th key={c.key} className="letters" style={{ width: c.width, textAlign: 'right' }}>{letterOf[c.key]}</th>
              ))}
              <th style={{ width: 36 }}></th>
            </tr>
            <tr>
              <th className="gutter" style={{ left: 0 }}></th>
              {dataCols.map(c => (
                <th key={c.key} style={{ width: c.width, textAlign: 'left', paddingLeft: 8 }}>{c.name}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {renderList.map(({ row, i }) => (
              <tr key={i}>
                <td className="gutter">{i + 1}</td>
                {dataCols.map(c => {
                  const key = c.key
                  if (c.kind === 'computed') {
                    const ev = evaluated[`${i}:${key}`] ?? ''
                    const vn = key === 'variance' ? Number(ev) : 0
                    const flag = key === 'variance' && Number.isFinite(vn) && vn < 0
                    return (
                      <td key={key} className={`cell-computed ${selectCellClass(i, key)}`} title={ev}>
                        <div style={{ padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fmtCell(ev)}{flag ? ' ⚠️' : ''}
                        </div>
                      </td>
                    )
                  }
                  if (c.kind === 'button') {
                    return (
                      <td key={key} style={{ textAlign: 'center', background: '#14100B' }}>
                        <button className="del-btn" onClick={() => deleteRow(i)} title="Delete row">✕</button>
                      </td>
                    )
                  }
                  if (c.kind === 'select') {
                    const options = key === 'category' ? categoryOptions.names : key === 'unit' ? uomOptions.names : supplierOptions.names
                    const value = rawOf(i, key) || String((row as unknown as Record<string, unknown>)[key] ?? '')
                    const isSel = sel?.i === i && sel?.key === key
                    return (
                      <td key={key} className={`cell-editable ${selectCellClass(i, key)} ${isSel ? 'sel-cell' : ''}`}>
                        <select
                          value={options.includes(value) ? value : ''}
                          onChange={e => {
                            setSel({ i, key })
                            commitCell(i, key, e.target.value)
                          }}
                          onFocus={() => setSel({ i, key })}
                          onBlur={() => setSel(prev => (prev?.i === i && prev?.key === key ? null : prev))}
                        >
                          <option value="">—</option>
                          {options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                    )
                  }
                  const isSel = sel?.i === i && sel?.key === key
                  return (
                    <td key={key} className={`cell-editable ${selectCellClass(i, key)} ${isSel ? 'sel-cell' : ''}`}>
                      <input
                        ref={el => { inputRefs.current[`${i}:${key}`] = el }}
                        list={key === 'productName' ? 'inv-stock-product-options' : undefined}
                        inputMode={c.kind === 'number' ? 'decimal' : 'text'}
                        value={isSel ? rawOf(i, key) : cellDisplay(i, key)}
                        onChange={e => {
                          setSel({ i, key })
                          setRaws(prev => ({ ...prev, [`${i}:${key}`]: e.target.value }))
                        }}
                        onFocus={() => setSel({ i, key })}
                        onBlur={e => {
                          commitCell(i, key, e.target.value)
                          setSel(prev => (prev?.i === i && prev?.key === key ? null : prev))
                        }}
                        onKeyDown={onInputKeyDown(i, key)}
                        placeholder={key === 'price' ? 'R' : undefined}
                      />
                    </td>
                  )
                })}
                <td style={{ background: '#14100B' }}></td>
              </tr>
            ))}
            {renderList.length === 0 && !loading && (
              <tr>
                <td className="gutter">1</td>
                <td colSpan={dataCols.length + 1} style={{ padding: 18, color: '#8A7A5C', fontSize: 12.5, background: '#14100B' }}>
                  {q.trim() ? `No items match “${q.trim()}”.` : (
                    <>No stock rows for this week yet. Use <b>+ ADD STOCK</b> to receive an existing item, or manage catalog data in <Link href="/admin/operations/products" style={{ color: C.gold }}>Item Master</Link>.</>
                  )}
                </td>
              </tr>
            )}
            {!loading && rows.length > 0 && legacyAddStock && (
              <tr>
                <td className="gutter">{rows.length + 1}</td>
                <td colSpan={dataCols.length + 1} style={{ background: '#14100B', padding: 0, borderTop: `1px dashed ${C.border}` }}>
                  <button className="add-row-btn" onClick={() => addNewRow(true)}>+ Click to Add Item</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <datalist id="inv-stock-product-options">
        {productOptions.map(o => (
          <option key={o.id} value={o.name}>{o.sku ? `${o.sku} · ` : ''}{o.name}</option>
        ))}
      </datalist>

      {loading && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Loading the ledger…</p>}

      <AddStockWorkspace
        open={addStockOpen}
        onClose={() => setAddStockOpen(false)}
        onReceived={(transaction) => {
          flash(`Stock added · movement ${transaction.id.slice(0, 8)}`)
          void load()
        }}
      />

      <MultiReceiptWorkspace
        open={multiReceiptOpen}
        onClose={() => setMultiReceiptOpen(false)}
        onPosted={(receipt) => {
          flash(`Receipt posted · ${receipt.posted_count} ${receipt.posted_count === 1 ? 'movement' : 'movements'} · ${String(receipt.receipt_id).slice(0, 8).toUpperCase()}`)
          void load()
        }}
      />
    </div>
  )
}
