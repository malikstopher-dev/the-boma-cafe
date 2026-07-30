import { NextRequest, NextResponse } from 'next/server'
import { ImportService } from '@/inventory/import/ImportService'
import type { ApiResponse } from '@/inventory/engine/types'
import type { ImportRollbackResult } from '@/inventory/import/ImportTypes'

const importService = new ImportService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ImportRollbackResult>>> {
  try {
    const { id } = await params
    const result = await importService.rollback(id)
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message } },
        { status: 404 },
      )
    }
    if (message.includes('not in') || message.includes('expired')) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message } },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    )
  }
}
