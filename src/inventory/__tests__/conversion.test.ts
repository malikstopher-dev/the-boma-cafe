import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConversionNotFoundError } from '../lib/errors'

const mockClient = {
  from: vi.fn(),
}

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

import { convertQuantity, getGlobalConversion, getProductConversion } from '../engine/conversion'

function res<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

function singleReturn(data: unknown) {
  return vi.fn(() => res(data))
}

function maybeSingleReturn(data: unknown) {
  return vi.fn(() => res(data))
}

function selectSingle(selectColumns: string, data: unknown) {
  return vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: singleReturn(data),
      })),
    })),
  }))
}

function selectMaybeSingle(selectColumns: string, data: unknown) {
  return vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: maybeSingleReturn(data),
      })),
    })),
  }))
}

function selectMaybeGlobal(data: unknown) {
  return vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: maybeSingleReturn(data),
      })),
    })),
  }))
}

describe('conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getGlobalConversion', () => {
    it('should return factor for direct conversion', async () => {
      mockClient.from.mockReturnValue({
        select: selectMaybeGlobal({ factor: 12 }),
      })

      const factor = await getGlobalConversion('uom-case', 'uom-bottle')
      expect(factor).toBe(12)
    })

    it('should return inverted factor for reverse lookup', async () => {
      const qbNoResult = { select: selectMaybeGlobal(null) }
      const qbResult = { select: selectMaybeGlobal({ factor: 12 }) }
      mockClient.from
        .mockReturnValueOnce(qbNoResult)
        .mockReturnValueOnce(qbResult)

      const factor = await getGlobalConversion('uom-bottle', 'uom-case')
      expect(factor).toBeCloseTo(0.083333, 4)
    })

    it('should return null when no conversion found', async () => {
      const qbNoResult = { select: selectMaybeGlobal(null) }
      mockClient.from
        .mockReturnValueOnce(qbNoResult)
        .mockReturnValueOnce(qbNoResult)

      const factor = await getGlobalConversion('uom-unknown', 'uom-other')
      expect(factor).toBeNull()
    })
  })

  describe('getProductConversion', () => {
    it('should return 1 when UOM matches base UOM', async () => {
      mockClient.from.mockReturnValue({
        select: selectSingle('uom_id, conversion_factor', { uom_id: 'uom-bottle' }),
      })

      const factor = await getProductConversion('prod-1', 'uom-bottle')
      expect(factor).toBe(1)
    })

    it('should return conversion factor for non-base UOM', async () => {
      mockClient.from
        .mockReturnValueOnce({
          select: selectSingle('uom_id, conversion_factor', { uom_id: 'uom-bottle' }),
        })
        .mockReturnValueOnce({
          select: selectMaybeSingle('conversion_factor', { conversion_factor: 30 }),
        })

      const factor = await getProductConversion('prod-1', 'uom-tot')
      expect(factor).toBe(30)
    })

    it('should return null when base UOM lookup fails', async () => {
      mockClient.from.mockReturnValue({
        select: selectSingle('uom_id, conversion_factor', null),
      })

      const factor = await getProductConversion('prod-nonexistent', 'uom-tot')
      expect(factor).toBeNull()
    })
  })

  describe('convertQuantity', () => {
    it('should return same quantity when UOMs match', async () => {
      const result = await convertQuantity(10, 'uom-bottle', 'uom-bottle', 'prod-1')
      expect(result).toBe(10)
    })

    it('should use product-specific conversion', async () => {
      mockClient.from
        .mockReturnValueOnce({
          select: selectSingle('uom_id, conversion_factor', { uom_id: 'uom-bottle' }),
        })
        .mockReturnValueOnce({
          select: selectSingle('uom_id, conversion_factor', { uom_id: 'uom-bottle' }),
        })
        .mockReturnValueOnce({
          select: selectMaybeSingle('conversion_factor', { conversion_factor: 0.5 }),
        })

      const result = await convertQuantity(2, 'uom-bottle', 'uom-tot', 'prod-1')
      expect(result).toBe(4)
    })

    it('should use global conversion when no product-specific path exists', async () => {
      mockClient.from
        .mockReturnValueOnce({
          select: selectSingle('uom_id, conversion_factor', null),
        })
        .mockReturnValueOnce({
          select: selectMaybeGlobal({ factor: 4 }),
        })

      const result = await convertQuantity(3, 'uom-bottle', 'uom-case', 'prod-1')
      expect(result).toBe(12)
    })

    it('should throw ConversionNotFoundError when no path exists', async () => {
      mockClient.from
        .mockReturnValueOnce({
          select: selectSingle('uom_id, conversion_factor', null),
        })
        .mockReturnValueOnce({
          select: selectMaybeGlobal(null),
        })
        .mockReturnValueOnce({
          select: selectMaybeGlobal(null),
        })

      await expect(
        convertQuantity(1, 'uom-bottle', 'uom-tot', 'prod-nonexistent'),
      ).rejects.toThrow(ConversionNotFoundError)
    })
  })
})
