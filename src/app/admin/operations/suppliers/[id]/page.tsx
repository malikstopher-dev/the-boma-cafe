'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

interface SupplierDetail {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  vat_number: string | null
  payment_terms: string | null
  lead_time_days: number | null
  notes: string | null
  is_active: boolean
  deleted_at: string | null
  products?: { id: string; name: string; sku: string | null; is_active: boolean }[]
}

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    const id = params?.id as string
    if (!id) return

    fetch(`/api/inventory/suppliers/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error.message)
        else {
          setSupplier(json.data)
          setForm({
            name: json.data.name || '',
            contact_person: json.data.contact_person || '',
            phone: json.data.phone || '',
            email: json.data.email || '',
            vat_number: json.data.vat_number || '',
            payment_terms: json.data.payment_terms || '',
            notes: json.data.notes || '',
          })
        }
      })
      .catch(() => setError('Failed to load supplier'))
      .finally(() => setIsLoading(false))
  }, [params?.id])

  async function handleSave() {
    if (!supplier) return
    const res = await fetch(`/api/inventory/suppliers/${supplier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (res.ok) {
      setEditing(false)
      setSupplier(prev => prev ? { ...json.data, products: prev.products } : json.data)
    } else {
      alert(json.error?.message || 'Failed to save supplier')
    }
  }

  async function handleArchive() {
    if (!supplier || !confirm('Archive this supplier?')) return
    const res = await fetch(`/api/inventory/suppliers/${supplier.id}`, { method: 'DELETE' })
    if (res.ok || res.status === 409) {
      router.push('/admin/operations/suppliers')
    }
  }

  async function handleRestore() {
    if (!supplier) return
    const res = await fetch(`/api/inventory/suppliers/${supplier.id}/restore`, { method: 'POST' })
    if (res.ok) {
      const json = await res.json()
      setSupplier(json.data)
    }
  }

  if (isLoading) return <AdminPage title="Supplier"><SkeletonCard /></AdminPage>
  if (error || !supplier) return <AdminPage title="Supplier"><EmptyState title="Not found" description={error || ''} /></AdminPage>

  return (
    <AdminPage title={supplier.name} description="Supplier details" actions={<><Badge variant={supplier.is_active ? 'success' : 'default'}>{supplier.is_active ? 'Active' : 'Archived'}</Badge>
      {supplier.is_active ? (
        <>
          <Button onClick={() => setEditing(!editing)} variant="secondary" size="sm">{editing ? 'Cancel' : 'Edit'}</Button>
          {editing && <Button onClick={handleSave} size="sm">Save</Button>}
          <Button onClick={handleArchive} variant="danger" size="sm">Archive</Button>
        </>
      ) : (
        <Button onClick={handleRestore} size="sm">Restore</Button>
      )}
      <Link href="/admin/operations/suppliers"><Button variant="secondary" size="sm">Back</Button></Link></>}>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Contact Information</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Name', form.name, 'name'],
              ['Contact Person', form.contact_person, 'contact_person'],
              ['Phone', form.phone, 'phone'],
              ['Email', form.email, 'email'],
              ['VAT Number', form.vat_number, 'vat_number'],
              ['Payment Terms', form.payment_terms, 'payment_terms'],
              ['Lead Time (days)', supplier.lead_time_days?.toString() || '—', null],
              ['Notes', form.notes, 'notes'],
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
          <h3 className="font-semibold mb-3">Products from this Supplier</h3>
          {(!supplier.products || supplier.products.length === 0) ? (
            <p className="text-sm text-gray-400">No products linked to this supplier</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">SKU</th>
                  <th className="text-left p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {supplier.products.map(p => (
                  <tr key={p.id} className="border-b cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/admin/operations/products/${p.id}`)}>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 text-gray-500">{p.sku || '—'}</td>
                    <td className="p-2"><Badge variant={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Active' : 'Archived'}</Badge></td>
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