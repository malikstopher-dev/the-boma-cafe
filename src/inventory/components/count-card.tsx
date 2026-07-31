'use client'

import { useState } from 'react'

interface CountCardProps {
  productName: string
  productSku: string | null
  productBarcode: string | null
  expectedQuantity: number | null
  initialQuantity: number
  productIndex: number
  totalProducts: number
  onSave: (quantity: number) => Promise<void>
  onSkip: () => void
  onNext: () => void
  onPrev: () => void
}

export function CountCard({
  productName,
  productSku,
  productBarcode,
  expectedQuantity,
  initialQuantity,
  productIndex,
  totalProducts,
  onSave,
  onSkip,
  onNext,
  onPrev,
}: CountCardProps) {
  const [quantity, setQuantity] = useState(initialQuantity)
  const [saving, setSaving] = useState(false)
  const [editingDirect, setEditingDirect] = useState(false)
  const [directValue, setDirectValue] = useState(quantity.toString())
  const [saved, setSaved] = useState(false)

  const variance = expectedQuantity !== null ? quantity - expectedQuantity : 0
  const variancePct = expectedQuantity && expectedQuantity > 0 ? (variance / expectedQuantity) * 100 : 0

  function adjust(delta: number) {
    setQuantity(prev => Math.max(0, prev + delta))
    setSaved(false)
  }

  function handleDirectChange(value: string) {
    setDirectValue(value)
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      setQuantity(num)
      setSaved(false)
    }
  }

  function startDirectEdit() {
    setEditingDirect(true)
    setDirectValue(quantity.toString())
  }

  function finishDirectEdit() {
    setEditingDirect(false)
    const num = parseFloat(directValue)
    if (!isNaN(num) && num >= 0) {
      setQuantity(num)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(quantity)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          Product {productIndex + 1} of {totalProducts}
        </div>
        <div className="flex gap-1">
          <span className={`inline-block w-2 h-2 rounded-full ${saved ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${((productIndex + 1) / totalProducts) * 100}%` }} />
      </div>

      <h2 className="text-xl font-semibold mb-1">{productName}</h2>
      {(productSku || productBarcode) && (
        <p className="text-sm text-gray-400 mb-4">
          {productSku && <>SKU: {productSku}</>}
          {productSku && productBarcode && ' · '}
          {productBarcode && <span className="font-mono">Barcode: {productBarcode}</span>}
        </p>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-500 mb-1">Expected Balance</div>
        <div className="text-2xl font-bold">{expectedQuantity !== null ? expectedQuantity.toFixed(2) : '—'}</div>
      </div>

      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Physical Count</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => adjust(-1)}
            className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-xl font-bold flex items-center justify-center"
          >−</button>

          {editingDirect ? (
            <input
              className="text-center text-3xl font-bold w-32 border-b-2 border-emerald-500 outline-none"
              type="number"
              min="0"
              step="0.5"
              value={directValue}
              onChange={e => setDirectValue(e.target.value)}
              onBlur={finishDirectEdit}
              onKeyDown={e => { if (e.key === 'Enter') finishDirectEdit() }}
              autoFocus
            />
          ) : (
            <div className="text-center text-3xl font-bold w-32 cursor-pointer" onClick={startDirectEdit}>
              {quantity.toFixed(1)}
            </div>
          )}

          <button
            onClick={() => adjust(1)}
            className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-xl font-bold flex items-center justify-center"
          >+</button>
        </div>

        <div className="flex gap-2 mt-2 justify-center">
          <button onClick={() => adjust(-10)} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">−10</button>
          <button onClick={() => adjust(10)} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">+10</button>
        </div>
      </div>

      {expectedQuantity !== null && quantity !== expectedQuantity && (
        <div className={`text-sm mb-4 p-2 rounded ${Math.abs(variancePct) > 10 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
          Variance: {variance > 0 ? '+' : ''}{variance.toFixed(2)} ({variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%)
        </div>
      )}

      <div className="flex gap-2">
        {productIndex > 0 && (
          <button onClick={onPrev} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">Previous</button>
        )}
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
        </button>
        <button onClick={onSkip} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">Skip</button>
        <button onClick={onNext} className="px-4 py-2 text-sm rounded bg-gray-800 text-white hover:bg-gray-900 ml-auto">Next →</button>
      </div>
    </div>
  )
}

export function VarianceTable({
  items,
  onApprove,
  onBack,
  approving,
}: {
  items: any[]
  onApprove: () => void
  onBack: () => void
  approving: boolean
}) {
  const totalExpected = items.reduce((s: number, i: any) => s + Number(i.expected_quantity ?? 0), 0)
  const totalPhysical = items.reduce((s: number, i: any) => s + Number(i.physical_quantity ?? 0), 0)
  const totalVariance = items.reduce((s: number, i: any) => s + Number(i.variance ?? 0), 0)
  const significant = items.filter((i: any) => Math.abs(Number(i.variance ?? 0)) > 0)

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Expected</div>
          <div className="text-2xl font-bold">{totalExpected.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Physical</div>
          <div className="text-2xl font-bold">{totalPhysical.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Variance</div>
          <div className={`text-2xl font-bold ${totalVariance === 0 ? '' : totalVariance > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Expected</th>
              <th className="text-right p-2">Physical</th>
              <th className="text-right p-2">Variance</th>
            </tr>
          </thead>
          <tbody>
            {significant.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-gray-400 text-sm">No variances — all products match</td></tr>
            ) : significant.map((item: any) => {
              const v = Number(item.variance ?? 0)
              return (
                <tr key={item.id} className="border-b">
                  <td className="p-2">{item.inventory_products?.name || item.product_id}</td>
                  <td className="p-2 text-right">{Number(item.expected_quantity ?? 0).toFixed(2)}</td>
                  <td className="p-2 text-right">{Number(item.physical_quantity).toFixed(2)}</td>
                  <td className={`p-2 text-right font-mono ${v === 0 ? '' : v > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {v > 0 ? '+' : ''}{v.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">Back to Count</button>
        <button onClick={onApprove} disabled={approving} className="px-4 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 ml-auto">
          {approving ? 'Approving...' : 'Approve Count'}
        </button>
      </div>
    </div>
  )
}
