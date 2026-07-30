// E2E: Full Inventory System Scenarios
import http from 'node:http'
import crypto from 'node:crypto'

const BASE = 'http://localhost:3000'
const ADMIN_PASSWORD = 'Lovers0884'

const cookie = `boma_admin_auth=${crypto.createHash('sha256').update(`admin:${ADMIN_PASSWORD}`).digest('hex')}`

let pass = 0
let fail = 0
let results = []

function ok(msg) { pass++; results.push(`  \u2713 ${msg}`) }
function failMsg(msg, detail) { fail++; results.push(`  \u2717 ${msg}${detail ? `\n     ${detail}` : ''}`) }

async function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json', 'Cookie': cookie }
    const r = http.request(`${BASE}${path}`, { method, headers, timeout: 60000 }, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    r.on('error', reject)
    if (body) r.write(JSON.stringify(body))
    r.end()
  })
}

async function ensure(resource, searchPath, createPath, createBody, searchKey, searchVal) {
  // Try create first
  const created = await req('POST', createPath, createBody)
  if (created.status === 201 || created.status === 200) {
    const d = created.body?.data || created.body
    return { id: d?.id, status: 'created' }
  }
  // On conflict, look up existing
  if (created.status === 409) {
    const list = await req('GET', searchPath)
    const items = Array.isArray(list.body?.data) ? list.body.data : (Array.isArray(list.body) ? list.body : [])
    const found = items.find(i => i[searchKey] === searchVal)
    if (found) return { id: found.id, status: 'exists' }
  }
  return { id: null, status: 'error', detail: `${created.status}: ${JSON.stringify(created.body)}` }
}

const REAL_BOOKING_ID = '65aad141-589f-449f-9703-d7d49e12a77c'
const STAFF_ID = '2cff29ba-ac43-4a69-aada-915cff7a6296'

async function main() {
  console.log('Running E2E Inventory Tests...\n')

  // ===== SCENARIO 1: INVENTORY LIFECYCLE =====
  console.log('=== SCENARIO 1: INVENTORY LIFECYCLE ===\n')

  // 1a. UOMs
  console.log('-- UOMs --')
  const uomKG = await ensure('uom', '/api/inventory/uoms', '/api/inventory/uoms', { name: 'Kilogram', symbol: 'kg', category: 'continuous' }, 'name', 'Kilogram')
  if (uomKG.id) ok(`UOM Kilogram (${uomKG.status})`)
  else failMsg('UOM Kilogram', uomKG.detail)

  const uomL = await ensure('uom', '/api/inventory/uoms', '/api/inventory/uoms', { name: 'Litre', symbol: 'L', category: 'continuous' }, 'name', 'Litre')
  if (uomL.id) ok(`UOM Litre (${uomL.status})`)
  else failMsg('UOM Litre', uomL.detail)

  const uomEach = await ensure('uom', '/api/inventory/uoms', '/api/inventory/uoms', { name: 'Each', symbol: 'ea', category: 'discrete' }, 'name', 'Each')
  if (uomEach.id) ok(`UOM Each (${uomEach.status})`)
  else failMsg('UOM Each', uomEach.detail)

  const uomList = await req('GET', '/api/inventory/uoms')
  if (uomList.status === 200) ok('UOM list returned')
  else failMsg('UOM list returned', `${uomList.status}: ${JSON.stringify(uomList.body)}`)

  const uoms = Array.isArray(uomList.body?.data) ? uomList.body.data : []
  if (uoms.length >= 3) ok(`At least 3 UOMs exist (${uoms.length})`)
  else failMsg(`At least 3 UOMs exist (${uoms.length})`)

  // 1b. Categories
  console.log('\n-- Categories --')
  const catSpirits = await ensure('category', '/api/inventory/categories', '/api/inventory/categories', { name: 'Spirits', module: 'bar' }, 'name', 'Spirits')
  if (catSpirits.id) ok(`Category Spirits (${catSpirits.status})`)
  else failMsg('Category Spirits', catSpirits.detail)

  const catMixers = await ensure('category', '/api/inventory/categories', '/api/inventory/categories', { name: 'Mixers', module: 'bar' }, 'name', 'Mixers')
  if (catMixers.id) ok(`Category Mixers (${catMixers.status})`)
  else failMsg('Category Mixers', catMixers.detail)

  // 1c. Products
  console.log('\n-- Products --')
  const catSpiritsId = catSpirits.id
  const catMixersId = catMixers.id

  const prodVodka = await ensure('product', '/api/inventory/products', '/api/inventory/products', { name: 'Premium Vodka 1L', sku: 'VOD-001', category_id: catSpiritsId }, 'sku', 'VOD-001')
  if (prodVodka.id) ok(`Product Premium Vodka (${prodVodka.status})`)
  else failMsg('Product Premium Vodka', prodVodka.detail)

  const prodGin = await ensure('product', '/api/inventory/products', '/api/inventory/products', { name: 'London Gin 750ml', sku: 'GIN-001', category_id: catSpiritsId }, 'sku', 'GIN-001')
  if (prodGin.id) ok(`Product London Gin (${prodGin.status})`)
  else failMsg('Product London Gin', prodGin.detail)

  const prodTonic = await ensure('product', '/api/inventory/products', '/api/inventory/products', { name: 'Premium Tonic Water', sku: 'TON-001', category_id: catMixersId }, 'sku', 'TON-001')
  if (prodTonic.id) ok(`Product Tonic Water (${prodTonic.status})`)
  else failMsg('Product Tonic Water', prodTonic.detail)

  const prodList = await req('GET', '/api/inventory/products')
  if (prodList.status === 200) ok('Product list returned')
  else failMsg('Product list returned', `${prodList.status}: ${JSON.stringify(prodList.body)}`)

  // 1d. Suppliers
  console.log('\n-- Suppliers --')
  const supA = await ensure('supplier', '/api/inventory/suppliers', '/api/inventory/suppliers', { name: 'National Beverage Co', contact_person: 'John', phone: '+27110000001', email: 'john@natbev.co.za' }, 'name', 'National Beverage Co')
  if (supA.id) ok(`Supplier National Beverage (${supA.status})`)
  else failMsg('Supplier National Beverage', supA.detail)

  const supB = await ensure('supplier', '/api/inventory/suppliers', '/api/inventory/suppliers', { name: 'Premium Wines & Spirits', contact_person: 'Sarah', phone: '+27110000002', email: 'sarah@premiumws.co.za' }, 'name', 'Premium Wines & Spirits')
  if (supB.id) ok(`Supplier Premium Wines (${supB.status})`)
  else failMsg('Supplier Premium Wines', supB.detail)

  // 1e. Locations
  console.log('\n-- Locations --')
  const locMain = await ensure('location', '/api/inventory/locations', '/api/inventory/locations', { name: 'Main Bar', code: 'BAR-01', description: 'Main bar storage' }, 'code', 'BAR-01')
  if (locMain.id) ok(`Location Main Bar (${locMain.status})`)
  else failMsg('Location Main Bar', locMain.detail)

  const locStore = await ensure('location', '/api/inventory/locations', '/api/inventory/locations', { name: 'Dry Store', code: 'STOR-01', description: 'Back storage room' }, 'code', 'STOR-01')
  if (locStore.id) ok(`Location Dry Store (${locStore.status})`)
  else failMsg('Location Dry Store', locStore.detail)

  // 1f. Dashboard
  console.log('\n-- Dashboard --')
  const locMainId = locMain.id
  const dash = await req('GET', `/api/inventory/dashboard?section=combined&location_id=${locMainId}`)
  if (dash.status === 200) ok('Dashboard combined endpoint OK')
  else failMsg('Dashboard combined endpoint OK', `${dash.status}: ${JSON.stringify(dash.body)}`)

  const prodVodkaId = prodVodka.id
  const prodGinId = prodGin.id
  const prodTonicId = prodTonic.id
  const supAId = supA.id

  // ===== SCENARIO 2: PURCHASE ORDER WORKFLOW =====
  console.log('\n=== SCENARIO 2: PURCHASE ORDER WORKFLOW ===\n')

  // 2a. Create PO
  console.log('-- Create PO --')
  const po = await req('POST', '/api/inventory/purchase-orders', {
    supplier_id: supAId, notes: 'E2E test PO',
    items: [
      { product_id: prodVodkaId, location_id: locMainId, quantity_ordered: 10, unit_cost: 250 },
      { product_id: prodGinId, location_id: locMainId, quantity_ordered: 5, unit_cost: 320 },
    ]
  })
  const poData = po.body?.data || po.body
  if (po.status === 201 || po.status === 200) ok('Purchase Order created')
  else failMsg('Purchase Order created', `${po.status}: ${JSON.stringify(po.body)}`)

  if (poData?.status === 'draft') ok('PO status is draft')
  else failMsg('PO status is draft', `got: ${poData?.status}`)

  const poId = poData?.id

  // 2b. Approve
  console.log('\n-- Approve PO --')
  if (poId) {
    const poApprove = await req('POST', `/api/inventory/purchase-orders/${poId}/approve`)
    const approveData = poApprove.body?.data || poApprove.body
    if (poApprove.status === 200) ok('PO approved')
    else failMsg('PO approved', `${poApprove.status}: ${JSON.stringify(poApprove.body)}`)
    if (approveData?.status === 'approved') ok('PO status is approved')
    else failMsg('PO status is approved', `got: ${approveData?.status}`)

    // 2c. Mark as Ordered
    console.log('\n-- Mark as Ordered --')
    const poOrder = await req('POST', `/api/inventory/purchase-orders/${poId}/order`)
    if (poOrder.status === 200) ok('PO marked ordered')
    else failMsg('PO marked ordered', `${poOrder.status}: ${JSON.stringify(poOrder.body)}`)

    // 2d. Receive Partial
    console.log('\n-- Receive Partial --')
    const poDetail = await req('GET', `/api/inventory/purchase-orders/${poId}`)
    const poData = poDetail.body?.data || poDetail.body
    const poItems = (poData?.inventory_purchase_order_items || poData?.items || [])
    const poItemVodka = poItems[0]?.id
    const poItemGin = poItems[1]?.id

    const recvPartial = await req('POST', `/api/inventory/purchase-orders/${poId}/receive`, {
      invoice_number: 'INV-001',
      items: [{ po_item_id: poItemVodka, product_id: prodVodkaId, quantity_received: 6, unit_cost: 250 }]
    })
    const recvPartialData = recvPartial.body?.data || recvPartial.body
    if (recvPartial.status === 200) ok('Partial delivery received')
    else failMsg('Partial delivery received', `${recvPartial.status}: ${JSON.stringify(recvPartial.body)}`)
    if (recvPartialData?.status === 'partial') ok('PO status is partial')
    else failMsg('PO status is partial', `got: ${recvPartialData?.status}`)

    // 2e. Receive Final
    console.log('\n-- Receive Final --')
    const recvFinal = await req('POST', `/api/inventory/purchase-orders/${poId}/receive`, {
      invoice_number: 'INV-002',
      items: [
        { po_item_id: poItemVodka, product_id: prodVodkaId, quantity_received: 4, unit_cost: 250 },
        { po_item_id: poItemGin, product_id: prodGinId, quantity_received: 5, unit_cost: 320 },
      ]
    })
    const recvFinalData = recvFinal.body?.data || recvFinal.body
    if (recvFinal.status === 200) ok('Final delivery received')
    else failMsg('Final delivery received', `${recvFinal.status}: ${JSON.stringify(recvFinal.body)}`)
    if (recvFinalData?.status === 'received') ok('PO status is received')
    else failMsg('PO status is received', `got: ${recvFinalData?.status}`)

    // 2f. Ledger Verification
    console.log('\n-- Ledger Verification --')
    const txns = await req('GET', `/api/inventory/transactions?product_id=${prodVodkaId}&location_id=${locMainId}`)
    if (txns.status === 200) ok('Ledger transactions returned')
    else failMsg('Ledger transactions returned', `${txns.status}: ${JSON.stringify(txns.body)}`)

    const txnList = Array.isArray(txns.body?.data) ? txns.body.data : []
    const purchaseTxns = txnList.filter(t => t.transaction_type === 'purchase' && t.reference_id === poId)
    if (purchaseTxns.length >= 1) ok(`Purchase transactions exist for this PO in ledger (${purchaseTxns.length})`)
    else failMsg('Purchase transactions exist for this PO in ledger', `found ${purchaseTxns.length}`)

    const txnSum = purchaseTxns.reduce((s, t) => s + Number(t.quantity), 0)
    if (txnSum === 10) ok(`Ledger reflects 10 units of Vodka received for this PO (sum: ${txnSum})`)
    else failMsg('Ledger reflects 10 units of Vodka received for this PO', `sum: ${txnSum}`)

    // 2g. Balance Verification
    console.log('\n-- Balance Verification --')
    const balance = await req('GET', `/api/inventory/locations/${locMainId}/stock`)
    if (balance.status === 200) ok('Location stock list returned')
    else failMsg('Location stock list returned', `${balance.status}: ${JSON.stringify(balance.body)}`)

    const stockList = Array.isArray(balance.body?.data) ? balance.body.data : []
    const vodkaStock = stockList.find(s => s.product_id === prodVodkaId || s.product?.id === prodVodkaId)
    if (vodkaStock) ok('Vodka balance found in location stock')
    else failMsg('Vodka balance found in location stock', `stock items: ${stockList.length}`)
  } else {
    failMsg('PO ID available for workflow', 'PO creation returned no ID')
  }

  // ===== SCENARIO 4: STOCK COUNT =====
  console.log('\n=== SCENARIO 4: STOCK COUNT ===\n')

  // 4a. Create stock count
  console.log('-- Create Stock Count --')
  const sc = await req('POST', '/api/inventory/stock-counts', { location_id: locMainId, notes: 'E2E test stock count' })
  const scData = sc.body?.data || sc.body
  if (sc.status === 201 || sc.status === 200) ok('Stock count session created')
  else failMsg('Stock count session created', `${sc.status}: ${JSON.stringify(sc.body)}`)

  const scId = scData?.stockCount?.id || scData?.id
  if (scId) ok('Stock count ID available')
  else failMsg('Stock count ID available', `no ID in response: ${JSON.stringify(scData)}`)

  if (scId) {
    // 4b. Enter physical quantity for Vodka
    const scItem = await req('POST', `/api/inventory/stock-counts/${scId}/items`, { product_id: prodVodkaId, physical_quantity: 8 })
    if (scItem.status === 200) ok('Count item saved for Vodka')
    else failMsg('Count item saved for Vodka', `${scItem.status}: ${JSON.stringify(scItem.body)}`)

    // 4c. Submit
    const scSubmit = await req('POST', `/api/inventory/stock-counts/${scId}/submit`)
    const submitData = scSubmit.body?.data || scSubmit.body
    if (scSubmit.status === 200 && submitData?.status === 'submitted') ok('Stock count submitted')
    else failMsg('Stock count submitted', `${scSubmit.status}: ${JSON.stringify(scSubmit.body)}`)

    // 4d. Approve
    const scApprove = await req('POST', `/api/inventory/stock-counts/${scId}/approve`, { approved_by: STAFF_ID })
    const approveData = scApprove.body?.data || scApprove.body
    if (scApprove.status === 200 && approveData?.status === 'approved') ok('Stock count approved')
    else failMsg('Stock count approved', `${scApprove.status}: ${JSON.stringify(scApprove.body)}`)

    // 4e. Verify adjustment transactions
    const adjTxns = await req('GET', `/api/inventory/transactions?product_id=${prodVodkaId}&location_id=${locMainId}`)
    if (adjTxns.status === 200) ok('Adjustment transactions readable')
    else failMsg('Adjustment transactions readable', `${adjTxns.status}: ${JSON.stringify(adjTxns.body)}`)
    const allTxns = Array.isArray(adjTxns.body?.data) ? adjTxns.body.data : []
    const physCountTxns = allTxns.filter(t => t.transaction_type === 'physical_count')
    if (physCountTxns.length >= 1) ok(`Physical count adjustment found (${physCountTxns.length})`)
    else failMsg('Physical count adjustment found', `found ${physCountTxns.length} of ${allTxns.length} txns`)
  }

  // ===== SCENARIO 5: BOOKING INTEGRATION =====
  console.log('\n=== SCENARIO 5: BOOKING INTEGRATION ===\n')

  const config = await req('GET', '/api/booking/config')
  if (config.status === 200) ok('Booking config loaded')
  else failMsg('Booking config loaded', `${config.status}: ${JSON.stringify(config.body)}`)

  const dp = Array.isArray(config.body?.drink_packages) ? config.body.drink_packages[0] : null
  if (dp) ok('Drink package found for integration test')
  else failMsg('Drink package found for integration test', 'no drink packages in system')

  if (dp) {
    // Create drink package product mapping (idempotent)
    const dpp = await req('POST', '/api/inventory/drink-package-products', { drink_package_id: dp.id, product_id: prodVodkaId, quantity_per_person: 0.25 })
    if (dpp.status === 201 || dpp.status === 200 || dpp.status === 409) ok(`Drink package \u2192 product mapping (status: ${dpp.status})`)
    else failMsg('Drink package \u2192 product mapping created', `${dpp.status}: ${JSON.stringify(dpp.body)}`)

    if (dpp.status === 409) {
      // Mapping already exists - that's fine
    }

    const dppList = await req('GET', '/api/inventory/drink-package-products')
    if (dppList.status === 200) ok('Drink package product list returned')
    else failMsg('Drink package product list returned', `${dppList.status}: ${JSON.stringify(dppList.body)}`)
    const dppItems = Array.isArray(dppList.body?.data) ? dppList.body.data : []
    if (dppItems.length >= 1) ok(`At least 1 mapping exists (${dppItems.length})`)
    else failMsg('At least 1 mapping exists', `found ${dppItems.length}`)

    let resv = await req('POST', '/api/inventory/reservations', { booking_id: REAL_BOOKING_ID, product_id: prodVodkaId, location_id: locMainId, quantity: 5 })
    if (resv.status === 409) {
      // Already exists from previous run — look it up
      const existing = await req('GET', `/api/inventory/reservations?booking_id=${REAL_BOOKING_ID}`)
      ok('Manual reservation already existed (reusing)')
      const items = Array.isArray(existing.body?.data) ? existing.body.data : []
      resv = { status: 200, body: { data: items.find(i => i.product_id === prodVodkaId) || items[0] } }
    } else if (resv.status === 201 || resv.status === 200) {
      ok('Manual reservation created')
    } else {
      failMsg('Manual reservation created', `${resv.status}: ${JSON.stringify(resv.body)}`)
    }

    const resvList = await req('GET', `/api/inventory/reservations?booking_id=${REAL_BOOKING_ID}`)
    if (resvList.status === 200) ok('Reservation list returned')
    else failMsg('Reservation list returned', `${resvList.status}: ${JSON.stringify(resvList.body)}`)
    const resvItems = Array.isArray(resvList.body?.data) ? resvList.body.data : []
    if (resvItems.length >= 1) ok(`Reservation created with correct booking_id (${resvItems.length})`)
    else failMsg('Reservation created with correct booking_id', `found ${resvItems.length}`)

    if (resvItems.length > 0) {
      const resvId = resvItems[0].id

      const totalReserved = await req('GET', `/api/inventory/reservations?product_id=${prodVodkaId}&location_id=${locMainId}`)
      if (totalReserved.status === 200) ok('Active reservation visible for product')
      else failMsg('Active reservation visible for product', `${totalReserved.status}: ${JSON.stringify(totalReserved.body)}`)

      const cancel = await req('POST', `/api/inventory/reservations/${resvId}/cancel`)
      if (cancel.status === 200) ok('Reservation cancelled')
      else failMsg('Reservation cancelled', `${cancel.status}: ${JSON.stringify(cancel.body)}`)

      const cancelledResv = await req('GET', `/api/inventory/reservations/${resvId}`)
      if (cancelledResv.status === 200) ok('Cancelled reservation retrievable')
      else failMsg('Cancelled reservation retrievable', `${cancelledResv.status}: ${JSON.stringify(cancelledResv.body)}`)
      const crData = cancelledResv.body?.data || cancelledResv.body
      if (crData?.status === 'cancelled') ok('Reservation status is cancelled')
      else failMsg('Reservation status is cancelled', `got: ${crData?.status}`)

      let resv2 = await req('POST', '/api/inventory/reservations', { booking_id: REAL_BOOKING_ID, product_id: prodTonicId, location_id: locMainId, quantity: 3 })
      if (resv2.status === 409) {
        const existing2 = await req('GET', `/api/inventory/reservations?booking_id=${REAL_BOOKING_ID}`)
        const items2 = Array.isArray(existing2.body?.data) ? existing2.body.data : []
        resv2 = { status: 200, body: { data: items2.find(i => i.product_id === prodTonicId) || items2[0] || {} } }
      }
      const resv2Data = resv2.body?.data || resv2.body
      if (resv2Data?.id) {
        const consume = await req('POST', `/api/inventory/reservations/${resv2Data.id}/consume`)
        if (consume.status === 200) ok('Reservation consumed (SALE ledger txn created)')
        else failMsg('Reservation consumed', `${consume.status}: ${JSON.stringify(consume.body)}`)
        const consData = consume.body?.data || consume.body
        if (consData?.status === 'consumed') ok('Reservation status is consumed')
        else failMsg('Reservation status is consumed', `got: ${consData?.status}`)

        const saleTxns = await req('GET', `/api/inventory/transactions?product_id=${prodTonicId}&location_id=${locMainId}`)
        if (saleTxns.status === 200) ok('Sale ledger transactions readable')
        else failMsg('Sale ledger transactions readable', `${saleTxns.status}: ${JSON.stringify(saleTxns.body)}`)
        const txnArr = Array.isArray(saleTxns.body?.data) ? saleTxns.body.data : []
        const sales = txnArr.filter(t => t.transaction_type === 'sale')
        if (sales.length >= 1) ok(`SALE transactions exist in ledger (${sales.length})`)
        else failMsg('SALE transactions exist in ledger', `found ${sales.length} of ${txnArr.length} txns`)
      }
    }
  }

  // ===== SCENARIO 6: REPORTS =====
  console.log('\n=== SCENARIO 6: REPORTS ===')
  const reportTypes = [
    { name: 'Daily Stock', path: `daily?date=2026-07-29&location_id=${locMainId}` },
    { name: 'Valuation', path: `valuation?location_id=${locMainId}` },
    { name: 'Fast Movers', path: `fast-movers?days=30&limit=10&location_id=${locMainId}` },
    { name: 'Slow Movers', path: `slow-movers?days=30&limit=10&location_id=${locMainId}` },
  ]
  for (const r of reportTypes) {
    const rep = await req('GET', `/api/inventory/reports/${r.path}`)
    if (rep.status === 200) ok(`Report "${r.name}" returned OK`)
    else failMsg(`Report "${r.name}" returned`, `${rep.status}: ${JSON.stringify(rep.body)}`)
  }

  // ===== SCENARIO 7: SECURITY =====
  console.log('\n=== SCENARIO 7: SECURITY ===')

  const noAuth = new Promise((resolve) => {
    const r = http.request(`${BASE}/api/inventory/products`, { method: 'GET', headers: {}, timeout: 30000 }, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => resolve({ status: res.statusCode }))
    })
    r.on('error', resolve)
    r.end()
  })
  const noAuthRes = await noAuth
  if (noAuthRes.status === 401 || noAuthRes.status === 403) ok('Unauthenticated request rejected')
  else failMsg('Unauthenticated request rejected', `status: ${noAuthRes.status}`)

  // ===== SCENARIO 8: DASHBOARD =====
  console.log('\n=== SCENARIO 8: DASHBOARD ===')
  const dashSections = [
    { name: 'Summary', section: 'summary' },
    { name: 'Alerts', section: 'alerts' },
    { name: 'Today\'s Transactions', section: 'today' },
    { name: 'Fast Movers', section: 'fast-movers', extra: '&days=30&limit=10' },
    { name: 'Slow Movers', section: 'slow-movers', extra: '&days=30&limit=10' },
  ]
  for (const s of dashSections) {
    const d = await req('GET', `/api/inventory/dashboard?section=${s.section}&location_id=${locMainId}${s.extra || ''}`)
    if (d.status === 200) ok(`Dashboard section "${s.name}" returned OK`)
    else failMsg(`Dashboard section "${s.name}" returned`, `${d.status}: ${JSON.stringify(d.body)}`)
  }

  // ===== SUMMARY =====
  console.log(`\n${'='.repeat(50)}`)
  console.log(`RESULTS: ${pass} passed, ${fail} failed`)
  console.log(`${'='.repeat(50)}\n`)

  results.forEach(r => console.log(r))
  console.log(`\n${'='.repeat(50)}`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
