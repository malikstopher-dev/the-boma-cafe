import { getInventoryClient } from '../lib/db'
import { writeAuditLog } from '../lib/audit'
import type { ChecklistInstance, ChecklistItem, ChecklistItemStatus } from './types'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function nowString(): string {
  return new Date().toISOString()
}

export async function getOrCreateInstance(locationId: string, date?: string, openedBy?: string | null): Promise<ChecklistInstance & { items: ChecklistItem[] }> {
  const supabase = getInventoryClient()
  const checklistDate = date ?? todayString()

  const { data: existing } = await supabase
    .from('inventory_checklist_instances')
    .select('*, inventory_checklist_items(*)')
    .eq('location_id', locationId)
    .eq('checklist_date', checklistDate)
    .maybeSingle()

  if (existing) {
    return {
      id: existing.id,
      location_id: existing.location_id,
      checklist_date: existing.checklist_date,
      status: existing.status,
      opened_by: existing.opened_by,
      opened_at: existing.opened_at,
      completed_by: existing.completed_by,
      completed_at: existing.completed_at,
      manager_notes: existing.manager_notes,
      items: (existing as any).inventory_checklist_items?.map((item: any) => ({
        id: item.id,
        instance_id: item.instance_id,
        template_id: item.template_id,
        title: item.title,
        description: item.description,
        category: item.category,
        sort_order: item.sort_order,
        is_required: item.is_required,
        status: item.status,
        completed_by: item.completed_by,
        completed_at: item.completed_at,
        notes: item.notes,
      })) ?? [],
    }
  }

  const { data: templates } = await supabase
    .from('inventory_checklist_templates')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data: instance } = await supabase
    .from('inventory_checklist_instances')
    .insert({
      location_id: locationId,
      checklist_date: checklistDate,
      status: 'in_progress',
      opened_by: openedBy ?? null,
      opened_at: nowString(),
    })
    .select()
    .single()

  if (!instance) {
    throw new Error('Failed to create checklist instance')
  }

  const itemsData = (templates ?? []).map((t: any) => ({
    instance_id: instance.id,
    template_id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    sort_order: t.sort_order,
    is_required: t.is_required,
    status: 'pending' as const,
  }))

  if (itemsData.length > 0) {
    const { data: items } = await supabase
      .from('inventory_checklist_items')
      .insert(itemsData)
      .select('*')

    return {
      id: instance.id,
      location_id: instance.location_id,
      checklist_date: instance.checklist_date,
      status: instance.status,
      opened_by: instance.opened_by,
      opened_at: instance.opened_at,
      completed_by: instance.completed_by,
      completed_at: instance.completed_at,
      manager_notes: instance.manager_notes,
      items: (items ?? []).map((item: any) => ({
        id: item.id,
        instance_id: item.instance_id,
        template_id: item.template_id,
        title: item.title,
        description: item.description,
        category: item.category,
        sort_order: item.sort_order,
        is_required: item.is_required,
        status: item.status,
        completed_by: item.completed_by,
        completed_at: item.completed_at,
        notes: item.notes,
      })),
    }
  }

  return {
    id: instance.id,
    location_id: instance.location_id,
    checklist_date: instance.checklist_date,
    status: instance.status,
    opened_by: instance.opened_by,
    opened_at: instance.opened_at,
    completed_by: instance.completed_by,
    completed_at: instance.completed_at,
    manager_notes: instance.manager_notes,
    items: [],
  }
}

export async function updateItemStatus(
  instanceId: string,
  itemId: string,
  status: ChecklistItemStatus,
  completedBy?: string | null,
  notes?: string | null,
): Promise<ChecklistItem> {
  const supabase = getInventoryClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'completed' || status === 'skipped' || status === 'failed') {
    updates.completed_at = nowString()
    updates.completed_by = completedBy ?? null
  }
  if (notes !== undefined) {
    updates.notes = notes
  }

  const { data } = await supabase
    .from('inventory_checklist_items')
    .update(updates)
    .eq('id', itemId)
    .eq('instance_id', instanceId)
    .select()
    .single()

  if (!data) {
    throw new Error('Checklist item not found')
  }

  return {
    id: data.id,
    instance_id: data.instance_id,
    template_id: data.template_id,
    title: data.title,
    description: data.description,
    category: data.category,
    sort_order: data.sort_order,
    is_required: data.is_required,
    status: data.status,
    completed_by: data.completed_by,
    completed_at: data.completed_at,
    notes: data.notes,
  }
}

export async function completeInstance(
  instanceId: string,
  completedBy?: string | null,
  managerNotes?: string | null,
): Promise<ChecklistInstance> {
  const supabase = getInventoryClient()

  const { data: instance } = await supabase
    .from('inventory_checklist_instances')
    .update({
      status: 'completed',
      completed_by: completedBy ?? null,
      completed_at: nowString(),
      ...(managerNotes !== undefined ? { manager_notes: managerNotes } : {}),
    })
    .eq('id', instanceId)
    .select()
    .single()

  if (!instance) {
    throw new Error('Checklist instance not found')
  }

  return instance
}

export async function updateManagerNotes(
  instanceId: string,
  notes: string,
  author?: string | null,
): Promise<void> {
  const supabase = getInventoryClient()

  const { error } = await supabase
    .from('inventory_checklist_instances')
    .update({ manager_notes: notes })
    .eq('id', instanceId)

  if (error) throw new Error(error.message)

  await writeAuditLog(
    'checklist',
    instanceId,
    'updated',
    { manager_notes: notes },
    author ?? null,
  )
}

export async function listInstances(
  locationId?: string,
  from?: string,
  to?: string,
  limit?: number,
): Promise<ChecklistInstance[]> {
  const supabase = getInventoryClient()

  let query = supabase
    .from('inventory_checklist_instances')
    .select('*')
    .order('checklist_date', { ascending: false })
    .limit(limit ?? 30)

  if (locationId) query = query.eq('location_id', locationId)
  if (from) query = query.gte('checklist_date', from)
  if (to) query = query.lte('checklist_date', to)

  const { data } = await query

  return (data ?? []).map((row: any) => ({
    id: row.id,
    location_id: row.location_id,
    checklist_date: row.checklist_date,
    status: row.status,
    opened_by: row.opened_by,
    opened_at: row.opened_at,
    completed_by: row.completed_by,
    completed_at: row.completed_at,
    manager_notes: row.manager_notes,
  }))
}
