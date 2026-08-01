'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

type Recipe = {
  id: string
  name: string
  description: string | null
  yield_quantity: number
  category: string | null
  prep_time_minutes: number | null
  is_active: boolean
  version: number
  updated_at: string
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchRecipes()
  }, [])

  async function fetchRecipes() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/recipes')
      const json = await res.json()
      setRecipes(json.data ?? [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  async function createRecipe() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/inventory/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription || null,
          category: newCategory || null,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setShowCreate(false)
        setNewName('')
        setNewDescription('')
        setNewCategory('')
        await fetchRecipes()
      }
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  const filtered = filter
    ? recipes.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()))
    : recipes

  return (
    <AdminPage
      title="Recipes"
      description="Reusable recipes with ingredients and outputs"
      actions={
        <Button onClick={() => setShowCreate(v => !v)} size="sm">
          {showCreate ? 'Cancel' : 'New Recipe'}
        </Button>
      }
    >
      <div className="p-6">
        {showCreate && (
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16,marginBottom:24}}>
            <h3 style={{fontWeight:600,color:'#F0EBE3',marginBottom:12,fontFamily:'Inter, sans-serif'}}>New Recipe</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Recipe name *"
                style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
              />
              <input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Category (e.g. sauce, prep)"
                style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
              />
              <input
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Description"
                style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
              />
            </div>
            <div className="mt-3">
              <Button onClick={createRecipe} disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create Recipe'}
              </Button>
            </div>
          </div>
        )}

        <input
          type="text"
          placeholder="Search recipes..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{marginBottom:16,background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif',width:'100%',maxWidth:320}}
        />

        {isLoading ? (
          <div style={{color:'#A09888',padding:'48px 0',textAlign:'center',fontFamily:'Inter, sans-serif'}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{color:'#A09888',padding:'48px 0',textAlign:'center',fontFamily:'Inter, sans-serif'}}>No recipes found. Create your first recipe.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(recipe => (
              <Link
                key={recipe.id}
                href={`/admin/operations/recipes/${recipe.id}`}
                className="rounded-lg p-4 transition-colors"
                style={{background:'#242018',border:'1px solid #3A3428'}}
              >
                <div className="flex items-center justify-between mb-2">
                  <span style={{color:'#F0EBE3',fontWeight:600,fontFamily:'Inter, sans-serif'}}>{recipe.name}</span>
                  <Badge variant="info">v{recipe.version}</Badge>
                </div>
                {recipe.description && (
                  <p style={{fontSize:14,color:'#A09888',marginBottom:8,fontFamily:'Inter, sans-serif'}} className="line-clamp-2">{recipe.description}</p>
                )}
                <div className="flex gap-4" style={{fontSize:12,color:'#6B6358'}}>
                  {recipe.category && <span>{recipe.category}</span>}
                  {recipe.prep_time_minutes && <span>{recipe.prep_time_minutes} min prep</span>}
                  <span>Yield: {recipe.yield_quantity}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminPage>
  )
}
