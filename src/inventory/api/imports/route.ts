import { NextRequest, NextResponse } from 'next/server'
import { ImportService } from '@/inventory/import/ImportService'
import type { ApiResponse } from '@/inventory/engine/types'
import type { ImportPreview, ImportHistoryEntry, ImportType, ImportMode } from '@/inventory/import/ImportTypes'

const importService = new ImportService()

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ImportHistoryEntry[]>>> {
  try {
    const history = await importService.getHistory()
    return NextResponse.json({ data: history })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ImportPreview>>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const importType = (formData.get('importType') as string) ?? 'supplier_delivery'
    const supplierId = formData.get('supplierId') as string | null
    const importMode = (formData.get('importMode') as ImportMode) ?? 'draft'
    const locationId = formData.get('locationId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'File is required' } },
        { status: 400 },
      )
    }

    const validTypes = ['supplier_delivery', 'physical_count', 'adjustment']
    if (!validTypes.includes(importType)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `Invalid import type. Must be one of: ${validTypes.join(', ')}` } },
        { status: 400 },
      )
    }

    const validModes = ['draft', 'direct', 'reconcile']
    if (!validModes.includes(importMode)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `Invalid import mode. Must be one of: ${validModes.join(', ')}` } },
        { status: 400 },
      )
    }

    if (importMode === 'direct' && !locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'locationId is required for direct import mode' } },
        { status: 400 },
      )
    }

    const buffer = await file.arrayBuffer()
    const preview = await importService.preview(buffer, file.name, importType as ImportType, supplierId, importMode as ImportMode)

    return NextResponse.json({ data: preview }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const body = await request.json()
    const { importType, locationId, performedBy } = body
    const importMode = body.importMode ?? 'direct'

    if (!importType || !locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'importType and locationId are required' } },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(body.fileContent ?? '', 'base64')
    const result = await importService.directApply(
      buffer,
      body.filename ?? 'direct-import.xlsx',
      importType as ImportType,
      locationId,
      performedBy ?? null,
    )

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
