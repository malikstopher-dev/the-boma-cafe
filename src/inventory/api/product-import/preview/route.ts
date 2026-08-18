import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { parseProductImportWorkbook, listProductImportSheets } from '@/inventory/import/product-parser'
import { previewProductImport } from '@/inventory/engine/product-import'

export const maxDuration = 60

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'An .xlsx or .csv file is required' } },
        { status: 400 },
      )
    }
    const sheetIndex = Math.max(0, Number(form.get('sheet_index')) || 0)
    const buffer = await (file as File).arrayBuffer()
    const sheets = await listProductImportSheets(buffer)
    const { rows, sheetName } = await parseProductImportWorkbook(buffer, sheetIndex)
    const preview = await previewProductImport(rows)

    return NextResponse.json({
      data: {
        sheets,
        sheetIndex,
        sheetName,
        rows: preview,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Failed to parse the file' } },
      { status: 400 },
    )
  }
}