'use client'

import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import Link from 'next/link'
import { AgGridReact } from 'ag-grid-react'
import type {
  ColDef, CellValueChangedEvent, GridApi, ICellEditorParams, ValueFormatterFunc, CellClassParams,
} from 'ag-grid-community'
import { C, PageTitle, Card, Button, Select, formatMoney, formatQty } from '../kit'
import { weekRange, lastWeekOfYear, currentWeekNumber } from '@/inventory/lib/weeks'

// ---------------------------------------------------------------------------
// Row model: every figure (except COUNTED) comes from the ledger.
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
  productKey: string
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

/** Flatten the hierarchical categories tree into a flat id/name list. */
function flattenCategories(tree: CategoryApiRow[], out: Array<{ id: string; name: string }> = []): Array<{ id: string; name: string }> {
  for (const node of tree) {
    out.push({ id: node.id, name: node.name })
    if (node.children?.length) flattenCategories(node.children, out)
  }
  return out
}

type TabId = 'bar' | 'kitchen'

const TAB_OPTIONS: Array<{ id: TabId; label: string }> = [
  { id: 'bar', label: 'Bar Stock' },
  { id: 'kitchen', label: 'Kitchen Stock' },
]

const TODAY = () => new Date().toISOString().slice(0, 10)

const fmtNum = (v: number | null | undefined, digits = 2): string =>
  v == null || Number.isNaN(v) ? '' : Number(v).toLocaleString('en-ZA', { maximumFractionDigits: digits })

const numFmt: ValueFormatterFunc<StockRow, number> = p => fmtNum(p.value)

// ---------------------------------------------------------------------------
// Excel-like cell editor for the STOCK ITEM column (searchable product picker)
// ---------------------------------------------------------------------------

interface ProductOption { id: string; name: string; sku: string | null; unit: string | null }

const ProductCellEditor = forwardRef<
  { getValue: () => string; isPopup: () => boolean },
  ICellEditorParams<StockRow>
>(({ value }, ref) => {
  const [val, setVal] = useState<string>(String(value ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  useImperativeHandle(ref, () => ({
    getValue: () => val,
    isPopup: () => false,
  }))

  return (
    <input
      ref={inputRef}
      list="inv-stock-product-options"
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === 'Tab') e.stopPropagation()
      }}
      style={{
        width: '100%', height: '100%', border: 'none', outline: 'none', background: 'transparent',
        color: '#F0EBE3', fontSize: 13, padding: '0 6px', fontVariantNumeric: 'tabular-nums',
      }}
    />
  )
})

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StockSheetPage() {
  const [tab, setTab] = useState<TabId>('bar')
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [week, setWeek] = useState(() => currentWeekNumber())
  const [mainLocId, setMainLocId] = useState('main')
  const [locations, setLocations] = useState<Array<{ id: string; name: string; is_active: boolean }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [rows, setRows] = useState<StockRow[]>([])
  const [totals, setTotals] = useState<{ opening: number; received: number; used: number; waste: number; closing: number; value: number } | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [uoms, setUoms] = useState<Array<{ id: string; name: string }>>([])
  const gridApi = useRef<GridApi<StockRow> | null>(null)

  const typeForTab: Record<TabId, string> = { bar: 'BEVERAGE', kitchen: 'FOOD' }

  const flash = (msg: string) => { setSaved(msg); window.setTimeout(() => setSaved(''), 2600) }

  // ---------------------------- data loading ----------------------------

  const loadLocations = useCallback(async () => {
    const res = await fetch('/api/inventory/locations')
    const json = await res.json()
    setLocations((json.data ?? []).filter((l: { is_active: boolean }) => l.is_active))
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

      const [sheetRes, storeRes, prodRes, dailyRes, catRes, supRes, uomRes] = await Promise.all([
        fetch(`/api/inventory/stock-sheet?${sheetParams.toString()}`),
        storeParams ? fetch(`/api/inventory/stock-sheet?${storeParams.toString()}`) : null,
        fetch('/api/inventory/products?page_size=500'),
        fetch(`/api/inventory/daily-stock?location_id=${main}&date=${today}`),
        fetch('/api/inventory/categories'),
        fetch('/api/inventory/suppliers?page_size=100'),
        fetch('/api/inventory/uoms'),
      ])

      const sheetJson = await sheetRes.json()
      if (sheetJson.error) throw new Error(sheetJson.error.message)
      const storeJson = storeRes ? await storeRes.json() : { data: { rows: [] } }
      const prodJson = await prodRes.json()
      const dailyJson = await dailyRes.json()
      const catJson = await catRes.json()
      const supJson = await supRes.json()
      const uomJson = await uomRes.json()
      setUoms(((uomJson.data ?? []) as Array<{ id: string; name: string }>).filter(u => u && typeof u.name === 'string'))

      setCategories(flattenCategories((catJson.data ?? []) as CategoryApiRow[]))
      setSuppliers(((supJson.data ?? []) as SupplierApiRow[]).map(s => ({ id: s.id, name: s.name })))

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
          price: (s?.unitCost ?? p?.unit_cost ?? 0),
          opening: s?.opening ?? 0,
          received: s?.received ?? 0,
          used: s?.used ?? 0,
          waste: s?.waste ?? 0,
          closing: s?.closing ?? 0,
          store: storeMap.get(id) ?? null,
          orderQty,
          counted: countedMap.get(id) ?? null,
          notes: null,
          productKey: id,
        })
      }

      merged.sort((a, b) => a.productName.localeCompare(b.productName))
      setRows(merged)
      setTotals(sheetJson.data?.totals ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the stock sheet')
    } finally {
      setLoading(false)
    }
  }, [tab, year, week, mainLocId, locations])

  useEffect(() => { void load() }, [load])

  // Master product options for the picker (names + SKUs)
  const productOptions: ProductOption[] = useMemo(() => {
    const opts = new Map<string, ProductOption>()
    for (const r of rows) opts.set(r.productId, { id: r.productId, name: r.productName, sku: r.sku, unit: r.unit })
    return [...opts.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  // Category / supplier picklists (name → id) for the in-grid dropdown editors
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

  // UOM picklist (name → id) for the in-grid UNIT dropdown
  const uomOptions = useMemo(() => {
    const byName = new Map<string, string>()
    for (const u of uoms) byName.set(u.name, u.id)
    return { byName, names: [...byName.keys()].sort((a, b) => a.localeCompare(b)) }
  }, [uoms])

  // Creates a product on the fly when a NEW row (no product picked) gets its
  // first stock movement or count — SKU / category / unit / supplier come
  // straight from the grid row, so adding stock never leaves the sheet.
  const ensureProduct = async (row: StockRow): Promise<string> => {
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
    if (unitId) body.uoms = [{ uom_id: unitId, is_base: true, is_display: true, conversion_factor: 1 }]
    const res = await fetch('/api/inventory/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Could not create item')
    const product = (json.data ?? json) as { id: string }
    if (!product?.id) throw new Error('Item created but no id returned')
    setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, productId: product.id, productKey: `p-${product.id}` } : r))
    return product.id
  }

  const postReceived = async (row: StockRow, newValue: number) => {
    const productId = await ensureProduct(row)
    const delta = newValue - (row.received || 0)
    if (delta < 0) throw new Error('To reduce RECEIVED, log it via WASTE or an adjustment — only increases are posted')
    const res = await fetch('/api/inventory/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        location_id: mainLocId,
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

  const postWaste = async (row: StockRow, newValue: number) => {
    const productId = await ensureProduct(row)
    const delta = newValue - (row.waste || 0)
    if (delta < 0) throw new Error('To reduce WASTE, log a restock — only increases are posted')
    const res = await fetch('/api/inventory/waste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        location_id: mainLocId,
        transaction_type: 'WASTE',
        reason_type: 'WASTE',
        quantity: delta,
        reason_notes: row.notes ? String(row.notes).trim() || 'Stock sheet entry' : 'Stock sheet entry',
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Could not post waste')
  }

  // ---------------------------- cell editing ----------------------------

  const saveCounted = async (productId: string, counted: number | null) => {
    if (!sessionId) return
    if (counted == null) return
    const res = await fetch(`/api/inventory/daily-stock/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, counted_units: counted }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Save failed')
  }

  const removeCounted = async (productId: string) => {
    if (!sessionId) return
    const res = await fetch(`/api/inventory/daily-stock/${sessionId}/items/${productId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Delete failed')
  }

  // ---------------------------- debounced auto-save ----------------------------

  const saveQueue = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const patchProduct = async (productId: string, updates: Record<string, string | number | null>) => {
    const res = await fetch(`/api/inventory/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Update failed')
  }

  const onCellValueChanged = async (params: CellValueChangedEvent<StockRow>) => {
    const key = params.colDef.field
    if (!key) return
    const row = params.data
    const isDraft = row.productId === ''

    if (key === 'counted') {
      const raw = params.newValue as number | null | undefined
      const counted = raw == null || Number.isNaN(Number(raw)) ? null : Number(raw)
      let productId = row.productId
      if (!productId) {
        try {
          productId = await ensureProduct(row)
        } catch (e) {
          flash(e instanceof Error ? e.message : 'Pick a product first')
          setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, counted: params.oldValue as number | null } : r))
          return
        }
      }
      // Optimistic local update first, then a debounced ledger save.
      setRows(prev => prev.map(r => (r.productId === productId ? { ...r, counted } : r)))
      gridApi.current?.refreshCells({ rowNodes: undefined })
      if (counted == null) {
        queueSave(() => removeCounted(productId))
      } else {
        queueSave(() => saveCounted(productId, counted))
      }
      return
    }

    if (key === 'category' || key === 'supplier' || key === 'unit') {
      const isCat = key === 'category'
      const isSup = key === 'supplier'
      const byName = isCat ? categoryOptions.byName : isSup ? supplierOptions.byName : uomOptions.byName
      const value = String(params.newValue ?? '').trim()
      const id = value === '' ? null : (byName.get(value) ?? null)
      if (value !== '' && !id) {
        // Not a valid picklist entry — revert to the previous value.
        setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, [key]: params.oldValue as string | null } : r))
        flash(`Pick a ${isCat ? 'category' : isSup ? 'supplier' : 'unit'} from the dropdown list`)
        return
      }
      setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, [key]: value === '' ? null : value } : r))
      if (!isDraft && id) {
        queueSave(() => patchProduct(row.productId, isCat ? { category_id: id } : isSup ? { preferred_supplier_id: id } : { uom_id: id }))
      }
      return
    }

    if (key === 'productName') {
      // NEW row: keep whatever was typed — the item is created on its first
      // movement or count (see ensureProduct).
      if (isDraft) {
        setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, productName: String(params.newValue ?? '') } : r))
        return
      }
      // Existing row: re-pick the product (renames the counted entry).
      const name = String(params.newValue ?? '').trim().toLowerCase()
      const product = productOptions.find(o => o.name.toLowerCase() === name || ((o.sku ?? '').toLowerCase() === name))
      if (!product) {
        setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, productName: params.oldValue as string } : r))
        flash('Product not found — pick from the list (or use + ADD STOCK for a new item)')
        return
      }
      const oldId = row.productId
      if (oldId === product.id) return
      try {
        const counted = row.counted
        await removeCounted(oldId)
        if (counted != null) await saveCounted(product.id, counted)
        flash('Row moved to ' + product.name)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reassign row')
      }
      await load()
      return
    }

    if (key === 'sku') {
      const sku = params.newValue == null ? null : String(params.newValue).trim() || null
      setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, sku } : r))
      if (!isDraft) {
        try {
          await patchProduct(row.productId, { sku })
        } catch (e) {
          setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, sku: params.oldValue as string | null } : r))
          flash(e instanceof Error ? e.message : 'Could not update SKU')
        }
      }
      return
    }

    if (key === 'price') {
      const raw = params.newValue as number | null | undefined
      const price = raw == null || Number.isNaN(Number(raw)) ? 0 : Number(raw)
      setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, price } : r))
      if (!isDraft && price >= 0) {
        queueSave(() => patchProduct(row.productId, { unit_cost: price === 0 ? null : price }))
      }
      return
    }

    if (key === 'received') {
      const raw = params.newValue as number | null | undefined
      const value = raw == null || Number.isNaN(Number(raw)) ? 0 : Number(raw)
      if (value === (row.received || 0)) return
      try {
        await postReceived(row, value)
        setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, received: value } : r))
        flash(`+ ${formatQty(value - (row.received || 0))} received`)
      } catch (e) {
        setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, received: params.oldValue as number } : r))
        flash(e instanceof Error ? e.message : 'Could not post received')
      }
      return
    }

    if (key === 'waste') {
      const raw = params.newValue as number | null | undefined
      const value = raw == null || Number.isNaN(Number(raw)) ? 0 : Number(raw)
      if (value === (row.waste || 0)) return
      try {
        await postWaste(row, value)
        setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, waste: value } : r))
        flash(`- ${formatQty(value - (row.waste || 0))} waste logged`)
      } catch (e) {
        setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, waste: params.oldValue as number } : r))
        flash(e instanceof Error ? e.message : 'Could not post waste')
      }
      return
    }

    if (key === 'notes') {
      const value = params.newValue == null ? null : String(params.newValue)
      setRows(prev => prev.map(r => r.productKey === row.productKey ? { ...r, notes: value } : r))
    }
  }

  const addNewRow = (atTop = false) => {
    const key = `new-${Date.now()}`
    const blank: StockRow = {
      productId: '', productName: '', sku: null, unit: null, category: null, supplier: null,
      price: 0, opening: 0, received: 0, used: 0, waste: 0, closing: 0,
      store: null, orderQty: null, counted: 0, notes: null, productKey: key,
    }
    setRows(prev => (atTop ? [blank, ...prev] : [...prev, blank]))
    flash(atTop
      ? 'New row added on top — type the item name, then COUNTED / RECEIVED / WASTE'
      : 'Type the item name in the new row and press Enter')
  }

  const deleteRow = async (productId: string, productKey: string) => {
    try {
      if (productId && sessionId) await removeCounted(productId)
      setRows(prev => prev.filter(r => r.productKey !== productKey))
      flash('Row removed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete row')
    }
  }

  // ---------------------------- columns ----------------------------

  const actionRenderer = (params: { data: StockRow }) => (
    <button
      onClick={() => void deleteRow(params.data.productId, params.data.productKey)}
      title="Remove counted entry / delete row"
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer', color: '#B08968',
        fontSize: 14, fontWeight: 800, padding: '2px 6px', lineHeight: 1,
      }}
    >✕</button>
  )

  const columns = useMemo<ColDef<StockRow>[]>(() => {
    const isBar = tab === 'bar'
    const base: ColDef<StockRow>[] = [
      {
        field: 'sku', headerName: 'SKU / CODE', width: 110, pinned: 'left', editable: true,
        valueFormatter: p => String(p.value ?? ''),
      },
      {
        field: 'productName', headerName: 'STOCK ITEM', minWidth: 210, pinned: 'left', editable: true, cellEditor: ProductCellEditor,
        cellClass: (p: CellClassParams) => (p.data?.productId === '' ? 'cell-new' : p.data?.counted != null ? 'cell-item-counted' : ''),
        valueFormatter: p => String(p.value ?? ''),
      },
      {
        field: 'category', headerName: 'CATEGORY', width: 140, editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: categoryOptions.names },
        valueFormatter: p => String(p.value ?? '—'),
      },
      { field: 'unit', headerName: isBar ? 'UNIT OF MEASURE' : 'UNIT', width: 120, editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: uomOptions.names }, valueFormatter: p => String(p.value ?? '—') },
    ]
    if (!isBar) {
      base.push({
        field: 'supplier', headerName: 'SUPPLIER', minWidth: 150, editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: supplierOptions.names },
        valueFormatter: p => String(p.value ?? '—'),
      })
    }
    base.push(
      { field: 'price', headerName: 'PRICE', width: 94, editable: true, cellEditor: 'agNumberCellEditor', cellEditorParams: { min: 0 }, type: 'rightAligned', valueFormatter: p => fmtNum((p.value as number) ?? 0, 0), cellClass: 'cell-warn' },
      { field: 'opening', headerName: 'OPENING', width: 92, editable: false, type: 'rightAligned', valueFormatter: numFmt },
      { field: 'received', headerName: 'RECEIVED', width: 96, editable: true, cellEditor: 'agNumberCellEditor', cellEditorParams: { min: 0 }, type: 'rightAligned', valueFormatter: numFmt, cellClass: 'cell-positive' },
    )
    if (isBar) {
      base.push({ field: 'store', headerName: 'STORE ROOM', width: 96, editable: false, type: 'rightAligned', valueFormatter: p => p.value == null ? '—' : fmtNum(p.value as number) })
    }
    base.push(
      { field: 'used', headerName: 'ISSUED', width: 88, editable: false, type: 'rightAligned', valueFormatter: numFmt, cellClass: 'cell-issued' },
      { field: 'waste', headerName: 'WASTE', width: 88, editable: true, cellEditor: 'agNumberCellEditor', cellEditorParams: { min: 0 }, type: 'rightAligned', valueFormatter: numFmt, cellClass: 'cell-negative' },
      { field: 'orderQty', headerName: 'ORDER QTY', width: 96, editable: false, type: 'rightAligned', valueFormatter: p => p.value == null ? '' : fmtNum(p.value as number), cellClass: 'cell-warn' },
      { field: 'closing', headerName: 'CLOSING', width: 96, editable: false, type: 'rightAligned', valueFormatter: numFmt, cellClass: 'cell-strong' },
      {
        field: 'counted', headerName: 'COUNTED', width: 100, editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0 },
        valueFormatter: p => (p.value == null ? '' : fmtNum(p.value as number)),
        cellClass: 'cell-counted',
      },
      {
        headerName: 'VARIANCE', width: 100, type: 'rightAligned', editable: false,
        valueGetter: p => ((p.data?.counted ?? 0)) - (p.data?.closing ?? 0),
        valueFormatter: p => fmtNum(p.value as number),
        cellClass: (p: CellClassParams) => (Number(p.value) > 0 ? 'cell-positive' : Number(p.value) < 0 ? 'cell-negative' : ''),
      },
      {
        headerName: 'TOTAL VALUE (R)', width: 128, type: 'rightAligned', editable: false,
        valueGetter: p => ((p.data?.counted ?? p.data?.closing ?? 0)) * (p.data?.price ?? 0),
        valueFormatter: numFmt,
        cellClass: 'cell-strong',
      },
      { field: 'notes', headerName: 'NOTES', width: 150, editable: true, valueFormatter: p => String(p.value ?? '') },
      {
        headerName: '', width: 44, pinned: 'right', sortable: false, filter: false, resizable: false,
        cellRenderer: actionRenderer,
      },
    )
    return base
  }, [tab, categoryOptions, supplierOptions, uomOptions])

  // ---------------------------- export ----------------------------

  const doExport = () => {
    const api = gridApi.current
    if (!api) return
    const csv = api.getDataAsCsv()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `boma-${tab}-stock-week-${week}-${year}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
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

  return (
    <div>
      <style>{`
        .ag-theme-quartz-dark {
          --ag-background-color: #1C1710 !important;
          --ag-foreground-color: #E8DFD0 !important;
          --ag-border-color: #332B21 !important;
          --ag-header-background-color: #211B12 !important;
          --ag-header-foreground-color: #C8A04E !important;
          --ag-odd-row-background-color: #171310 !important;
          --ag-row-hover-color: #2A2318 !important;
          --ag-selected-row-background-color: rgba(200,160,78,0.18) !important;
          --ag-input-focus-border-color: #C8A04E !important;
          --ag-active-color: #C8A04E !important;
          --ag-font-size: 13px;
          --ag-row-height: 34px;
          --ag-header-height: 38px;
          --ag-cell-horizontal-padding: 8px;
        }
        .ag-theme-quartz-dark .ag-root-wrapper,
        .ag-theme-quartz-dark .ag-row,
        .ag-theme-quartz-dark .ag-header {
          background-color: #1C1710 !important;
        }
        .ag-theme-quartz-dark .ag-header-cell { background-color: #211B12 !important; }
        .ag-theme-quartz-dark .ag-pinned-left-cols-container,
        .ag-theme-quartz-dark .ag-pinned-right-cols-container { background-color: #191511 !important; }
        .ag-theme-quartz-dark .ag-cell { color: #E8DFD0; }
        .ag-theme-quartz-dark .ag-ltr .ag-cell-focus:not(.ag-cell-range-selected):focus-within,
        .ag-theme-quartz-dark .ag-cell-inline-editing { background: #221B11 !important; }
        .cell-counted { font-weight: 800; color: #F0EBE3; background: rgba(200,160,78,0.10); }
        .cell-new { color: #C8A04E; font-style: italic; }
        .cell-item-counted { font-weight: 700; }
        .cell-positive { color: #57D9A3; }
        .cell-negative { color: #F87171; }
        .cell-issued { color: #5A9EE6; }
        .cell-strong { font-weight: 800; color: #F0EBE3; }
        .cell-warn { color: #D9A85E; }
      `}</style>

      <PageTitle
        title="Stock Sheet"
        subtitle="Excel-style live sheet — single-click any cell to edit. RECEIVED and WASTE post straight to the ledger; COUNTED saves your daily count."
        right={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="success" onClick={() => addNewRow(true)}>+ ADD STOCK</Button>
            <Button variant="ghost" onClick={doExport} disabled={rows.length === 0}>Export CSV</Button>
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

          <Button variant="ghost" onClick={() => void load()} disabled={loading}>⟳ Refresh</Button>
          <Button variant="ghost" onClick={() => addNewRow(false)}>+ Add Row</Button>
          <Button variant="ghost"><Link href="/admin/operations/imports/new" style={{ textDecoration: 'none', color: 'inherit' }}>⤓ Import wizard</Link></Button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted }}>
          Tips: <b>single-click</b> any cell to edit inline · <b>Enter</b> commits and moves down · <b>Tab</b> moves right — like Excel ·{' '}
          <b>RECEIVED</b>/<b>WASTE</b> post straight to the ledger · Gold italic names are new items — type a name, SKU, price, then COUNTED / RECEIVED to create it.
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

      <div className="ag-theme-quartz-dark" style={{ height: 650, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <AgGridReact<StockRow>
          rowData={rows}
          columnDefs={columns}
          getRowId={p => p.data.productKey}
          enterNavigatesVertically
          enterNavigatesVerticallyAfterEdit
          singleClickEdit
          enableRangeSelection
          copyHeadersToClipboard
          stopEditingWhenCellsLoseFocus
          suppressRowClickSelection
          rowSelection="multiple"
          context={{ products: productOptions }}
          onCellValueChanged={onCellValueChanged}
          onGridReady={(e: { api: GridApi<StockRow> }) => { gridApi.current = e.api }}
        />
      </div>

      <datalist id="inv-stock-product-options">
        {productOptions.map(o => (
          <option key={o.id} value={o.name}>{o.sku ? `${o.sku} · ` : ''}{o.name}{o.unit ? ` · ${o.unit}` : ''}</option>
        ))}
      </datalist>

      {loading && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Loading the ledger…</p>}
    </div>
  )
}