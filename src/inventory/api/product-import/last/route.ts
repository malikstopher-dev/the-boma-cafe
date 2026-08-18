import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { getLastProductImport } from '@/inventory/engine/product-import'

export async function GET(): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const data = await getLastProductImport()
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}