import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const TEMPLATE_ROWS: Record<string, unknown>[] = [
  {
    'Product Name': 'Jameson Irish Whiskey',
    'Item Type': 'Beverage',
    Category: 'Whiskey',
    'Supplier SKU / Code': 'JAM-WHIS-750',
    'Internal SKU': 'WHIS-JAM-750',
    Barcode: '5011007003285',
    Quantity: 2,
    'Unit / Package Size': 'Case',
    'Bottle / Volume (ml)': 750,
    'Full Bottles': 24,
    'Tots / Shots': 30,
    'Unit Cost': '240.00',
    'Par Level': 10,
    'Reorder Point': 4,
    'Preferred Supplier': 'Distell Wholesale',
    Notes: 'Case of 12 x 750ml',
  },
  {
    'Product Name': 'Beef Fillet',
    'Item Type': 'Food',
    Category: 'Meat / Poultry',
    'Supplier SKU': 'KF-BEEF-001',
    'Internal SKU': 'KF-BEEF-001',
    Barcode: '6001234567890',
    Quantity: '5',
    'Unit / Package Size': 'Kg',
    'Bottle / Volume (ml)': '',
    'Full Bottles': '',
    'Tots / Shots': '',
    'Unit Cost': '185.00',
    'Par Level': 15,
    'Reorder Point': 6,
    'Preferred Supplier': 'Wholesale Meats SA',
    Notes: 'Weekly delivery',
  },
]

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const type = request.nextUrl.searchParams.get('type') ?? 'supplier_delivery'

    const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS)
    ws['!cols'] = [
      { wch: 32 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 18 },
      { wch: 16 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 30 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type === 'physical_count' ? 'Stock Count' : 'Products')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = type === 'physical_count'
      ? 'boma-stock-count-template.xlsx'
      : 'boma-product-import-template.xlsx'

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}