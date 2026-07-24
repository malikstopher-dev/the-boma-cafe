import { z } from 'zod'

export const bookingFormSchema = z.object({
  booking_type_id: z.string().uuid('Please select a booking type'),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  duration_hours: z.number().min(1, 'Minimum 1 hour').max(12, 'Maximum 12 hours'),
  adults: z.number().int().min(1, 'At least 1 adult required').max(500, 'Maximum 500 adults'),
  children: z.number().int().min(0).max(200, 'Maximum 200 children'),
  venue_area_id: z.string().uuid('Please select a venue area'),
  food_package_id: z.string().uuid().nullable().optional(),
  drink_package_id: z.string().uuid().nullable().optional(),
  addons: z.array(z.object({
    id: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
  })).default([]),
  name: z.string().min(2, 'Name is required').max(100),
  phone: z.string().min(10, 'Valid phone number required').max(20),
  email: z.string().email('Valid email required'),
  company: z.string().max(100).optional().default(''),
  special_requests: z.string().max(1000).optional().default(''),
})

export type BookingFormData = z.infer<typeof bookingFormSchema>

export const quoteAcceptSchema = z.object({
  quote_id: z.string().uuid(),
  accept_terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
})

export type QuoteAcceptData = z.infer<typeof quoteAcceptSchema>

export const pricingUpdateSchema = z.object({
  entity_type: z.enum(['venue_areas', 'food_packages', 'drink_packages', 'addons']),
  entity_id: z.string().uuid(),
  field: z.string().min(1),
  value: z.union([z.number(), z.string()]),
})

export const statusUpdateSchema = z.object({
  booking_id: z.string().uuid(),
  new_status: z.enum([
    'draft', 'quote_sent', 'awaiting_deposit', 'deposit_paid',
    'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded',
  ]),
  reason: z.string().max(500).optional(),
})

export const blockedDateSchema = z.object({
  venue_area_id: z.string().uuid().nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
  is_recurring: z.boolean().default(false),
  recurring_pattern: z.string().optional(),
})