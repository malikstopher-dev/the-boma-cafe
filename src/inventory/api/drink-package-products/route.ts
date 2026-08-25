import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, DrinkPackageProduct } from '@/inventory/engine/types'
import { getAllDrinkPackageProducts, addDrinkPackageProduct } from '@/inventory/engine/reservations'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function GET(): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const data = await getAllDrinkPackageProducts()
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<DrinkPackageProduct>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const body = await request.json()
    const { drink_package_id, product_id, quantity_per_person } = body

    if (!drink_package_id || !product_id || !quantity_per_person) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'drink_package_id, product_id, and quantity_per_person are required' } },
        { status: 400 },
      )
    }

    if (typeof quantity_per_person !== 'number' || quantity_per_person <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'quantity_per_person must be a positive number' } },
        { status: 400 },
      )
    }

    const result = await addDrinkPackageProduct(drink_package_id, product_id, quantity_per_person)
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('already added') ? 409 : 500
    return NextResponse.json(
      { error: { code: status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR', message } },
      { status },
    )
  }
}
