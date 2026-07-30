export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TransactionType =
  | 'opening' | 'purchase' | 'sale' | 'sale_bottle'
  | 'breakage' | 'spillage' | 'comp' | 'staff'
  | 'waste' | 'expiry_loss' | 'adjustment' | 'physical_count'
  | 'transfer_in' | 'transfer_out' | 'return'
  | 'production' | 'theft' | 'donation'

export type StockCountStatus = 'in_progress' | 'submitted' | 'approved' | 'cancelled'

export type ImportStatus = 'pending' | 'previewed' | 'approved' | 'applied' | 'rolled_back' | 'failed'

export type ReferenceType =
  | 'import_batch' | 'stock_count' | 'purchase_order'
  | 'booking' | 'pos_order' | 'manual'

export interface InventoryUom {
  id: string
  name: string
  symbol: string | null
  category: 'discrete' | 'continuous'
  created_at: string
}

export interface InventoryUomConversion {
  id: string
  from_uom_id: string
  to_uom_id: string
  factor: number
  created_at: string
}

export interface InventoryProductUom {
  id: string
  product_id: string
  uom_id: string
  is_base: boolean
  is_display: boolean
  conversion_factor: number
  created_at: string
}

export interface InventoryLocation {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
}

export interface InventorySupplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  vat_number: string | null
  payment_terms: string | null
  lead_time_days: number | null
  is_active: boolean
  deleted_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryCategory {
  id: string
  name: string
  parent_id: string | null
  module: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
}

export interface InventoryProduct {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category_id: string | null
  image_url: string | null
  is_active: boolean
  deleted_at: string | null
  preferred_supplier_id: string | null
  supplier_code: string | null
  reorder_threshold: number | null
  reorder_quantity: number | null
  has_expiry: boolean
  shelf_life_days: number | null
  created_at: string
  updated_at: string
}

export interface InventoryTransaction {
  id: string
  product_id: string
  location_id: string
  transaction_type: TransactionType
  quantity: number
  unit_cost: number | null
  reference_type: ReferenceType | null
  reference_id: string | null
  performed_by: string | null
  notes: string | null
  import_batch_id: string | null
  created_at: string
}

export interface InventoryStockCount {
  id: string
  location_id: string
  status: StockCountStatus
  snapshot_tx_before: string | null
  snapshot_tx_after: string | null
  performed_by: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  completed_at: string | null
}

export interface InventoryStockCountItem {
  id: string
  stock_count_id: string
  product_id: string
  physical_quantity: number
  expected_quantity: number | null
  variance: number | null
  variance_reason: string | null
}

export interface ImportBatch {
  id: string
  import_type: 'supplier_delivery' | 'physical_count' | 'adjustment'
  filename: string
  storage_path: string
  status: ImportStatus
  supplier_id: string | null
  idempotency_key: string
  row_count: number | null
  matched_count: number | null
  unknown_count: number | null
  error_count: number | null
  errors: Json | null
  applied_by: string | null
  applied_at: string | null
  created_at: string
}

export interface ImportMapping {
  id: string
  supplier_id: string | null
  supplier_product_name: string
  supplier_sku: string | null
  normalized_name: string | null
  matched_product_id: string | null
  confidence: number | null
  auto_approve: boolean
  created_at: string
}

export interface InventoryAuditLogEntry {
  id: string
  table_name: string
  record_id: string
  action: 'created' | 'updated' | 'archived' | 'restored' | 'hard_deleted'
  changes: Json | null
  performed_by: string | null
  created_at: string
}

export interface DrinkPackageProduct {
  id: string
  drink_package_id: string
  product_id: string
  quantity_per_person: number
  created_at: string
}

export type ReservationStatus = 'active' | 'partially_consumed' | 'consumed' | 'cancelled'

export interface InventoryReservation {
  id: string
  booking_id: string
  product_id: string
  location_id: string
  quantity_reserved: number
  quantity_consumed: number
  status: ReservationStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateReservationInput {
  booking_id: string
  product_id: string
  location_id: string
  quantity: number
  notes?: string | null
}

export interface CreateTransactionInput {
  product_id: string
  location_id: string
  transaction_type: TransactionType
  quantity: number
  unit_cost?: number | null
  reference_type?: ReferenceType | null
  reference_id?: string | null
  performed_by?: string | null
  notes?: string | null
  import_batch_id?: string | null
}

export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    cursor: string | null
    hasMore: boolean
    total?: number
  }
}
