'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import { Input } from '@/components/admin/design-system/Input'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import { useToast } from '@/components/admin/design-system/Toast'

type EntityTab = 'venue_areas' | 'food_packages' | 'drink_packages' | 'addons' | 'settings'

const TABS: { id: EntityTab; label: string }[] = [
  { id: 'venue_areas', label: 'Venue Areas' },
  { id: 'food_packages', label: 'Food Packages' },
  { id: 'drink_packages', label: 'Drink Packages' },
  { id: 'addons', label: 'Add-ons' },
  { id: 'settings', label: 'Settings' },
]

interface PriceEntity {
  id: string
  name: string
  [key: string]: any
}

export default function AdminPricing() {
  const [activeTab, setActiveTab] = useState<EntityTab>('venue_areas')
  const [data, setData] = useState<Record<string, any[]>>({})
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const { success, error: showError } = useToast()

  useEffect(() => {
    setIsLoading(true)
    fetch('/api/admin/pricing')
      .then(r => r.json())
      .then(result => {
        setData({
          venue_areas: result.venue_areas || [],
          food_packages: result.food_packages || [],
          drink_packages: result.drink_packages || [],
          addons: result.addons || [],
        })
        setSettings(result.settings || {})
      })
      .catch(() => showError('Failed to load pricing data'))
      .finally(() => setIsLoading(false))
  }, [])

  const handleEdit = async (entityType: string, entityId: string, field: string, value: number | string) => {
    const key = `${entityId}:${field}`
    setSaving(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, field, value }),
      })
      if (res.ok) {
        success('Price updated')
        setEditing(prev => ({ ...prev, [key]: '' }))
      } else {
        showError('Failed to update')
      }
    } catch {
      showError('Network error')
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleSettingUpdate = async (key: string, value: string) => {
    try {
      const res = await fetch(`/api/cms/all-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`booking:${key}`]: value }),
      })
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        success('Setting updated')
      }
    } catch {
      showError('Failed to update setting')
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Pricing Editor" description="Manage booking prices and packages" />
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}><SkeletonCard /><SkeletonCard /></div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Pricing Editor" description="Edit venue, package, and add-on prices without code" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? '#0F766E' : '#F1F3F7',
              color: activeTab === tab.id ? '#fff' : '#475569',
              fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Venue Areas */}
      {activeTab === 'venue_areas' && (
        <EntityEditor
          entities={data.venue_areas}
          fields={[
            { key: 'base_price_weekday', label: 'Base Price (Weekday)', type: 'number' },
            { key: 'base_price_weekend', label: 'Base Price (Weekend)', type: 'number' },
            { key: 'minimum_spend', label: 'Minimum Spend', type: 'number' },
            { key: 'hourly_rate_weekday', label: 'Hourly Rate (Weekday)', type: 'number' },
            { key: 'hourly_rate_weekend', label: 'Hourly Rate (Weekend)', type: 'number' },
            { key: 'capacity_min', label: 'Min Capacity', type: 'number' },
            { key: 'capacity_max', label: 'Max Capacity', type: 'number' },
          ]}
          entityType="venue_areas"
          editing={editing}
          saving={saving}
          onEdit={handleEdit}
          setEditing={setEditing}
        />
      )}

      {/* Food Packages */}
      {activeTab === 'food_packages' && (
        <EntityEditor
          entities={data.food_packages}
          fields={[
            { key: 'per_person_weekday', label: 'Per Person (Weekday)', type: 'number' },
            { key: 'per_person_weekend', label: 'Per Person (Weekend)', type: 'number' },
            { key: 'child_price_weekday', label: 'Child Price (Weekday)', type: 'number' },
            { key: 'child_price_weekend', label: 'Child Price (Weekend)', type: 'number' },
            { key: 'min_guests', label: 'Min Guests', type: 'number' },
          ]}
          entityType="food_packages"
          editing={editing}
          saving={saving}
          onEdit={handleEdit}
          setEditing={setEditing}
        />
      )}

      {/* Drink Packages */}
      {activeTab === 'drink_packages' && (
        <EntityEditor
          entities={data.drink_packages}
          fields={[
            { key: 'amount_weekday', label: 'Amount (Weekday)', type: 'number' },
            { key: 'amount_weekend', label: 'Amount (Weekend)', type: 'number' },
            { key: 'min_guests', label: 'Min Guests', type: 'number' },
            { key: 'pricing_model', label: 'Pricing Model', type: 'select', options: ['per_person', 'flat_rate', 'consumption'] },
          ]}
          entityType="drink_packages"
          editing={editing}
          saving={saving}
          onEdit={handleEdit}
          setEditing={setEditing}
        />
      )}

      {/* Add-ons */}
      {activeTab === 'addons' && (
        <EntityEditor
          entities={data.addons}
          fields={[
            { key: 'amount_weekday', label: 'Amount (Weekday)', type: 'number' },
            { key: 'amount_weekend', label: 'Amount (Weekend)', type: 'number' },
            { key: 'pricing_model', label: 'Model', type: 'select', options: ['flat_fee', 'per_person', 'per_hour'] },
            { key: 'max_quantity', label: 'Max Qty', type: 'number' },
          ]}
          entityType="addons"
          entityLabel="name"
          editing={editing}
          saving={saving}
          onEdit={handleEdit}
          setEditing={setEditing}
        />
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, maxWidth: 500 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 20 }}>Booking Settings</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            {settingFields.map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>
                  {field.label}
                </label>
                {field.type === 'number' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      value={settings[field.key] ?? field.default ?? ''}
                      onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                        fontSize: 14, background: '#F8F9FB',
                      }}
                    />
                    <Button size="sm" onClick={() => handleSettingUpdate(field.key, settings[field.key] ?? '')}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={settings[field.key] ?? field.default ?? ''}
                      onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                        fontSize: 14, background: '#F8F9FB',
                      }}
                    />
                    <Button size="sm" onClick={() => handleSettingUpdate(field.key, settings[field.key] ?? '')}>
                      Save
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface FieldDef {
  key: string
  label: string
  type: 'number' | 'text' | 'select'
  options?: string[]
}

function EntityEditor({
  entities, fields, entityType, entityLabel, editing, saving, onEdit, setEditing,
}: {
  entities: any[]
  fields: FieldDef[]
  entityType: string
  entityLabel?: string
  editing: Record<string, string>
  saving: Record<string, boolean>
  onEdit: (type: string, id: string, field: string, value: any) => void
  setEditing: (cb: (prev: Record<string, string>) => Record<string, string>) => void
}) {
  const labelField = entityLabel || 'name'

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {entities.map(entity => (
        <div key={entity.id} style={{
          background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20,
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>
            {entity[labelField]}
            {entity.venue && <span style={{ color: '#94A3B8', fontWeight: 400, marginLeft: 8 }}>{entity.venue.name}</span>}
            {entity.category && <span style={{ color: '#94A3B8', fontWeight: 400, marginLeft: 8 }}>{entity.category.name}</span>}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {fields.map(field => {
              const editKey = `${entity.id}:${field.key}`
              const currentValue = editing[editKey] ?? String(entity[field.key] ?? '')
              const isSaving = saving[editKey]

              if (field.type === 'select') {
                return (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: 500 }}>
                      {field.label}
                    </label>
                    <select
                      value={String(entity[field.key] ?? '')}
                      onChange={e => onEdit(entityType, entity.id, field.key, e.target.value)}
                      style={{
                        width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #E5E7EB',
                        fontSize: 13, background: '#F8F9FB',
                      }}
                    >
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                )
              }

              return (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: 500 }}>
                    {field.label}
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type={field.type}
                      value={currentValue}
                      onChange={e => setEditing(prev => ({ ...prev, [editKey]: e.target.value }))}
                      onFocus={() => setEditing(prev => ({ ...prev, [editKey]: String(entity[field.key] ?? '') }))}
                      style={{
                        flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #E5E7EB',
                        fontSize: 13, background: '#F8F9FB', width: '100%', boxSizing: 'border-box',
                      }}
                    />
                    {editing[editKey] !== undefined && editing[editKey] !== String(entity[field.key]) && (
                      <button
                        onClick={() => onEdit(entityType, entity.id, field.key, field.type === 'number' ? parseFloat(currentValue) : currentValue)}
                        disabled={isSaving}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: 'none',
                          background: isSaving ? '#94A3B8' : '#0F766E', color: '#fff',
                          fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        {isSaving ? '...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const settingFields = [
  { key: 'deposit_percentage', label: 'Deposit Percentage (%)', type: 'number', default: '30' },
  { key: 'tax_rate', label: 'Tax Rate (%)', type: 'number', default: '0' },
  { key: 'quote_validity_days', label: 'Quote Validity (Days)', type: 'number', default: '7' },
  { key: 'min_advance_days', label: 'Minimum Advance Booking (Days)', type: 'number', default: '1' },
  { key: 'max_advance_days', label: 'Maximum Advance Booking (Days)', type: 'number', default: '365' },
  { key: 'business_hours_start', label: 'Business Hours Start', type: 'text', default: '08:00' },
  { key: 'business_hours_end', label: 'Business Hours End', type: 'text', default: '22:00' },
  { key: 'enabled', label: 'Booking Enabled (true/false)', type: 'text', default: 'true' },
  { key: 'auto_confirm', label: 'Auto Confirm (true/false)', type: 'text', default: 'true' },
]