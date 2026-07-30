import type { ParsedRow, ColumnMapping, SupplierColumnTemplate } from './ImportTypes'
import { getInventoryClient } from '../lib/db'

const DEFAULT_COLUMN_MAP: Record<string, string> = {
  productName: 'Product Name',
  quantity: 'Quantity',
  unit: 'Unit',
  supplierSku: 'Supplier SKU',
  unitCost: 'Unit Cost',
  bottleSizeMl: 'Bottle Size',
  fullBottles: 'Full Bottles',
  tots: 'Tots',
  notes: 'Notes',
}

const HEADER_ALIASES: Record<string, string[]> = {
  productName: ['Product Name', 'Product', 'Item', 'Description', 'Name'],
  quantity: ['Quantity', 'Qty', 'Count', 'Amount'],
  unit: ['Unit', 'UOM'],
  supplierSku: ['Supplier SKU', 'SKU', 'Code', 'Supplier Code'],
  unitCost: ['Unit Cost', 'Cost', 'Price', 'Unit Price'],
  bottleSizeMl: ['Bottle Size', 'Size (ml)', 'Volume'],
  fullBottles: ['Full Bottles', 'Bottles'],
  tots: ['Tots', 'Shots'],
  notes: ['Notes', 'Comments'],
}

export class ColumnMapper {
  detectColumns(headers: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    const normalizedHeaders = headers.map(h => h.trim().toLowerCase())

    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      for (const header of normalizedHeaders) {
        const match = aliases.some(alias => {
          const normalAlias = alias.toLowerCase()
          return header === normalAlias ||
            header.includes(normalAlias) ||
            normalAlias.includes(header)
        })
        if (match) {
          const originalIdx = normalizedHeaders.indexOf(header)
          const original = originalIdx >= 0 ? headers[originalIdx] : undefined
          if (original) {
            map[field] = original
          }
          break
        }
      }
    }

    return map
  }

  async getSavedMapping(supplierId: string): Promise<Record<string, string> | null> {
    return DEFAULT_COLUMN_MAP
  }

  async saveMapping(supplierId: string, columnMap: Record<string, string>): Promise<void> {
    const supabase = getInventoryClient()
    await supabase
      .from('inventory_import_mappings')
      .upsert({
        supplier_id: supplierId,
        supplier_product_name: '_column_map',
        normalized_name: JSON.stringify(columnMap),
        auto_approve: false,
      }, { onConflict: 'supplier_id, supplier_product_name' })
  }

  applyMapping(rows: ParsedRow[], columnMap: Record<string, string>): ParsedRow[] {
    return rows
  }
}
