import { getInventoryClient } from '../lib/db'
import type { Recipe, RecipeDetail, RecipeIngredient, RecipeOutput } from './types'

export async function listRecipes(includeInactive?: boolean): Promise<Recipe[]> {
  const supabase = getInventoryClient()

  let query = supabase
    .from('inventory_recipes')
    .select('*')
    .order('name')

  if (!includeInactive) query = query.eq('is_active', true)

  const { data } = await query
  return (data ?? []) as Recipe[]
}

export async function getRecipe(id: string): Promise<RecipeDetail | null> {
  const supabase = getInventoryClient()

  const { data: recipe } = await supabase
    .from('inventory_recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!recipe) return null

  const { data: ingredients } = await supabase
    .from('inventory_recipe_ingredients')
    .select('*, inventory_products!inner(id, name), inventory_uoms(name)')
    .eq('recipe_id', id)
    .order('sort_order')

  const { data: outputs } = await supabase
    .from('inventory_recipe_outputs')
    .select('*, inventory_uoms(name)')
    .eq('recipe_id', id)
    .order('sort_order')

  return {
    ...(recipe as Recipe),
    ingredients: (ingredients ?? []).map((i: any) => ({
      id: i.id,
      recipe_id: i.recipe_id,
      product_id: i.product_id,
      quantity: Number(i.quantity),
      uom_id: i.uom_id,
      wastage_pct: Number(i.wastage_pct ?? 0),
      substitution_product_id: i.substitution_product_id,
      sort_order: i.sort_order,
      notes: i.notes,
      product_name: i.inventory_products?.name ?? 'Unknown',
      uom_name: i.inventory_uoms?.name ?? null,
    })),
    outputs: (outputs ?? []).map((o: any) => ({
      id: o.id,
      recipe_id: o.recipe_id,
      name: o.name,
      quantity: Number(o.quantity),
      uom_id: o.uom_id,
      sort_order: o.sort_order,
      uom_name: o.inventory_uoms?.name ?? null,
    })),
  }
}

export async function createRecipe(data: {
  name: string
  description?: string | null
  yield_quantity?: number
  yield_uom_id?: string | null
  category?: string | null
  prep_time_minutes?: number | null
  wastage_pct?: number
  created_by?: string | null
}): Promise<Recipe> {
  const supabase = getInventoryClient()

  const { data: recipe } = await supabase
    .from('inventory_recipes')
    .insert({
      name: data.name,
      description: data.description ?? null,
      yield_quantity: data.yield_quantity ?? 1,
      yield_uom_id: data.yield_uom_id ?? null,
      category: data.category ?? null,
      prep_time_minutes: data.prep_time_minutes ?? null,
      wastage_pct: data.wastage_pct ?? 0,
      created_by: data.created_by ?? null,
    })
    .select()
    .single()

  if (!recipe) throw new Error('Failed to create recipe')
  return recipe as Recipe
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_recipes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (!data) throw new Error('Recipe not found')
  return data as Recipe
}

export async function addIngredient(recipeId: string, ingredient: {
  product_id: string
  quantity: number
  uom_id?: string | null
  wastage_pct?: number
  substitution_product_id?: string | null
  sort_order?: number
  notes?: string | null
}): Promise<RecipeIngredient> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_recipe_ingredients')
    .insert({
      recipe_id: recipeId,
      product_id: ingredient.product_id,
      quantity: ingredient.quantity,
      uom_id: ingredient.uom_id ?? null,
      wastage_pct: ingredient.wastage_pct ?? 0,
      substitution_product_id: ingredient.substitution_product_id ?? null,
      sort_order: ingredient.sort_order ?? 0,
      notes: ingredient.notes ?? null,
    })
    .select('*, inventory_products!inner(id, name)')
    .single()

  if (!data) throw new Error('Failed to add ingredient')
  return {
    id: data.id,
    recipe_id: data.recipe_id,
    product_id: data.product_id,
    quantity: Number(data.quantity),
    uom_id: data.uom_id,
    wastage_pct: Number(data.wastage_pct ?? 0),
    substitution_product_id: data.substitution_product_id,
    sort_order: data.sort_order,
    notes: data.notes,
    product_name: (data as any).inventory_products?.name ?? 'Unknown',
  }
}

export async function removeIngredient(recipeId: string, ingredientId: string): Promise<void> {
  const supabase = getInventoryClient()

  const { error } = await supabase
    .from('inventory_recipe_ingredients')
    .delete()
    .eq('id', ingredientId)
    .eq('recipe_id', recipeId)

  if (error) throw new Error(error.message)
}

export async function addOutput(recipeId: string, output: {
  name: string
  quantity?: number
  uom_id?: string | null
  sort_order?: number
}): Promise<RecipeOutput> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_recipe_outputs')
    .insert({
      recipe_id: recipeId,
      name: output.name,
      quantity: output.quantity ?? 1,
      uom_id: output.uom_id ?? null,
      sort_order: output.sort_order ?? 0,
    })
    .select('*, inventory_uoms(name)')
    .single()

  if (!data) throw new Error('Failed to add output')
  return {
    id: data.id,
    recipe_id: data.recipe_id,
    name: data.name,
    quantity: Number(data.quantity),
    uom_id: data.uom_id,
    sort_order: data.sort_order,
    uom_name: (data as any).inventory_uoms?.name ?? null,
  }
}

export async function removeOutput(recipeId: string, outputId: string): Promise<void> {
  const supabase = getInventoryClient()

  const { error } = await supabase
    .from('inventory_recipe_outputs')
    .delete()
    .eq('id', outputId)
    .eq('recipe_id', recipeId)

  if (error) throw new Error(error.message)
}
