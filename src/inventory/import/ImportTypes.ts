export type ImportType = 'supplier_delivery' | 'physical_count' | 'adjustment'
export type ImportMode = 'draft' | 'direct' | 'reconcile'

// ─── Column-Mapping Metadata ──────────────────────────────────────────────
// The UI drives the mapping step from this single source of truth. Each field
// maps to a ParsedRow property + a human label + whether it's required for a
// meaningful import. Kept in ImportTypes (not the parser) so both engine and
// UI can import it without pulling in xlsx.
export type ImportField =
  | 'productName'
  | 'quantity'
  | 'unit'
  | 'supplierSku'
  | 'unitCost'
  | 'bottleSizeMl'
  | 'fullBottles'
  | 'tots'
  | 'categoryName'
  | 'inventoryType'
  | 'sku'
  | 'barcode'
  | 'parLevel'
  | 'reorderPoint'
  | 'preferredSupplier'
  | 'notes'

export const FIELD_LABELS: Record<ImportField, string> = {
  productName: 'Product Name',
  quantity: 'Quantity',
  unit: 'Unit / Package Size',
  supplierSku: 'Supplier SKU / Code',
  unitCost: 'Unit Cost',
  bottleSizeMl: 'Bottle / Volume (ml)',
  fullBottles: 'Full Bottles',
  tots: 'Tots / Shots',
  categoryName: 'Category',
  inventoryType: 'Item Type (Food/Beverage/etc.)',
  sku: 'Internal SKU',
  barcode: 'Barcode',
  parLevel: 'Par Level',
  reorderPoint: 'Reorder Point',
  preferredSupplier: 'Preferred Supplier',
  notes: 'Notes',
}

export const REQUIRED_FIELDS: ImportField[] = ['productName', 'quantity']

export interface DetectedHeader {
  field: ImportField | null
  header: string
  match: 'exact' | 'alias' | 'none'
}

// A user override given as { field -> original spreadsheet header }. Passed
// back to the parser so remapped columns are honoured on re-parse.
export type ColumnOverride = Partial<Record<ImportField, string>>

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
  inventoryType?: string | null
  sku?: string | null
  barcode?: string | null
  parLevel?: number | null
  reorderPoint?: number | null
  preferredSupplier?: string | null
  costCentreId?: string | null
  reasonType?: string | null
  reasonNotes?: string | null
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
  headers: DetectedHeader[]
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

export interface SkipInfo {
  rowIndex: number
  reason: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  skips?: SkipInfo[]
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
  skipped?: boolean
  skipReason?: string | null
}

export interface ImportPreview {
  id: string
  importType: ImportType
  filename: string
  totalRows: number
  matchedRows: number
  unknownRows: number
  errorRows: number
  skippedRows?: number
  skipReasons?: string[]
  rows: PreviewRow[]
  headers?: DetectedHeader[]
  summary: {
    totalProducts: number
    matchedProducts: number
    unknownProducts: number
    totalQuantity: number
    totalValue: number
  }
  createdAt: string
  autoApplied?: number
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
  costCentreId?: string | null
  reasonType?: string | null
  reasonNotes?: string | null
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
  importMode: ImportMode
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
  importMode: ImportMode
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
