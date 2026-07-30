import type { ParsedRow, ProductMatch, MatchSource } from './ImportTypes'
import { getInventoryClient } from '../lib/db'

export class ProductMatcher {
  async match(rows: ParsedRow[], supplierId?: string | null): Promise<ProductMatch[]> {
    const supabase = getInventoryClient()
    const results: ProductMatch[] = []

    for (const row of rows) {
      const match = await this.matchSingle(row, supplierId ?? null, supabase)
      results.push(match)
    }

    return results
  }

  private async matchSingle(
    row: ParsedRow,
    supplierId: string | null,
    supabase: ReturnType<typeof getInventoryClient>,
  ): Promise<ProductMatch> {
    if (!row.productName) {
      return {
        rowIndex: row.rowIndex,
        productId: null,
        productName: null,
        confidence: 0,
        matchSource: 'none',
        suggestedAction: 'skip',
      }
    }

    // Priority 1: Supplier SKU match
    if (row.supplierSku) {
      const { data: skuMatch } = await supabase
        .from('inventory_products')
        .select('id, name')
        .eq('supplier_code', row.supplierSku)
        .maybeSingle()
      if (skuMatch) {
        return {
          rowIndex: row.rowIndex,
          productId: skuMatch.id,
          productName: skuMatch.name,
          confidence: 1.0,
          matchSource: 'supplier_sku',
          suggestedAction: 'apply',
        }
      }
    }

    // Priority 2: Exact product name match
    const normalized = row.productName.trim().toLowerCase()
    const { data: exactMatch } = await supabase
      .from('inventory_products')
      .select('id, name')
      .ilike('name', normalized)
      .maybeSingle()
    if (exactMatch) {
      return {
        rowIndex: row.rowIndex,
        productId: exactMatch.id,
        productName: exactMatch.name,
        confidence: 0.95,
        matchSource: 'exact_name',
        suggestedAction: 'apply',
      }
    }

    // Priority 3: Name + bottle size
    if (row.bottleSizeMl && row.productName) {
      const baseName = normalized.replace(/\d+\s*ml/i, '').trim()
      const { data: sizeMatch } = await supabase
        .from('inventory_products')
        .select('id, name')
        .ilike('name', `%${baseName}%`)
        .maybeSingle()
      if (sizeMatch) {
        return {
          rowIndex: row.rowIndex,
          productId: sizeMatch.id,
          productName: sizeMatch.name,
          confidence: 0.85,
          matchSource: 'name_and_size',
          suggestedAction: 'apply',
        }
      }
    }

    // Priority 4: Saved mapping
    if (supplierId) {
      const { data: savedMapping } = await supabase
        .from('inventory_import_mappings')
        .select('matched_product_id, confidence')
        .eq('supplier_id', supplierId)
        .eq('supplier_product_name', row.productName.trim())
        .maybeSingle()
      if (savedMapping?.matched_product_id) {
        const { data: mappedProduct } = await supabase
          .from('inventory_products')
          .select('id, name')
          .eq('id', savedMapping.matched_product_id)
          .maybeSingle()
        if (mappedProduct) {
          return {
            rowIndex: row.rowIndex,
            productId: mappedProduct.id,
            productName: mappedProduct.name,
            confidence: (savedMapping.confidence ?? 0.9) as number,
            matchSource: 'saved_mapping',
            suggestedAction: 'apply',
          }
        }
      }
    }

    // Priority 5: Fuzzy match
    const sanitized = normalized.replace(/[^a-z0-9\s]/g, '').trim()
    if (sanitized.length >= 3) {
      const { data: fuzzyMatches } = await supabase
        .from('inventory_products')
        .select('id, name')
        .ilike('name', `%${sanitized}%`)
        .limit(5)

      if (fuzzyMatches && fuzzyMatches.length > 0) {
        const bestMatch = this.bestFuzzyMatch(sanitized, fuzzyMatches)
        if (bestMatch) {
          return {
            rowIndex: row.rowIndex,
            productId: bestMatch.id,
            productName: bestMatch.name,
            confidence: 0.6,
            matchSource: 'fuzzy',
            suggestedAction: 'apply',
          }
        }
      }
    }

    // No match
    return {
      rowIndex: row.rowIndex,
      productId: null,
      productName: row.productName,
      confidence: 0,
      matchSource: 'none',
      suggestedAction: 'create_product',
    }
  }

  private bestFuzzyMatch(
    searchTerm: string,
    candidates: { id: string; name: string }[],
  ): { id: string; name: string } | null {
    let bestScore = 0
    let best: { id: string; name: string } | null = null

    for (const candidate of candidates) {
      const score = this.similarity(searchTerm, candidate.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim())
      if (score > bestScore && score >= 0.5) {
        bestScore = score
        best = candidate
      }
    }

    return best
  }

  private similarity(a: string, b: string): number {
    const longer = a.length >= b.length ? a : b
    const shorter = a.length >= b.length ? b : a
    if (longer.length === 0) return 1.0

    const editDist = this.levenshtein(shorter, longer)
    return 1.0 - editDist / longer.length
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = []
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0]![j] = j
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]!,
            matrix[i]![j - 1]!,
            matrix[i - 1]![j]!,
          )
        }
      }
    }
    return matrix[b.length]![a.length]!
  }
}
