'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

interface LocationDetail {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  deleted_at: string | null
  productCount?: number
}

export default function LocationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [location, setLocation] = useState<LocationDetail | null>(null)
  const [stockItems, setStockItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', description: '' })

  useEffect(() => {
    const id = params?.id as string
    if (!id) return

    Promise.all([
      fetch(`/api/inventory/locations/${id}`).then(r => r.json()),
      fetch(`/api/inventory/locations/${id}/stock?page_size=50`).then(r => r.json()),
    ])
      .then(([locJson, stockJson]) => {
        if (locJson.error) setError(locJson.error.message)
        else {
          setLocation(locJson.data)
          setForm({
            name: locJson.data.name || '',
            code: locJson.data.code || '',
            description: locJson.data.description || '',
          })
        }
        setStockItems(stockJson.data || [])
      })
      .catch(() => setError('Failed to load location'))
      .finally(() => setIsLoading(false))
  }, [params?.id])

  async function handleSave() {
    if (!location) return
    const res = await fetch(`/api/inventory/locations/${location.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setEditing(false)
      const json = await res.json()
      setLocation(json.data)
    }
  }

  async function handleArchive() {
    if (!location || !confirm('Archive this location?')) return
    const res = await fetch(`/api/inventory/locations/${location.id}`, { method: 'DELETE' })
    if (res.ok || res.status === 409) {
      router.push('/admin/inventory/locations')
    }
  }

  async function handleRestore() {
    if (!location) return
    const res = await fetch(`/api/inventory/locations/${location.id}/restore`, { method: 'POST' })
    if (res.ok) {
      const json = await res.json()
      setLocation(json.data)
    }
  }

  if (isLoading) return <AdminPage title="Location"><SkeletonCard /></AdminPage>
  if (error || !location) return <AdminPage title="Location"><EmptyState title="Not found" description={error || ''} /></AdminPage>

  return (
    <AdminPage title={location.name} description={`Code: ${location.code}`} actions={<><Badge variant={location.is_active ? 'success' : 'default'}>{location.is_active ? 'Active' : 'Archived'}</Badge>
      {location.is_active ? (
        <>
          <Button onClick={() => setEditing(!editing)} variant="secondary" size="sm">{editing ? 'Cancel' : 'Edit'}</Button>
          {editing && <Button onClick={handleSave} size="sm">Save</Button>}
          <Button onClick={handleArchive} variant="danger" size="sm">Archive</Button>
        </>
      ) : (
        <Button onClick={handleRestore} size="sm">Restore</Button>
      )}
      <Link href="/admin/inventory/locations"><Button variant="secondary" size="sm">Back</Button></Link></>}>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Location Info</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Name', form.name, 'name'],
              ['Code', form.code, 'code'],
              ['Description', form.description, 'description'],
              ['Products with Stock', location.productCount?.toString() || '0', null],
            ].map(([label, value, key]) => (
              <div key={key || label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-right">
                  {editing && key ? (
                    <input className="border rounded px-2 py-1 text-xs w-40 text-right" value={value as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  ) : (
                    (value as string) || '—'
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white rounded-lg border p-4 lg:col-span-2">
          <h3 className="font-semibold mb-3">Stock at this Location</h3>
          {stockItems.length === 0 ? (
            <p className="text-sm text-gray-400">No products with stock at this location</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Product</th>
                  <th className="text-left p-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {stockItems.map((item: any, i: number) => (
                  <tr key={item.product_id || i} className="border-b cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/admin/inventory/products/${item.product_id}`)}>
                    <td className="p-2">{item.inventory_products?.name || item.product_id}</td>
                    <td className="p-2 font-mono">{Number(item.balance).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminPage>
  )
}
