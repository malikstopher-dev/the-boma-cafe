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

    // Tolerate a missing/empty request body: request.json() throws
    // "Unexpected end of JSON input" on an empty body, which would surface
    // as a confusing 500. Return a readable 400 instead.
    let decisions: unknown
    try {
      const body = await request.json()
      decisions = body?.decisions
    } catch {
      decisions = undefined
    }

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
