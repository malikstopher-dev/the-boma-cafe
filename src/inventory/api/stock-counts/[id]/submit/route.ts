import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { submitStockCount } from '@/inventory/engine/stock-counts'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    let raw: Record<string, unknown> = {}
    try { raw = await request.json() } catch { /* empty body */ }
    const body = raw as { performed_by?: string | null }
    const result = await submitStockCount(id, body.performed_by ?? null)
    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('not found') ? 404 : message.includes('cannot submit') ? 409 : 500
    return NextResponse.json(
      { error: { code: status === 500 ? 'INTERNAL_ERROR' : 'CONFLICT', message } },
      { status },
    )
  }
}
