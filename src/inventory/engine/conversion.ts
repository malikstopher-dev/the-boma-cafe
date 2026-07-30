import { ConversionNotFoundError } from '../lib/errors'
import { getInventoryClient } from '../lib/db'

export async function getGlobalConversion(fromUomId: string, toUomId: string): Promise<number | null> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_uom_conversions_global')
    .select('factor')
    .eq('from_uom_id', fromUomId)
    .eq('to_uom_id', toUomId)
    .maybeSingle()

  if (data) return Number(data.factor)

  const { data: reverse } = await supabase
    .from('inventory_uom_conversions_global')
    .select('factor')
    .eq('from_uom_id', toUomId)
    .eq('to_uom_id', fromUomId)
    .maybeSingle()

  if (reverse) return 1 / Number(reverse.factor)

  return null
}

export async function getProductConversion(productId: string, uomId: string): Promise<number | null> {
  const supabase = getInventoryClient()

  const { data: baseUom } = await supabase
    .from('inventory_product_uoms')
    .select('uom_id, conversion_factor')
    .eq('product_id', productId)
    .eq('is_base', true)
    .single()

  if (!baseUom) return null
  if (baseUom.uom_id === uomId) return 1

  const { data: productUom } = await supabase
    .from('inventory_product_uoms')
    .select('conversion_factor')
    .eq('product_id', productId)
    .eq('uom_id', uomId)
    .maybeSingle()

  if (productUom) return productUom.conversion_factor

  return null
}

export async function convertQuantity(
  quantity: number,
  fromUomId: string,
  toUomId: string,
  productId: string,
): Promise<number> {
  if (fromUomId === toUomId) return quantity

  const productFactor = await getProductConversion(productId, fromUomId)
  if (productFactor !== null) {
    const targetFactor = await getProductConversion(productId, toUomId)
    if (targetFactor !== null && targetFactor !== 0) {
      return (quantity * productFactor) / targetFactor
    }
  }

  const globalFactor = await getGlobalConversion(fromUomId, toUomId)
  if (globalFactor !== null) return quantity * globalFactor

  throw new ConversionNotFoundError(fromUomId, toUomId, productId)
}

export async function toBaseUnit(
  quantity: number,
  uomId: string,
  productId: string,
): Promise<number> {
  const supabase = getInventoryClient()

  const { data: baseUom } = await supabase
    .from('inventory_product_uoms')
    .select('uom_id')
    .eq('product_id', productId)
    .eq('is_base', true)
    .single()

  if (!baseUom) throw new ConversionNotFoundError('', '', productId)

  return convertQuantity(quantity, uomId, baseUom.uom_id, productId)
}

export async function toDisplayUnit(
  baseQuantity: number,
  productId: string,
): Promise<number> {
  const supabase = getInventoryClient()

  const { data: displayUom } = await supabase
    .from('inventory_product_uoms')
    .select('uom_id, conversion_factor')
    .eq('product_id', productId)
    .eq('is_display', true)
    .single()

  if (!displayUom) throw new ConversionNotFoundError('', '', productId)

  return baseQuantity / Number(displayUom.conversion_factor)
}
