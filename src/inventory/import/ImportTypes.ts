export type ImportType = 'supplier_delivery' | 'physical_count' | 'adjustment'

export type ImportStatus = 'pending' | 'previewed' | 'approved' | 'applied' | 'rolled_back' | 'failed'

export type MatchSource = 'supplier_sku' | 'exact_name' | 'name_and_size' | 'saved_mapping' | 'fuzzy' | 'none'

export type DecisionAction = 'apply' | 'create_product' | 'merge' | 'skip'

export interface ParsedRow {
  rowIndex: number
  productName: string
  quantity: number | null
  unit: string | null
  supplierSku: string | null
  unitCost: number | null
  bottleSizeMl: number | null
  fullBottles: number | null
  tots: number | null
  notes: string | null
  categoryName: string | null
}

export interface ParseError {
  rowIndex: number
  field: string
  message: string
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: ParseError[]
  totalRows: number
}

export interface ColumnMapping {
  supplierId: string | null
  columnMap: Record<string, string>
  createdAt: string
}

export interface ValidationError {
  rowIndex: number
  field: string
  message: string
  value: unknown
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
}

export interface ProductMatch {
  rowIndex: number
  productId: string | null
  productName: string | null
  confidence: number
  matchSource: MatchSource
  suggestedAction: DecisionAction
}

export interface PreviewRow {
  rowIndex: number
  productName: string
  match: ProductMatch | null
  parsedQuantity: number | null
  currentStock: number | null
  incomingQuantity: number | null
  expectedStock: number | null
  unitCost: number | null
  errors: ValidationError[]
  warnings: string[]
}

export interface ImportPreview {
  id: string
  importType: ImportType
  filename: string
  totalRows: number
  matchedRows: number
  unknownRows: number
  errorRows: number
  rows: PreviewRow[]
  summary: {
    totalProducts: number
    matchedProducts: number
    unknownProducts: number
    totalQuantity: number
    totalValue: number
  }
  createdAt: string
}

export interface ImportDecision {
  rowIndex: number
  action: DecisionAction
  productId?: string | null
  newProductName?: string | null
  newProductCategoryId?: string | null
  newProductUomId?: string | null
  quantity?: number | null
  locationId?: string | null
  unitCost?: number | null
  transactionType?: string | null
  sourceRow?: string | null
}

export interface ImportApplyRequest {
  decisions: ImportDecision[]
}

export interface ImportApplyResult {
  importBatchId: string
  transactionIds: string[]
  productIds: string[]
  rowCount: number
  appliedAt: string
}

export interface ImportRollbackResult {
  importBatchId: string
  reversalTransactionIds: string[]
  rolledBackAt: string
}

export interface ImportHistoryEntry {
  id: string
  importType: ImportType
  filename: string
  status: ImportStatus
  supplierId: string | null
  supplierName: string | null
  rowCount: number | null
  matchedCount: number | null
  unknownCount: number | null
  errorCount: number | null
  appliedBy: string | null
  appliedAt: string | null
  createdAt: string
  canRollback: boolean
}

export interface ImportDetail extends ImportHistoryEntry {
  storagePath: string
  errors: unknown
  rows: PreviewRow[]
  decisions?: ImportDecision[] | null
  transactionIds?: string[] | null
  reversalTransactionIds?: string[] | null
}

export interface ProductMatchRequest {
  supplierId?: string | null
  rows: ParsedRow[]
}

export interface SupplierColumnTemplate {
  id: string
  supplierId: string
  name: string
  columnMap: Record<string, string>
  isDefault: boolean
  createdAt: string
}
