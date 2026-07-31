'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

interface RecipeIngredient {
  id: string
  product_id: string
  quantity: number
  uom_id: string | null
  wastage_pct: number
  notes: string | null
  product_name?: string
  uom_name?: string
}

interface RecipeOutput {
  id: string
  name: string
  quantity: number
  uom_id: string | null
  uom_name?: string
}

interface RecipeDetail {
  id: string
  name: string
  description: string | null
  yield_quantity: number
  category: string | null
  prep_time_minutes: number | null
  wastage_pct: number
  is_active: boolean
  version: number
  ingredients: RecipeIngredient[]
  outputs: RecipeOutput[]
}

interface Product {
  id: string
  name: string
  inventory_type: string
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const [showAddOutput, setShowAddOutput] = useState(false)
  const [selProduct, setSelProduct] = useState('')
  const [selQty, setSelQty] = useState('1')
  const [outputName, setOutputName] = useState('')
  const [outputQty, setOutputQty] = useState('1')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchRecipe()
    fetchProducts()
  }, [])

  async function fetchRecipe() {
    try {
      const res = await fetch(`/api/inventory/recipes/${id}`)
      const json = await res.json()
      setRecipe(json.data ?? null)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch('/api/inventory/products?limit=500')
      const json = await res.json()
      setProducts(json.data ?? [])
    } catch {
      // ignore
    }
  }

  async function addIngredient() {
    if (!selProduct || !selQty) return
    setBusy(true)
    try {
      await fetch(`/api/inventory/recipes/${id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selProduct, quantity: parseFloat(selQty) }),
      })
      setSelProduct('')
      setSelQty('1')
      setShowAddIngredient(false)
      await fetchRecipe()
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  async function addOutput() {
    if (!outputName) return
    setBusy(true)
    try {
      await fetch(`/api/inventory/recipes/${id}/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: outputName, quantity: parseFloat(outputQty) || 1 }),
      })
      setOutputName('')
      setOutputQty('1')
      setShowAddOutput(false)
      await fetchRecipe()
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  async function removeIngredient(ingredientId: string) {
    if (!confirm('Remove this ingredient?')) return
    try {
      await fetch(`/api/inventory/recipes/${id}/ingredients/${ingredientId}`, { method: 'DELETE' })
      await fetchRecipe()
    } catch {
      // ignore
    }
  }

  async function removeOutput(outputId: string) {
    if (!confirm('Remove this output?')) return
    try {
      await fetch(`/api/inventory/recipes/${id}/outputs/${outputId}`, { method: 'DELETE' })
      await fetchRecipe()
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return <AdminPage title="Recipe"><div className="p-8 text-gray-400">Loading...</div></AdminPage>
  }

  if (!recipe) {
    return <AdminPage title="Recipe"><div className="p-8 text-gray-400">Recipe not found</div></AdminPage>
  }

  return (
    <AdminPage title={recipe.name} description={`${recipe.category ?? 'Uncategorised'} ┬À v${recipe.version}`}>
      <div className="p-6 max-w-4xl">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block">Yield</span>
              <span className="text-white font-medium">{recipe.yield_quantity}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Prep Time</span>
              <span className="text-white font-medium">{recipe.prep_time_minutes ? `${recipe.prep_time_minutes} min` : 'ÔÇö'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Expected Waste</span>
              <span className="text-white font-medium">{recipe.wastage_pct}%</span>
            </div>
            <div>
              <span className="text-gray-500 block">Status</span>
              <Badge variant={recipe.is_active ? 'success' : 'danger'}>{recipe.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
          {recipe.description && (
            <p className="text-sm text-gray-400 mt-3">{recipe.description}</p>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Ingredients ({recipe.ingredients.length})</h2>
            <Button size="sm" variant="secondary" onClick={() => setShowAddIngredient(v => !v)}>
              {showAddIngredient ? 'Cancel' : '+ Add Ingredient'}
            </Button>
          </div>

          {showAddIngredient && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 mb-3 flex gap-3">
              <select
                value={selProduct}
                onChange={e => setSelProduct(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
              >
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.inventory_type})</option>
                ))}
              </select>
              <input
                type="number"
                value={selQty}
                onChange={e => setSelQty(e.target.value)}
                className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                placeholder="Qty"
              />
              <Button onClick={addIngredient} disabled={busy || !selProduct || !selQty} size="sm">
                Add
              </Button>
            </div>
          )}

          {recipe.ingredients.length === 0 ? (
            <p className="text-gray-500 text-sm">No ingredients yet</p>
          ) : (
            <div className="space-y-2">
              {recipe.ingredients.map(ing => (
                <div key={ing.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <span className="text-white font-medium flex-1">{ing.product_name}</span>
                  <span className="text-gray-300">{ing.quantity} {ing.uom_name ?? ''}</span>
                  {ing.wastage_pct > 0 && <Badge variant="warning">{ing.wastage_pct}% waste</Badge>}
                  <button onClick={() => removeIngredient(ing.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Outputs ({recipe.outputs.length})</h2>
            <Button size="sm" variant="secondary" onClick={() => setShowAddOutput(v => !v)}>
              {showAddOutput ? 'Cancel' : '+ Add Output'}
            </Button>
          </div>

          {showAddOutput && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 mb-3 flex gap-3">
              <input
                value={outputName}
                onChange={e => setOutputName(e.target.value)}
                placeholder="Output name (e.g. Finished sauce)"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500"
              />
              <input
                type="number"
                value={outputQty}
                onChange={e => setOutputQty(e.target.value)}
                className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                placeholder="Qty"
              />
              <Button onClick={addOutput} disabled={busy || !outputName} size="sm">
                Add
              </Button>
            </div>
          )}

          {recipe.outputs.length === 0 ? (
            <p className="text-gray-500 text-sm">No outputs defined</p>
          ) : (
            <div className="space-y-2">
              {recipe.outputs.map(out => (
                <div key={out.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <span className="text-white font-medium flex-1">{out.name}</span>
                  <span className="text-gray-300">{out.quantity} {out.uom_name ?? ''}</span>
                  <button onClick={() => removeOutput(out.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  )
}