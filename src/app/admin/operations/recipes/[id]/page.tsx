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
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-white mb-3">New Recipe</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Recipe name *"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
              />
              <input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Category (e.g. sauce, prep)"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
              />
              <input
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Description"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
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
          className="mb-4 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 w-full max-w-xs"
        />

        {isLoading ? (
          <div className="text-gray-400 py-12 text-center">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 py-12 text-center">No recipes found. Create your first recipe.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(recipe => (
              <Link
                key={recipe.id}
                href={`/admin/operations/recipes/${recipe.id}`}
                className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{recipe.name}</span>
                  <Badge variant="info">v{recipe.version}</Badge>
                </div>
                {recipe.description && (
                  <p className="text-sm text-gray-400 mb-2 line-clamp-2">{recipe.description}</p>
                )}
                <div className="flex gap-4 text-xs text-gray-500">
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
