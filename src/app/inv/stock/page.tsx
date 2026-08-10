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
  productKey: string
}

interface SheetApiRow {
  productId: string
  productName: string
  sku: string | null
  unit: string | null
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
  const [rows, setRows] = useState<StockRow[]>([])
  const [totals, setTotals] = useState<{ opening: number; received: number; used: number; waste: number; closing: number; value: number } | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addTab, setAddTab] = useState<'manual' | 'import'>('manual')
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

      const [sheetRes, storeRes, prodRes, dailyRes] = await Promise.all([
        fetch(`/api/inventory/stock-sheet?${sheetParams.toString()}`),
        storeParams ? fetch(`/api/inventory/stock-sheet?${storeParams.toString()}`) : null,
        fetch('/api/inventory/products?page_size=500'),
        fetch(`/api/inventory/daily-stock?location_id=${main}&date=${today}`),
      ])

      const sheetJson = await sheetRes.json()
      if (sheetJson.error) throw new Error(sheetJson.error.message)
      const storeJson = storeRes ? await storeRes.json() : { data: { rows: [] } }
      const prodJson = await prodRes.json()
      const dailyJson = await dailyRes.json()

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

  const onCellValueChanged = async (params: CellValueChangedEvent<StockRow>) => {
    const key = params.colDef.field
    if (key === 'counted') {
      const raw = params.newValue as number | null | undefined
      const counted = raw == null || Number.isNaN(Number(raw)) ? null : Number(raw)
      try {
        if (counted == null) {
          // Clear the counted entry for this product
          await removeCounted(params.data.productId)
          setRows(prev => prev.map(r => (r.productId === params.data.productId ? { ...r, counted: null } : r)))
          flash('Counted cleared')
        } else {
          await saveCounted(params.data.productId, counted)
          setRows(prev => prev.map(r => (r.productId === params.data.productId ? { ...r, counted } : r)))
          flash('Saved — ledger updated')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save cell')
        setRows(prev => prev.map(r => r.productKey === params.data.productKey ? { ...r, counted: params.oldValue as number | null } : r))
      }
      gridApi.current?.refreshCells({ rowNodes: undefined })
      return
    }

    if (key === 'productName') {
      // Re-pick the product for this row (renames the counted entry)
      const name = String(params.newValue ?? '').trim().toLowerCase()
      const product = productOptions.find(o => o.name.toLowerCase() === name || ((o.sku ?? '').toLowerCase() === name))
      if (!product) {
        setRows(prev => prev.map(r => r.productKey === params.data.productKey ? { ...r, productName: params.oldValue as string } : r))
        flash('Product not found — pick from the list')
        return
      }
      const oldId = params.data.productId
      if (oldId === product.id) return
      try {
        const counted = params.data.counted
        await removeCounted(oldId)
        if (counted != null) await saveCounted(product.id, counted)
        flash('Row moved to ' + product.name)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reassign row')
      }
      await load()
    }
  }

  const addNewRow = () => {
    const key = `new-${Date.now()}`
    const blank: StockRow = {
      productId: '', productName: '', sku: null, unit: null, supplier: null,
      price: 0, opening: 0, received: 0, used: 0, waste: 0, closing: 0,
      store: null, orderQty: null, counted: 0, productKey: key,
    }
    setRows(prev => [...prev, blank])
    flash('Type the item name in the new row and press Enter')
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
        field: 'productName', headerName: 'STOCK ITEM', minWidth: 210, pinned: 'left', editable: true, cellEditor: ProductCellEditor,
        cellClass: (p: CellClassParams) => (p.data?.productId === '' ? 'cell-new' : p.data?.counted != null ? 'cell-item-counted' : ''),
        valueFormatter: p => String(p.value ?? ''),
      },
      { field: 'unit', headerName: isBar ? 'UNIT OF MEASURE' : 'UNIT', width: 120, editable: false, valueFormatter: p => String(p.value ?? '—') },
    ]
    if (!isBar) {
      base.push({ field: 'supplier', headerName: 'SUPPLIER', minWidth: 150, valueFormatter: p => String(p.value ?? '—') })
    }
    base.push(
      { field: 'price', headerName: 'PRICE', width: 90, editable: false, type: 'rightAligned', valueFormatter: p => fmtNum(p.value as number, 0) },
      { field: 'opening', headerName: 'OPENING', width: 92, editable: false, type: 'rightAligned', valueFormatter: numFmt },
      { field: 'received', headerName: 'RECEIVED', width: 96, editable: false, type: 'rightAligned', valueFormatter: numFmt, cellClass: 'cell-positive' },
    )
    if (isBar) {
      base.push({ field: 'store', headerName: 'STORE ROOM', width: 96, editable: false, type: 'rightAligned', valueFormatter: p => p.value == null ? '—' : fmtNum(p.value as number) })
    }
    base.push(
      { field: 'used', headerName: 'ISSUED', width: 88, editable: false, type: 'rightAligned', valueFormatter: numFmt, cellClass: 'cell-issued' },
      { field: 'waste', headerName: 'WASTE', width: 88, editable: false, type: 'rightAligned', valueFormatter: numFmt, cellClass: 'cell-negative' },
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
        headerName: '', width: 44, pinned: 'right', sortable: false, filter: false, resizable: false,
        cellRenderer: actionRenderer,
      },
    )
    return base
  }, [tab])

  // ---------------------------- add stock (manual) ----------------------------

  const [addProduct, setAddProduct] = useState('')
  const [addQty, setAddQty] = useState('')
  const [addCost, setAddCost] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const submitAddStock = async () => {
    const product = productOptions.find(o => o.name.toLowerCase() === addProduct.trim().toLowerCase())
    if (!product) { flash('Pick a product from the list'); return }
    const qty = Number(addQty)
    const cost = addCost.trim() === '' ? null : Number(addCost)
    if (!Number.isFinite(qty) || qty <= 0) { flash('Enter a quantity'); return }
    setAddBusy(true)
    try {
      const res = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          location_id: mainLocId,
          transaction_type: 'purchase',
          reason_type: 'DELIVERY',
          quantity: qty,
          unit_cost: cost,
          reason_notes: addNotes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Add failed')
      flash(`+ ${formatQty(qty)} ${product.name} added`)
      setAddOpen(false)
      setAddProduct(''); setAddQty(''); setAddCost(''); setAddNotes('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add stock')
    } finally {
      setAddBusy(false)
    }
  }

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
          --ag-background-color: #1C1710;
          --ag-foreground-color: #E8DFD0;
          --ag-border-color: #332B21;
          --ag-header-background-color: #211B12;
          --ag-header-foreground-color: #C8A04E;
          --ag-odd-row-background-color: #171310;
          --ag-row-hover-color: #2A2318;
          --ag-selected-row-background-color: rgba(200,160,78,0.18);
          --ag-input-focus-border-color: #C8A04E;
          --ag-active-color: #C8A04E;
          --ag-font-size: 13px;
          --ag-row-height: 34px;
          --ag-header-height: 38px;
        }
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
        subtitle="Excel-style live sheet — type in COUNTED, press Enter to move down. Opening, received, issued, closing and prices are calculated from the ledger."
        right={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="success" onClick={() => { setAddTab('manual'); setAddOpen(true) }}>+ ADD STOCK</Button>
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

          <Button variant="ghost" onClick={() => void load()} disabled={loading}>⟳ Refresh</Button>
          <Button variant="ghost" onClick={addNewRow}>+ Add Row</Button>
          <Button variant="ghost" onClick={() => { setAddTab('import'); setAddOpen(true) }}>⤓ Import</Button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted }}>
          Tips: <b>double-click / type</b> over any cell to edit it · <b>Enter</b> moves down between cells like Excel ·{' '}
          <b>✕</b> removes a row's counted entry · Item names in <span style={{ color: '#C8A04E' }}>gold</span> are waiting for you to pick a product.
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

      <div className="ag-theme-quartz-dark" style={{ height: 'calc(100vh - 420px)', minHeight: 420, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <AgGridReact<StockRow>
          rowData={rows}
          columnDefs={columns}
          getRowId={p => p.data.productKey}
          singleClickEdit
          enterNavigatesVertically
          enterNavigatesVerticallyAfterEdit
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

      {/* ADD STOCK modal */}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setAddOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 520, maxWidth: '100%', background: '#1C1710', border: `1px solid ${C.border}`,
            borderRadius: 14, padding: 22, color: C.text,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Add Stock</h3>
              <button onClick={() => setAddOpen(false)} style={{ background: 'transparent', border: 'none', color: '#B08968', fontSize: 18, fontWeight: 800, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 6, background: '#14100B', border: '1px solid #332B21', borderRadius: 10, padding: 3, marginBottom: 16 }}>
              {([['manual', 'Enter manually'], ['import', 'Import Excel / CSV']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setAddTab(id)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                    border: 'none', background: addTab === id ? '#C8A04E' : 'transparent', color: addTab === id ? '#171208' : '#B8B0A0',
                  }}
                >{label}</button>
              ))}
            </div>

            {addTab === 'manual' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 5 }}>Product</label>
                  <input
                    list="inv-stock-product-options"
                    value={addProduct}
                    onChange={e => setAddProduct(e.target.value)}
                    placeholder="Start typing a product name…"
                    style={{
                      width: '100%', boxSizing: 'border-box', background: '#14100B', border: `1px solid ${C.border}`,
                      borderRadius: 9, padding: '10px 12px', color: C.text, fontSize: 13.5, outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 5 }}>Quantity</label>
                    <input type="number" min={0} step="any" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="e.g. 12"
                      style={{ width: '100%', boxSizing: 'border-box', background: '#14100B', border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 12px', color: C.text, fontSize: 13.5, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 5 }}>Unit cost (R)</label>
                    <input type="number" min={0} step="any" value={addCost} onChange={e => setAddCost(e.target.value)} placeholder="e.g. 145"
                      style={{ width: '100%', boxSizing: 'border-box', background: '#14100B', border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 12px', color: C.text, fontSize: 13.5, outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 5 }}>Notes</label>
                  <input value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="Delivery note, invoice no…" style={{
                    width: '100%', boxSizing: 'border-box', background: '#14100B', border: `1px solid ${C.border}`,
                    borderRadius: 9, padding: '10px 12px', color: C.text, fontSize: 13.5, outline: 'none',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button variant="success" onClick={() => void submitAddStock()} disabled={addBusy}>{addBusy ? 'Adding…' : 'Add to stock'}</Button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.textSoft, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0 }}>Prefer a spreadsheet? Fill in the template, upload it here and the system maps products automatically:</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button variant="ghost" onClick={() => { setAddOpen(false) }}>
                    <a href="/api/inventory/imports/template?type=supplier_delivery" download style={{ textDecoration: 'none', color: 'inherit' }}>⬇ Delivery template</a>
                  </Button>
                  <Button variant="ghost" onClick={() => { setAddOpen(false) }}>
                    <a href="/api/inventory/imports/template?type=physical_count" download style={{ textDecoration: 'none', color: 'inherit' }}>⬇ Stock count template</a>
                  </Button>
                </div>
                <p style={{ margin: 0 }}>
                  Then open the full import wizard: <Link href="/admin/operations/imports/new" style={{ color: '#C8A04E' }}>Import wizard →</Link>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Loading the ledger…</p>}
    </div>
  )
}