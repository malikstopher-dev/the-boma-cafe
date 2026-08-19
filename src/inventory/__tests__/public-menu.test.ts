import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import migrationManifest from '../../../scripts/menu-image-migration/manifest.json'
import {
  HOMEPAGE_MENU_ITEM_SELECT,
  mapPublicMenuPayload,
  PUBLIC_MENU_IMAGE_SELECT,
  PUBLIC_MENU_INLINE_IMAGE_FILTER,
  PUBLIC_MENU_ITEM_SELECT,
  resolvePublicMenuImage,
  sanitizePublicPayload,
  WAITER_MENU_ITEM_SELECT,
} from '@/lib/public-menu'

const migratedId = '286f0b05-bc0c-4678-b1f0-34147616efd6'

const category = {
  id: 'cat-1',
  name: 'Breakfast',
  description: 'Morning menu',
  order_index: 1,
  is_active: true,
  is_bar: false,
}

const item = {
  id: migratedId,
  category_id: 'cat-1',
  name: 'Boma Breakfast',
  description: 'Breakfast plate',
  price: '125.00',
  sizes: '[{"name":"Regular","price":"125"}]',
  add_ons: '[{"name":"Egg","price":"15"}]',
  options: '[{"name":"Toast"}]',
  is_available: true,
  is_featured: true,
  is_on_promo: false,
  promo_badge: null,
  order_index: 2,
  available_for_all_order_types: true,
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

describe('public menu projections', () => {
  it('never selects the image column with menu metadata', () => {
    expect(PUBLIC_MENU_ITEM_SELECT.split(',')).not.toContain('image')
    expect(HOMEPAGE_MENU_ITEM_SELECT.split(',')).not.toContain('image')
    expect(WAITER_MENU_ITEM_SELECT.split(',')).not.toContain('image')
    expect(PUBLIC_MENU_IMAGE_SELECT).toBe('id,image')
    expect(PUBLIC_MENU_INLINE_IMAGE_FILTER).toBe('%data:%')
  })

  it('maps the full public menu without emitting inline image data', () => {
    const payload = mapPublicMenuPayload('menu', [category], [item], [
      { id: migratedId, image: 'data:image/png;base64,do-not-emit' },
    ]) as { categories: unknown[]; menuItems: Array<Record<string, unknown>> }

    expect(payload.categories).toHaveLength(1)
    expect(payload.menuItems).toHaveLength(1)
    expect(payload.menuItems[0]?.image).toBe('/menu/migrated/boma-breakfast-286f0b05.webp')
    expect(payload.menuItems[0]?.sizes).toEqual([{ name: 'Regular', price: 125 }])
    expect(payload.menuItems[0]?.addOns).toEqual([{ name: 'Egg', price: 15 }])
    expect(JSON.stringify(payload)).not.toContain('data:')
  })

  it('returns only homepage fields and resolves the migrated image', () => {
    const payload = mapPublicMenuPayload('homepage', [], [item]) as {
      menuItems: Array<Record<string, unknown>>
    }
    expect(Object.keys(payload.menuItems[0] ?? {}).sort()).toEqual([
      'description', 'id', 'image', 'isAvailable', 'isFeatured', 'name', 'price',
    ])
    expect(payload.menuItems[0]?.image).toBe('/menu/migrated/boma-breakfast-286f0b05.webp')
  })

  it('returns waiter fields without image or customization payloads', () => {
    const payload = mapPublicMenuPayload('waiter', [category], [item]) as {
      menuItems: Array<Record<string, unknown>>
    }
    expect(Object.keys(payload.menuItems[0] ?? {}).sort()).toEqual([
      'categoryId', 'description', 'id', 'isAvailable', 'name', 'order', 'price',
    ])
    expect(payload.menuItems[0]).not.toHaveProperty('image')
    expect(payload.menuItems[0]).not.toHaveProperty('sizes')
    expect(payload.menuItems[0]).not.toHaveProperty('addOns')
    expect(payload.menuItems[0]).not.toHaveProperty('options')
  })

  it('strips future nested data URIs as a final response guard', () => {
    const result = sanitizePublicPayload({ image: ' DATA:image/png;base64,abc', nested: ['ok', 'data:text/plain;base64,YQ=='] })
    expect(result).toEqual({ image: null, nested: ['ok', null] })
  })

  it('fails closed for an unknown inline image and preserves normal URLs', () => {
    expect(resolvePublicMenuImage('unknown', 'data:image/png;base64,abc')).toBeNull()
    expect(resolvePublicMenuImage('unknown', 'https://images.example.com/item.jpg')).toBe('https://images.example.com/item.jpg')
  })

  it('has a deterministic six-image manifest with valid optimized and rollback files', () => {
    expect(migrationManifest.productionMutationPerformed).toBe(false)
    expect(migrationManifest.entries).toHaveLength(6)
    expect(new Set(migrationManifest.entries.map(entry => entry.menuItemId)).size).toBe(6)

    for (const entry of migrationManifest.entries) {
      const optimizedPath = resolve(process.cwd(), entry.proposedImage.sourceFile)
      const originalPath = resolve(process.cwd(), entry.rollback.originalFile)
      expect(existsSync(optimizedPath)).toBe(true)
      expect(existsSync(originalPath)).toBe(true)
      expect(sha256(readFileSync(optimizedPath))).toBe(entry.proposedImage.sha256)
      expect(sha256(readFileSync(originalPath))).toBe(entry.currentImage.binarySha256)
      expect(entry.proposedImage.finalPath).toMatch(/^\/menu\/migrated\/.+\.webp$/)
      expect(entry.currentImage.valueType).toBe('data-uri')
    }
  })
})
