import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { getAdminContext } from '@/lib/admin/context'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { decryptSupplierBankDetails, encryptSupplierBankDetails, type BankPayload } from '@/lib/admin/supplier-bank-encryption'

type Params = { params: Promise<{ id: string }> }

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: { code: status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR', message } }, { status })
}

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await requireAdminPermission(request, 'supplier.bank.read')
  if (denied) return denied
  const { id } = await params
  try {
    const { data, error } = await getAdminClient()
      .from('inventory_supplier_bank_details')
      .select('supplier_id, payload_ciphertext, payload_iv, payload_auth_tag, account_last4, key_version, updated_at')
      .eq('supplier_id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ data: { configured: false } })
    const payload = decryptSupplierBankDetails(id, data)
    return NextResponse.json({
      data: {
        configured: true,
        bankName: payload.bank_name,
        accountHolder: payload.account_holder,
        maskedAccountNumber: `****${data.account_last4}`,
        branchCode: payload.branch_code,
        accountType: payload.account_type,
        paymentReferenceNote: payload.payment_reference_note,
        updatedAt: data.updated_at,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unable to load banking details' } }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdminPermission(request, 'supplier.bank.write')
  if (denied) return denied
  const admin = await getAdminContext(request)
  if (!admin) return errorResponse('Admin authentication required', 401)
  const { id } = await params
  try {
    const body = await request.json() as Partial<BankPayload>
    const fields: (keyof BankPayload)[] = ['bank_name', 'account_holder', 'account_number', 'branch_code', 'account_type', 'payment_reference_note']
    if (fields.some(field => typeof body[field] !== 'string' || !body[field]?.trim())) {
      return errorResponse('All banking fields are required')
    }
    const payload = Object.fromEntries(fields.map(field => [field, body[field]!.trim()])) as BankPayload
    const encrypted = encryptSupplierBankDetails(id, payload)
    const { data, error } = await getAdminClient().rpc('upsert_supplier_bank_details', {
      p_supplier_id: id,
      p_payload_ciphertext: encrypted.payload_ciphertext,
      p_payload_iv: encrypted.payload_iv,
      p_payload_auth_tag: encrypted.payload_auth_tag,
      p_account_last4: encrypted.account_last4,
      p_key_version: encrypted.key_version,
      p_admin_id: admin.adminId,
      p_changed_fields: fields,
    })
    if (error) throw error
    return NextResponse.json({ data: { configured: true, bankName: payload.bank_name, accountHolder: payload.account_holder, maskedAccountNumber: `****${encrypted.account_last4}`, branchCode: payload.branch_code, accountType: payload.account_type, paymentReferenceNote: payload.payment_reference_note, updatedAt: data?.updated_at ?? new Date().toISOString() } })
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unable to save banking details' } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdminPermission(request, 'supplier.bank.delete')
  if (denied) return denied
  const admin = await getAdminContext(request)
  if (!admin) return errorResponse('Admin authentication required', 401)
  const { id } = await params
  const { error } = await getAdminClient().rpc('delete_supplier_bank_details', { p_supplier_id: id, p_admin_id: admin.adminId })
  if (error) return NextResponse.json({ error: { code: 'DELETE_ERROR', message: error.message } }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
