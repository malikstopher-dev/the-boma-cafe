import { NextRequest, NextResponse } from 'next/server'
import { ImportService } from '@/inventory/import/ImportService'
import type { ApiResponse } from '@/inventory/engine/types'
import type { ImportApplyResult } from '@/inventory/import/ImportTypes'

const importService = new ImportService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ImportApplyResult>>> {
  try {
    const { id } = await params
    const body = await request.json()
    const { decisions } = body

    if (!Array.isArray(decisions)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'decisions array is required' } },
        { status: 400 },
      )
    }

    const result = await importService.apply(id, decisions)
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
