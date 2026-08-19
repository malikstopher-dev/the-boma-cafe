'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'
import SupplierProductsModal, { adminModalTheme, type ProductSummary } from '@/inventory/components/supplier-products-modal'

interface SupplierDetail {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  vat_number: string | null
  payment_terms: string | null
  payment_term_type: string | null
  payment_term_days: number | null
  lead_time_days: number | null
  notes: string | null
  is_active: boolean
  deleted_at: string | null
  products?: { id: string; name: string; sku: string | null; is_active: boolean }[]
}

interface BankDetails {
  configured: boolean
  bankName?: string
  accountHolder?: string
  maskedAccountNumber?: string
  branchCode?: string
  accountType?: string
  paymentReferenceNote?: string
  updatedAt?: string
}

const TERM_OPTIONS = [
  { value: 'CASH', label: 'Cash — due on receipt' },
  { value: 'COD', label: 'Cash on Delivery' },
  { value: 'WEEKLY', label: 'Weekly — due in 7 days' },
  { value: 'MONTHLY', label: 'Monthly — due same day next month' },
  { value: 'ACCOUNT', label: 'Account — custom days' },
]

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [allProducts, setAllProducts] = useState<ProductSummary[] | null>(null)
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [bankRestricted, setBankRestricted] = useState(false)
  const [bankSaving, setBankSaving] = useState(false)
  const [bankError, setBankError] = useState<string | null>(null)
  const [bankForm, setBankForm] = useState({ bank_name: '', account_holder: '', account_number: '', branch_code: '', account_type: '', payment_reference_note: '' })

  const loadDetail = useCallback(() => {
    const id = params?.id as string
    if (!id) return

    setIsLoading(true)
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
            payment_term_type: json.data.payment_term_type || 'CASH',
            payment_term_days: json.data.payment_term_days != null ? String(json.data.payment_term_days) : '30',
            notes: json.data.notes || '',
          })
          fetch(`/api/inventory/suppliers/${id}/bank-details`)
            .then(async response => ({ response, json: await response.json() }))
            .then(({ response, json }) => {
              if (response.status === 403) setBankRestricted(true)
              else if (response.ok) setBankDetails(json.data)
            })
            .catch(() => setBankError('Unable to load banking details'))
        }
      })
      .catch(() => setError('Failed to load supplier'))
      .finally(() => setIsLoading(false))
  }, [params?.id])

  useEffect(() => { loadDetail() }, [loadDetail])

  function openProductsModal() {
    setShowProductsModal(true)
    if (allProducts) return
    fetch('/api/inventory/products?page_size=500&show_archived=false')
      .then(r => r.json())
      .then(json => setAllProducts(Array.isArray(json.data) ? json.data as ProductSummary[] : []))
      .catch(() => setAllProducts([]))
  }

  function handleProductsChange(updates: { id: string; preferred_supplier_id: string | null }[]) {
    setAllProducts(prev => {
      if (!prev) return prev
      const map: Record<string, string | null> = {}
      for (const u of updates) map[u.id] = u.preferred_supplier_id
      return prev.map(p => (p.id in map ? { ...p, preferred_supplier_id: map[p.id] ?? null } : p))
    })
    setShowProductsModal(false)
    loadDetail()
  }

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

  async function handleBankSave() {
    if (!supplier) return
    setBankSaving(true)
    setBankError(null)
    try {
      const res = await fetch(`/api/inventory/suppliers/${supplier.id}/bank-details`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bankForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || 'Unable to save banking details')
      setBankDetails(json.data)
      setBankForm({ bank_name: '', account_holder: '', account_number: '', branch_code: '', account_type: '', payment_reference_note: '' })
    } catch (saveError) {
      setBankError(saveError instanceof Error ? saveError.message : 'Unable to save banking details')
    } finally {
      setBankSaving(false)
    }
  }

  async function handleBankDelete() {
    if (!supplier || !confirm('Delete banking details for this supplier?')) return
    const res = await fetch(`/api/inventory/suppliers/${supplier.id}/bank-details`, { method: 'DELETE' })
    if (res.ok) setBankDetails({ configured: false })
    else setBankError('Only the owner can delete banking details')
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
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16}}>
          <h3 style={{fontWeight:600,marginBottom:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Contact Information</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Name', form.name, 'name'],
              ['Contact Person', form.contact_person, 'contact_person'],
              ['Phone', form.phone, 'phone'],
              ['Email', form.email, 'email'],
              ['VAT Number', form.vat_number, 'vat_number'],
              ['Lead Time (days)', supplier.lead_time_days?.toString() || '—', null],
              ['Notes', form.notes, 'notes'],
            ].map(([label, value, key]) => (
              <div key={key || label} className="flex justify-between">
                <dt style={{color:'#A09888'}}>{label}</dt>
                <dd className="font-medium text-right">
                  {editing && key ? (
                    <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:4,padding:'4px 8px',fontSize:12,width:160,textAlign:'right',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} value={value as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  ) : (
                    (value as string) || '—'
                  )}
                </dd>
              </div>
            ))}
            <div className="flex justify-between">
              <dt style={{color:'#A09888'}}>Payment Terms</dt>
              <dd className="font-medium text-right">
                {editing ? (
                  <>
                    <select style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:4,padding:'4px 8px',fontSize:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} value={form.payment_term_type || 'CASH'} onChange={e => setForm(f => ({ ...f, payment_term_type: e.target.value }))}>
                      {TERM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {form.payment_term_type === 'ACCOUNT' && (
                      <input type="number" min={0} style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:4,padding:'4px 8px',fontSize:12,width:80,textAlign:'right',color:'#F0EBE3',fontFamily:'Inter, sans-serif',marginLeft:6}} value={form.payment_term_days || '30'} onChange={e => setForm(f => ({ ...f, payment_term_days: e.target.value }))} />
                    )}
                  </>
                ) : (
                  TERM_OPTIONS.find(o => o.value === (form.payment_term_type || 'CASH'))?.label || '—'
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16,gridColumn:'span 2'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontWeight:600,margin:0,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Products from this Supplier</h3>
            <Button onClick={openProductsModal} size="sm">Assign Products</Button>
          </div>
          {(!supplier.products || supplier.products.length === 0) ? (
            <p style={{fontSize:14,color:'#6B6358',fontFamily:'Inter, sans-serif'}}>No products linked to this supplier</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{borderBottom:'1px solid #3A3428'}}>
                  <th style={{textAlign:'left',padding:8,fontWeight:500,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Name</th>
                  <th style={{textAlign:'left',padding:8,fontWeight:500,color:'#A09888',fontFamily:'Inter, sans-serif'}}>SKU</th>
                  <th style={{textAlign:'left',padding:8,fontWeight:500,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {supplier.products.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #3A3428',cursor:'pointer'}} onClick={() => router.push(`/admin/operations/products/${p.id}`)}>
                    <td style={{padding:8,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{p.name}</td>
                    <td style={{padding:8,color:'#A09888',fontFamily:'Inter, sans-serif'}}>{p.sku || '—'}</td>
                    <td className="p-2"><Badge variant={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Active' : 'Archived'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16,gridColumn:'1 / -1'}}>
          <h3 style={{fontWeight:600,marginBottom:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Banking Details</h3>
          {bankRestricted ? <p style={{fontSize:14,color:'#A09888'}}>Restricted to owner and full manager roles.</p> : (
            <>
              {bankDetails?.configured ? (
                <div className="flex flex-wrap gap-4 text-sm" style={{color:'#F0EBE3'}}>
                  <span>{bankDetails.bankName}</span><span>{bankDetails.accountHolder}</span>
                  <span>{bankDetails.maskedAccountNumber}</span><span>{bankDetails.branchCode}</span><span>{bankDetails.accountType}</span>
                  <Button onClick={handleBankDelete} variant="danger" size="sm">Delete</Button>
                </div>
              ) : <p style={{fontSize:14,color:'#A09888'}}>No banking details configured.</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                {([['bank_name','Bank name'],['account_holder','Account holder'],['account_number','Account number'],['branch_code','Branch code'],['account_type','Account type'],['payment_reference_note','Payment reference note']] as const).map(([key, label]) => (
                  <input key={key} aria-label={label} placeholder={label} value={bankForm[key]} onChange={e => setBankForm(formValue => ({ ...formValue, [key]: e.target.value }))} style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:4,padding:'8px 10px',fontSize:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} />
                ))}
              </div>
              {bankError && <p style={{color:'#E9A3A3',fontSize:12,marginTop:8}}>{bankError}</p>}
              <Button onClick={handleBankSave} disabled={bankSaving} size="sm" style={{marginTop:12}}>{bankSaving ? 'Saving...' : 'Save Banking Details'}</Button>
            </>
          )}
        </div>
      </div>

      {showProductsModal && supplier && allProducts && (
        <SupplierProductsModal
          supplierId={supplier.id}
          supplierName={supplier.name}
          products={allProducts}
          onProductsChange={handleProductsChange}
          onClose={() => setShowProductsModal(false)}
          theme={adminModalTheme}
        />
      )}
    </AdminPage>
  )
}
