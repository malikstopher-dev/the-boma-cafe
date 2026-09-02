export class InsufficientStockError extends Error {
  public readonly productId: string
  public readonly locationId: string
  public readonly requested: number
  public readonly available: number

  constructor(productId: string, locationId: string, requested: number, available: number) {
    super(`Insufficient stock for product ${productId} at location ${locationId}: requested ${requested}, available ${available}`)
    this.name = 'InsufficientStockError'
    this.productId = productId
    this.locationId = locationId
    this.requested = requested
    this.available = available
  }
}

export class ConversionNotFoundError extends Error {
  public readonly fromUomId: string
  public readonly toUomId: string
  public readonly productId?: string

  constructor(fromUomId: string, toUomId: string, productId?: string) {
    const msg = productId
      ? `No conversion path from UOM ${fromUomId} to ${toUomId} for product ${productId}`
      : `No conversion path from UOM ${fromUomId} to ${toUomId}`
    super(msg)
    this.name = 'ConversionNotFoundError'
    this.fromUomId = fromUomId
    this.toUomId = toUomId
    this.productId = productId
  }
}

export class ProductNotFoundError extends Error {
  public readonly productId: string

  constructor(productId: string) {
    super(`Product not found: ${productId}`)
    this.name = 'ProductNotFoundError'
    this.productId = productId
  }
}

export class LocationNotFoundError extends Error {
  public readonly locationId: string

  constructor(locationId: string) {
    super(`Location not found: ${locationId}`)
    this.name = 'LocationNotFoundError'
    this.locationId = locationId
  }
}

export class ValidationError extends Error {
  public readonly details: Record<string, unknown>

  constructor(message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ValidationError'
    this.details = details ?? {}
  }
}

export class InactiveProductError extends ValidationError {
  public readonly productId: string

  constructor(productId: string) {
    super(`Product is not active: ${productId}`, { productId })
    this.name = 'InactiveProductError'
    this.productId = productId
  }
}

export class ProductUomNotLinkedError extends ValidationError {
  public readonly productId: string
  public readonly uomId: string

  constructor(productId: string, uomId: string) {
    super(`UOM ${uomId} is not linked to product ${productId}`, { productId, uomId })
    this.name = 'ProductUomNotLinkedError'
    this.productId = productId
    this.uomId = uomId
  }
}

export class WasteValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WasteValidationError'
  }
}

export class MissingCostCentreError extends Error {
  public readonly locationId: string

  constructor(locationId: string) {
    super(`No cost centre could be determined for location ${locationId}. Assign a cost centre to this location before recording stock movements.`)
    this.name = 'MissingCostCentreError'
    this.locationId = locationId
  }
}

export class InvalidCostCentreError extends Error {
  public readonly costCentreId: string

  constructor(costCentreId: string) {
    super(`Cost centre ${costCentreId} does not exist or is not active`)
    this.name = 'InvalidCostCentreError'
    this.costCentreId = costCentreId
  }
}
