export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TransactionType =
  | 'opening' | 'purchase' | 'sale' | 'sale_bottle'
  | 'breakage' | 'spillage' | 'comp' | 'staff'
  | 'waste' | 'expiry_loss' | 'adjustment' | 'physical_count'
  | 'transfer_in' | 'transfer_out' | 'return'
  | 'production' | 'theft' | 'donation' | 'gas_usage'

export type InventoryType = 'FOOD' | 'BEVERAGE' | 'CLEANING' | 'PACKAGING' | 'GENERAL' | 'GAS'

export type MovementReason =
  | 'BREAKAGE' | 'WASTE' | 'STAFF_MEAL' | 'PROMOTION' | 'EXPIRED' | 'THEFT'
  | 'DONATION' | 'COMP' | 'TRANSFER' | 'ADJUSTMENT' | 'SALE' | 'BOOKING'
  | 'RETURN' | 'OPENING' | 'CLOSING' | 'PRODUCTION' | 'SPILLAGE' | 'DELIVERY' | 'GAS_USAGE'

export type ImportMode = 'initial' | 'delivery' | 'full_replacement'

export type StockCountStatus = 'in_progress' | 'submitted' | 'approving' | 'approved' | 'cancelled'

export type ImportStatus = 'pending' | 'previewed' | 'approved' | 'applied' | 'rolled_back' | 'failed'

export type ReferenceType =
  | 'import_batch' | 'stock_count' | 'purchase_order'
  | 'booking' | 'pos_order' | 'manual' | 'production_run'

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
  payment_term_type: string | null
  payment_term_days: number | null
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
  inventory_type: InventoryType
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
  cost_centre_id: string
  reason_type: MovementReason | null
  reason_notes: string | null
  manager_note: string | null
  note_author: string | null
  reference_type: ReferenceType | null
  reference_id: string | null
  performed_by: string | null
  notes: string | null
  import_batch_id: string | null
  /** SALE posted by consumeReservation for this reservation (migration
   *  077). At most one per reservation (unique index). */
  reservation_id: string | null
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
  /** Ledger transaction created for this item's variance on approval
   *  (migration 073). Non-null items are skipped on approval retries. */
  transaction_id?: string | null
}

export interface ImportBatch {
  id: string
  import_type: 'supplier_delivery' | 'physical_count' | 'adjustment'
  import_mode: ImportMode
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

export interface CostCentre {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface ContainerType {
  id: string
  name: string
  display_name: string
  description: string | null
  is_trackable: boolean
  sort_order: number
  created_at: string
}

export interface ReorderRule {
  id: string
  product_id: string
  location_id: string
  min_level: number
  max_level: number | null
  par_level: number | null
  lead_time_days: number
  auto_suggest: boolean
  preferred_supplier_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ReorderSuggestion {
  productId: string
  productName: string
  sku: string | null
  inventoryType: InventoryType
  currentStock: number
  minLevel: number
  maxLevel: number | null
  parLevel: number | null
  leadTimeDays: number
  dailyUsage: number
  suggestedQuantity: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
  preferredSupplierId: string | null
  preferredSupplierName: string | null
  estimatedDaysUntilStockout: number | null
}

export type DepletionUrgency = 'out_of_stock' | 'critical' | 'warning' | 'ok'

export interface DepletionForecastRow {
  productId: string
  productName: string
  sku: string | null
  barcode: string | null
  inventoryType: InventoryType
  currentBalance: number
  dailyUsage: number
  daysRemaining: number | null
  projectedStockoutDate: string | null
  minLevel: number
  leadTimeDays: number
  urgency: DepletionUrgency
}

export interface DayOfWeekPattern {
  dayOfWeek: number
  dayName: string
  totalQuantity: number
  sharePercent: number
  multiplier: number
}

export interface HourlyPattern {
  hour: number
  totalQuantity: number
}

export interface ConsumptionPattern {
  totalConsumed: number
  averagePerDay: number
  busiestDay: string
  peakHour: number
  daysAnalyzed: number
  dayOfWeek: DayOfWeekPattern[]
  hourly: HourlyPattern[]
}

export type InventoryAlertType = 'inventory_low_stock' | 'inventory_out_of_stock'

export interface InventoryNotification {
  id: string
  userId: string
  type: InventoryAlertType
  title: string
  message: string | null
  read: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export interface LowStockAlertResult {
  created: number
  resolved: number
}

export interface TrendPoint {
  date: string
  totalQuantity: number
}

export interface WasteHeatmapCell {
  type: string
  dayOfWeek: number
  totalQuantity: number
}

export interface WasteHeatmap {
  daysAnalyzed: number
  typeTotals: Array<{ type: string; totalQuantity: number }>
  cells: WasteHeatmapCell[]
}

export interface ValueTrendPoint {
  date: string
  stockValue: number
}

export interface PriceHistoryEntry {
  id: string
  product_id: string
  supplier_id: string | null
  unit_cost: number
  quantity: number | null
  transaction_id: string | null
  effective_date: string
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface DailySnapshot {
  id: string
  product_id: string
  location_id: string
  date: string
  inventory_type: InventoryType
  opening_qty: number
  sales_qty: number
  waste_qty: number
  adjustments_qty: number
  deliveries_qty: number
  transfers_qty: number
  closing_qty: number
  stock_value: number
  created_at: string
}

export interface MovementEvent {
  id: string
  transaction_type: TransactionType
  quantity: number
  reason_type: MovementReason | null
  reason_notes: string | null
  manager_note: string | null
  note_author: string | null
  cost_centre_name: string | null
  performed_by: string | null
  created_at: string
  reference_type: ReferenceType | null
  reference_id: string | null
  notes: string | null
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
  cost_centre_id?: string | null
  reason_type?: MovementReason | null
  reason_notes?: string | null
  manager_note?: string | null
  note_author?: string | null
  reference_type?: ReferenceType | null
  reference_id?: string | null
  performed_by?: string | null
  notes?: string | null
  import_batch_id?: string | null
  /** Reservation this SALE was posted for (consumeReservation, migration
   *  077). Nullable; only consumption txns carry it. */
  reservation_id?: string | null
}

export interface WasteSummaryRow {
  transaction_type: TransactionType
  count: number
  total_quantity: number
  estimated_value: number
}

export interface Recipe {
  id: string
  name: string
  description: string | null
  yield_quantity: number
  yield_uom_id: string | null
  category: string | null
  prep_time_minutes: number | null
  wastage_pct: number
  is_active: boolean
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  product_id: string
  quantity: number
  uom_id: string | null
  wastage_pct: number
  substitution_product_id: string | null
  sort_order: number
  notes: string | null
  product_name?: string
  uom_name?: string
}

export interface RecipeOutput {
  id: string
  recipe_id: string
  name: string
  quantity: number
  uom_id: string | null
  sort_order: number
  uom_name?: string
}

export interface RecipeDetail extends Recipe {
  ingredients: RecipeIngredient[]
  outputs: RecipeOutput[]
}

export type ProductionRunStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface ProductionRunItem {
  id: string
  production_run_id: string
  product_id: string
  direction: 'consumed' | 'produced'
  quantity: number
  transaction_id: string | null
  wastage_pct: number
  sort_order: number
  product_name?: string
}

export interface ProductionRun {
  id: string
  recipe_id: string
  location_id: string
  status: ProductionRunStatus
  quantity_planned: number
  quantity_completed: number | null
  cost_centre_id: string | null
  started_by: string | null
  started_at: string | null
  completed_by: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProductionRunDetail extends ProductionRun {
  recipe_name?: string
  items: ProductionRunItem[]
}

export type ChecklistStatus = 'in_progress' | 'completed' | 'skipped'
export type ChecklistItemStatus = 'pending' | 'completed' | 'skipped' | 'failed'

export interface ChecklistTemplate {
  id: string
  title: string
  description: string | null
  category: string
  sort_order: number
  is_required: boolean
  inventory_type: InventoryType | null
  is_active: boolean
  created_at: string
}

export interface ChecklistInstance {
  id: string
  location_id: string
  checklist_date: string
  status: ChecklistStatus
  opened_by: string | null
  opened_at: string
  completed_by: string | null
  completed_at: string | null
  manager_notes: string | null
}

export interface ChecklistItem {
  id: string
  instance_id: string
  template_id: string | null
  title: string
  description: string | null
  category: string
  sort_order: number
  is_required: boolean
  status: ChecklistItemStatus
  completed_by: string | null
  completed_at: string | null
  notes: string | null
}

export interface ParsedOrderItem {
  name: string
  quantity: number
  unit_price: number
  selected_size: string | null
  notes: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  item_name: string
  quantity: number
  unit_price: number
  selected_size: string | null
  notes: string | null
  product_id: string | null
  pour_size_ml: number | null
  base_quantity: number | null
  transaction_id: string | null
  matched_at: string | null
  deducted_at: string | null
  created_at: string
  inventory_products?: { id: string; name: string; sku: string | null } | null
}

export interface OrderItemDetail {
  order_id: string
  status: string
  items: OrderItem[]
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
