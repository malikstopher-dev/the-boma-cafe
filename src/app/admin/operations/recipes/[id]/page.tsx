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
      const res = await fetch('/api/inventory/products?page_size=100')
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
      const res = await fetch(`/api/inventory/recipes/${id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selProduct, quantity: parseFloat(selQty) }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error?.message || 'Failed to add ingredient')
        return
      }
      setSelProduct('')
      setSelQty('1')
      setShowAddIngredient(false)
      await fetchRecipe()
    } catch {
      alert('Failed to add ingredient')
    } finally {
      setBusy(false)
    }
  }

  async function addOutput() {
    if (!outputName) return
    setBusy(true)
    try {
      const res = await fetch(`/api/inventory/recipes/${id}/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: outputName, quantity: parseFloat(outputQty) || 1 }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error?.message || 'Failed to add output')
        return
      }
      setOutputName('')
      setOutputQty('1')
      setShowAddOutput(false)
      await fetchRecipe()
    } catch {
      alert('Failed to add output')
    } finally {
      setBusy(false)
    }
  }

  async function removeIngredient(ingredientId: string) {
    if (!confirm('Remove this ingredient?')) return
    try {
      const res = await fetch(`/api/inventory/recipes/${id}/ingredients/${ingredientId}`, { method: 'DELETE' })
      if (!res.ok) alert('Failed to remove ingredient')
      else await fetchRecipe()
    } catch {
      alert('Failed to remove ingredient')
    }
  }

  async function removeOutput(outputId: string) {
    if (!confirm('Remove this output?')) return
    try {
      const res = await fetch(`/api/inventory/recipes/${id}/outputs/${outputId}`, { method: 'DELETE' })
      if (!res.ok) alert('Failed to remove output')
      else await fetchRecipe()
    } catch {
      alert('Failed to remove output')
    }
  }

  if (isLoading) {
    return <AdminPage title="Recipe"><div style={{padding:32,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Loading...</div></AdminPage>
  }

  if (!recipe) {
    return <AdminPage title="Recipe"><div style={{padding:32,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Recipe not found</div></AdminPage>
  }

  return (
    <AdminPage title={recipe.name} description={`${recipe.category ?? 'Uncategorised'} · v${recipe.version}`}>
      <div className="p-6 max-w-4xl">
        <div style={{background:'#242018',border:'1px solid #3A3428',borderRadius:12,padding:16,marginBottom:24}}>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span style={{color:'#A09888',display:'block',fontFamily:'Inter, sans-serif'}}>Yield</span>
              <span style={{color:'#F0EBE3',fontWeight:500,fontFamily:'Inter, sans-serif'}}>{recipe.yield_quantity}</span>
            </div>
            <div>
              <span style={{color:'#A09888',display:'block',fontFamily:'Inter, sans-serif'}}>Prep Time</span>
              <span style={{color:'#F0EBE3',fontWeight:500,fontFamily:'Inter, sans-serif'}}>{recipe.prep_time_minutes ? `${recipe.prep_time_minutes} min` : '—'}</span>
            </div>
            <div>
              <span style={{color:'#A09888',display:'block',fontFamily:'Inter, sans-serif'}}>Expected Waste</span>
              <span style={{color:'#F0EBE3',fontWeight:500,fontFamily:'Inter, sans-serif'}}>{recipe.wastage_pct}%</span>
            </div>
            <div>
              <span className="text-gray-500 block">Status</span>
              <Badge variant={recipe.is_active ? 'success' : 'danger'}>{recipe.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
          {recipe.description && (
            <p style={{fontSize:14,color:'#A09888',marginTop:12,fontFamily:'Inter, sans-serif'}}>{recipe.description}</p>
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
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:12,marginBottom:12,display:'flex',gap:12}}>
              <select
                value={selProduct}
                onChange={e => setSelProduct(e.target.value)}
                style={{flex:1,background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 8px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
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
                style={{width:96,background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 8px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                placeholder="Qty"
              />
              <Button onClick={addIngredient} disabled={busy || !selProduct || !selQty} size="sm">
                Add
              </Button>
            </div>
          )}

          {recipe.ingredients.length === 0 ? (
            <p style={{color:'#A09888',fontSize:14,fontFamily:'Inter, sans-serif'}}>No ingredients yet</p>
          ) : (
            <div className="space-y-2">
              {recipe.ingredients.map(ing => (
                <div key={ing.id} className="flex items-center gap-3 p-3 rounded-lg" style={{background:'#242018',border:'1px solid #3A3428'}}>
                  <span style={{color:'#F0EBE3',fontWeight:500,flex:1,fontFamily:'Inter, sans-serif'}}>{ing.product_name}</span>
                  <span style={{color:'#A09888',fontFamily:'Inter, sans-serif'}}>{ing.quantity} {ing.uom_name ?? ''}</span>
                  {ing.wastage_pct > 0 && <Badge variant="warning">{ing.wastage_pct}% waste</Badge>}
                  <button onClick={() => removeIngredient(ing.id)} style={{fontSize:12,color:'#E85454',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter, sans-serif'}}>Remove</button>
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
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:12,marginBottom:12,display:'flex',gap:12}}>
              <input
                value={outputName}
                onChange={e => setOutputName(e.target.value)}
                placeholder="Output name (e.g. Finished sauce)"
                style={{flex:1,background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 8px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
              />
              <input
                type="number"
                value={outputQty}
                onChange={e => setOutputQty(e.target.value)}
                style={{width:96,background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 8px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                placeholder="Qty"
              />
              <Button onClick={addOutput} disabled={busy || !outputName} size="sm">
                Add
              </Button>
            </div>
          )}

          {recipe.outputs.length === 0 ? (
            <p style={{color:'#A09888',fontSize:14,fontFamily:'Inter, sans-serif'}}>No outputs defined</p>
          ) : (
            <div className="space-y-2">
              {recipe.outputs.map(out => (
                <div key={out.id} className="flex items-center gap-3 p-3 rounded-lg" style={{background:'#242018',border:'1px solid #3A3428'}}>
                  <span style={{color:'#F0EBE3',fontWeight:500,flex:1,fontFamily:'Inter, sans-serif'}}>{out.name}</span>
                  <span style={{color:'#A09888',fontFamily:'Inter, sans-serif'}}>{out.quantity} {out.uom_name ?? ''}</span>
                  <button onClick={() => removeOutput(out.id)} style={{fontSize:12,color:'#E85454',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter, sans-serif'}}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  )
}