import type { ParsedRow, ValidationError, ValidationResult, ImportType } from './ImportTypes'

export class ImportValidator {
  private readonly DECREASE_TYPES_FOR_ADJUSTMENT = ['breakage', 'spillage', 'waste', 'theft', 'donation']

  validate(rows: ParsedRow[], importType: ImportType): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const seenProducts = new Set<string>()

    for (const row of rows) {
      if (!row.productName) {
        errors.push({
          rowIndex: row.rowIndex,
          field: 'productName',
          message: 'Product name is required',
          value: row.productName,
        })
      }

      if (row.quantity === null || row.quantity === undefined) {
        errors.push({
          rowIndex: row.rowIndex,
          field: 'quantity',
          message: 'Quantity is required',
          value: row.quantity,
        })
      } else if (row.quantity <= 0) {
        errors.push({
          rowIndex: row.rowIndex,
          field: 'quantity',
          message: 'Quantity must be a positive number',
          value: row.quantity,
        })
      }

      if (row.unit !== null && row.unit.length > 50) {
        errors.push({
          rowIndex: row.rowIndex,
          field: 'unit',
          message: 'Unit name too long (max 50 characters)',
          value: row.unit,
        })
      }

      if (row.unitCost !== null && row.unitCost < 0) {
        errors.push({
          rowIndex: row.rowIndex,
          field: 'unitCost',
          message: 'Unit cost cannot be negative',
          value: row.unitCost,
        })
      }

      if (row.bottleSizeMl !== null && row.bottleSizeMl <= 0) {
        errors.push({
          rowIndex: row.rowIndex,
          field: 'bottleSizeMl',
          message: 'Bottle size must be a positive number',
          value: row.bottleSizeMl,
        })
      }

      if (row.fullBottles !== null && row.fullBottles < 0) {
        errors.push({
          rowIndex: row.rowIndex,
          field: 'fullBottles',
          message: 'Full bottles count cannot be negative',
          value: row.fullBottles,
        })
      }

      if (row.tots !== null && row.tots < 0) {
        errors.push({
          rowIndex: row.rowIndex,
          field: 'tots',
          message: 'Tots count cannot be negative',
          value: row.tots,
        })
      }

      if (importType === 'supplier_delivery') {
        if (row.unitCost === null || row.unitCost === undefined) {
          warnings.push(`Row ${row.rowIndex}: No unit cost provided for supplier delivery`)
        }
      }

      const normalizedName = row.productName?.trim().toLowerCase() ?? ''
      if (normalizedName && seenProducts.has(normalizedName)) {
        warnings.push(`Row ${row.rowIndex}: Duplicate product name "${row.productName}"`)
      }
      if (normalizedName) {
        seenProducts.add(normalizedName)
      }
    }

    if (rows.length === 0) {
      errors.push({
        rowIndex: 0,
        field: 'file',
        message: 'No valid data rows found in spreadsheet',
        value: null,
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
