import { NextRequest, NextResponse } from 'next/server'
import { createTransaction } from '@/inventory/engine/ledger'
import type { ApiResponse, InventoryTransaction, CreateTransactionInput } from '@/inventory/engine/types'
import { InsufficientStockError, ProductNotFoundError, LocationNotFoundError } from '@/inventory/lib/errors'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryTransaction[]>>> {
  const denied = await requireInventoryPermission(request, 'inventory.approve')
  if (denied) return denied
  try {
    const body = await request.json()
    const transactions = body.transactions as CreateTransactionInput[]

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'transactions array is required' } },
        { status: 400 },
      )
    }

    if (transactions.length > 100) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Maximum 100 transactions per batch' } },
        { status: 400 },
      )
    }

    const results: InventoryTransaction[] = []

    for (const tx of transactions) {
      const created = await createTransaction(tx)
      results.push(created)
    }

    return NextResponse.json({ data: results }, { status: 201 })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_STOCK', message: error.message } },
        { status: 422 },
      )
    }
    if (error instanceof ProductNotFoundError || error instanceof LocationNotFoundError) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 },
      )
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
