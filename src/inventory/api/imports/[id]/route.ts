import { NextRequest, NextResponse } from 'next/server'
import { ImportService } from '@/inventory/import/ImportService'
import type { ApiResponse } from '@/inventory/engine/types'
import type { ImportDetail } from '@/inventory/import/ImportTypes'

const importService = new ImportService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ImportDetail>>> {
  try {
    const { id } = await params
    const detail = await importService.getDetail(id)
    if (!detail) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Import batch not found: ${id}` } },
        { status: 404 },
      )
    }
    return NextResponse.json({ data: detail })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
