'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency } from '@/lib/booking/utils'

interface BookingConfig {
  booking_types: any[]
  venues: any[]
  venue_areas: any[]
  food_packages: any[]
  drink_packages: any[]
  addon_categories: any[]
  addons: any[]
  settings: Record<string, string>
}

interface WizardState {
  booking_type_id: string
  booking_date: string
  booking_time: string
  duration_hours: number
  adults: number
  children: number
  venue_area_id: string
  food_package_id: string
  drink_package_id: string
  addon_selections: Record<string, number>
  name: string
  phone: string
  email: string
  company: string
  special_requests: string
}

interface QuotationLine {
  label: string
  description: string | null
  quantity: number
  unit_price: number
  total: number
}

interface QuotationResult {
  line_items: QuotationLine[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  deposit_percentage: number
  deposit_amount: number
  balance_amount: number
}

const STEPS = [
  'Booking Type',
  'Date & Time',
  'Guests',
  'Venue Area',
  'Food Package',
  'Drinks Package',
  'Add-ons',
  'Your Details',
  'Review & Confirm',
]

const INITIAL_STATE: WizardState = {
  booking_type_id: '',
  booking_date: '',
  booking_time: '',
  duration_hours: 3,
  adults: 2,
  children: 0,
  venue_area_id: '',
  food_package_id: '',
  drink_package_id: '',
  addon_selections: {},
  name: '',
  phone: '',
  email: '',
  company: '',
  special_requests: '',
}

export default function BookingWizard() {
  const [config, setConfig] = useState<BookingConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState('')
  const [wizard, setWizard] = useState<WizardState>(INITIAL_STATE)
  const [step, setStep] = useState(0)
  const [quotation, setQuotation] = useState<QuotationResult | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    booking_id: string
    quote_id: string
    quote_number: string
    quotation: QuotationResult
  } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [availability, setAvailability] = useState<{
    slots: Array<{ venue_area_id: string; venue_area_name: string; is_available: boolean; capacity_max: number }>
  } | null>(null)
  const [availLoading, setAvailLoading] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)

  // Load config
  useEffect(() => {
    fetch('/api/booking/config')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        if (!data.settings?.enabled || data.settings.enabled === 'false') {
          setConfigError('Online booking is currently disabled')
        }
      })
      .catch(() => setConfigError('Failed to load booking configuration'))
      .finally(() => setConfigLoading(false))
  }, [])

  // Responsive detection
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 860px)')
    const handleChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches)
    setIsNarrow(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const update = useCallback((partial: Partial<WizardState>) => {
    setWizard(prev => ({ ...prev, ...partial }))
  }, [])

  // Check availability when date/time/venue area changes
  useEffect(() => {
    if (wizard.booking_date && wizard.booking_time && (wizard.adults + wizard.children) > 0) {
      setAvailLoading(true)
      const endTime = calcEndTime(wizard.booking_time, wizard.duration_hours)
      const params = new URLSearchParams({
        date: wizard.booking_date,
        start_time: wizard.booking_time,
        end_time: endTime,
        guests: String(wizard.adults + wizard.children),
      })
      if (wizard.venue_area_id) params.set('venue_area_id', wizard.venue_area_id)

      fetch(`/api/booking/availability?${params}`)
        .then(r => r.json())
        .then(data => setAvailability(data))
        .catch(() => setAvailability(null))
        .finally(() => setAvailLoading(false))
    }
  }, [wizard.booking_date, wizard.booking_time, wizard.duration_hours, wizard.adults, wizard.children, wizard.venue_area_id])

  // Calculate quotation when selections change (steps 5+)
  const enoughForQuote = useMemo(() => {
    return wizard.booking_date && wizard.booking_time && wizard.venue_area_id &&
      wizard.adults > 0 && wizard.booking_type_id
  }, [wizard])

  useEffect(() => {
    if (!enoughForQuote) return
    const timer = setTimeout(async () => {
      setQuoteLoading(true)
      try {
        const addons = Object.entries(wizard.addon_selections)
          .filter(([, qty]) => qty > 0)
          .map(([id, quantity]) => ({ id, quantity }))

        const res = await fetch('/api/booking/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venue_area_id: wizard.venue_area_id,
            food_package_id: wizard.food_package_id || null,
            drink_package_id: wizard.drink_package_id || null,
            addons,
            adults: wizard.adults,
            children: wizard.children,
            booking_date: wizard.booking_date,
            duration_hours: wizard.duration_hours,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setQuotation(data)
        }
      } catch {
        // Silent fail for live preview
      } finally {
        setQuoteLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [enoughForQuote, wizard.booking_date, wizard.booking_time, wizard.venue_area_id,
    wizard.adults, wizard.children, wizard.food_package_id, wizard.drink_package_id,
    wizard.addon_selections, wizard.duration_hours])

  const validateCurrentStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 0 && !wizard.booking_type_id) newErrors.booking_type = 'Select a booking type'
    if (step === 1) {
      if (!wizard.booking_date) newErrors.booking_date = 'Select a date'
      if (!wizard.booking_time) newErrors.booking_time = 'Select a time'
      if (wizard.duration_hours < 1) newErrors.duration = 'Minimum 1 hour'
    }
    if (step === 2) {
      if (wizard.adults < 1) newErrors.adults = 'At least 1 adult'
      if (wizard.children < 0) newErrors.children = 'Invalid children count'
    }
    if (step === 3 && !wizard.venue_area_id) newErrors.venue_area = 'Select a venue area'
    if (step === 7) {
      if (!wizard.name.trim()) newErrors.name = 'Name is required'
      if (!wizard.phone.trim()) newErrors.phone = 'Phone is required'
      if (!wizard.email.trim()) newErrors.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizard.email)) newErrors.email = 'Invalid email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [step, wizard])

  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      if (step < STEPS.length - 1) {
        setStep(st => st + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [step, validateCurrentStep])

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep(st => st - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step])

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) return
    setSubmitting(true)
    try {
      const addons = Object.entries(wizard.addon_selections)
        .filter(([, qty]) => qty > 0)
        .map(([id, quantity]) => ({ id, quantity }))

      const res = await fetch('/api/booking/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...wizard,
          addons,
          food_package_id: wizard.food_package_id || null,
          drink_package_id: wizard.drink_package_id || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrors({ submit: data.error || 'Failed to submit booking' })
        return
      }

      setSubmitResult(data)
      setSubmitted(true)
    } catch {
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }, [wizard, validateCurrentStep])

  if (configLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ color: 'var(--text-light)' }}>Loading booking system...</p>
          </div>
        </div>
      </div>
    )
  }

  if (configError) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--heading)', marginBottom: '0.5rem' }}>Book Your Event</h1>
            <p style={{ color: 'var(--muted)' }}>{configError}</p>
          </div>
        </div>
      </div>
    )
  }

  if (submitted && submitResult) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              maxWidth: 640, margin: '0 auto', padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #A65A1F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem', fontSize: '2.5rem', color: '#fff',
            }}>
              ✓
            </div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--heading)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              Quotation Sent!
            </h1>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Reference: <strong>{submitResult.quote_number}</strong>
            </p>
            <p style={{ color: 'var(--body)', marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>
              We&apos;ll review your booking and be in touch within 24 hours. A copy has been sent to {wizard.email}.
            </p>
            <div style={{
              background: 'var(--beige)', borderRadius: '16px', padding: '1.5rem',
              marginBottom: '2rem', textAlign: 'left',
            }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--heading)', marginBottom: '1rem' }}>Estimated Total</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--body)' }}>Total</span>
                <strong>{formatCurrency(submitResult.quotation.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--body)' }}>Deposit Required (30%)</span>
                <strong style={{ color: 'var(--primary)' }}>{formatCurrency(submitResult.quotation.deposit_amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--body)' }}>Balance</span>
                <strong>{formatCurrency(submitResult.quotation.balance_amount)}</strong>
              </div>
            </div>
            <button
              onClick={() => { setStep(0); setWizard(INITIAL_STATE); setSubmitted(false); setSubmitResult(null); setQuotation(null) }}
              style={{
                padding: '0.9rem 2rem', borderRadius: '12px', border: '2px solid var(--primary)',
                background: 'transparent', color: 'var(--primary)', fontWeight: 600,
                cursor: 'pointer', fontSize: '0.95rem',
              }}
            >
              Book Another Event
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={{ textAlign: 'center', padding: '3rem 1rem 1rem' }}>
        <h1 style={{ fontSize: isNarrow ? '1.8rem' : '2.5rem', color: 'var(--heading)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          Book Your Event
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 500, margin: '0 auto' }}>
          Complete the steps below to receive an instant quotation for your event at The Boma Café.
        </p>
      </div>

      <div style={{ ...styles.container, padding: isNarrow ? '0 0.75rem' : '0 1rem' }}>
        {/* Progress Bar */}
        <div style={styles.progressBar}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: i <= step ? 'var(--primary)' : 'var(--beige-dark)',
                color: i <= step ? '#fff' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 600, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 8px',
                  background: i < step ? 'var(--primary)' : 'var(--beige-dark)',
                }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ ...styles.wizardRow, flexDirection: isNarrow ? 'column' : 'row' }}>
          {/* Main content */}
          <div style={{ ...styles.mainContent, ...(isNarrow ? { width: '100%', maxWidth: '100%' } : {}) }}>
            <div style={{
              background: '#fff', borderRadius: '20px', padding: isNarrow ? '1.25rem' : '2rem',
              boxShadow: 'var(--shadow-md)', minHeight: 400, maxWidth: '100%', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.3rem', color: 'var(--heading)', fontFamily: 'var(--font-display)' }}>
                  {STEPS[step]}
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Step {step + 1} of {STEPS.length}</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {step === 0 && renderStep0()}
                  {step === 1 && renderStep1()}
                  {step === 2 && renderStep2()}
                  {step === 3 && renderStep3()}
                  {step === 4 && renderStep4()}
                  {step === 5 && renderStep5()}
                  {step === 6 && renderStep6()}
                  {step === 7 && renderStep7()}
                  {step === 8 && renderStep8()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              {step < STEPS.length - 1 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--beige-dark)', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleBack}
                    disabled={step === 0}
                    style={{
                      ...styles.navBtn,
                      visibility: step === 0 ? 'hidden' : 'visible',
                      flex: isNarrow ? 1 : undefined,
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      ...styles.navBtn,
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      flex: isNarrow ? 1 : undefined,
                    }}
                    disabled={step === 2 && availability && wizard.venue_area_id
                      ? !availability.slots.find(s => s.venue_area_id === wizard.venue_area_id)?.is_available
                      : false}
                  >
                    Continue →
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--beige-dark)', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button onClick={handleBack} style={{ ...styles.navBtn, flex: isNarrow ? 1 : undefined }}>← Back</button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      ...styles.navBtn,
                      background: 'linear-gradient(135deg, var(--primary), #A65A1F)',
                      color: '#fff',
                      border: 'none',
                      opacity: submitting ? 0.7 : 1,
                      flex: isNarrow ? 1 : undefined,
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Confirm Booking'}
                  </button>
                </div>
              )}

              {errors.submit && (
                <p style={{ color: 'var(--red)', marginTop: '1rem', fontSize: '0.9rem' }}>{errors.submit}</p>
              )}
            </div>
          </div>

          {/* Quotation Sidebar */}
          {enoughForQuote && step >= 3 && (
            <div style={{
              ...styles.quotationSidebar,
              ...(isNarrow ? { width: '100%', marginTop: '1rem', maxWidth: '100%' } : {}),
            }}>
              <div style={{
                background: '#fff', borderRadius: '20px', padding: '1.5rem',
                boxShadow: 'var(--shadow-md)', position: 'sticky', top: '1rem',
              }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--heading)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                  Your Quotation
                </h3>
                {quoteLoading ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Calculating...</p>
                ) : quotation ? (
                  <>
                    {quotation.line_items.filter(i => i.total > 0).map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '0.5rem 0', fontSize: '0.85rem',
                        borderBottom: idx < quotation.line_items.length - 1 ? '1px solid var(--beige)' : 'none',
                      }}>
                        <span style={{ color: 'var(--body)', flex: 1 }}>{item.label}</span>
                        <strong style={{ color: 'var(--heading)', marginLeft: '1rem' }}>{formatCurrency(item.total)}</strong>
                      </div>
                    ))}
                    <div style={{ borderTop: '2px solid var(--beige-dark)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--body)' }}>Subtotal</span>
                        <strong>{formatCurrency(quotation.subtotal)}</strong>
                      </div>
                      {quotation.tax_amount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          <span style={{ color: 'var(--body)' }}>Tax ({quotation.tax_rate}%)</span>
                          <strong>{formatCurrency(quotation.tax_amount)}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                        <span style={{ color: 'var(--heading)', fontWeight: 600 }}>Total</span>
                        <strong style={{ color: 'var(--primary)' }}>{formatCurrency(quotation.total)}</strong>
                      </div>
                      <div style={{
                        background: 'var(--beige)', borderRadius: '12px', padding: '0.75rem',
                        marginTop: '0.75rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--body)' }}>Deposit (30%)</span>
                          <strong style={{ color: 'var(--primary)' }}>{formatCurrency(quotation.deposit_amount)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          <span style={{ color: 'var(--body)' }}>Balance</span>
                          <strong>{formatCurrency(quotation.balance_amount)}</strong>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Select your options to see a live quotation.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // --- Step Renders ---

  function renderStep0() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
        {(config?.booking_types || []).map((bt: any) => (
          <button
            key={bt.id}
            onClick={() => { update({ booking_type_id: bt.id }); setErrors({}) }}
            style={{
              ...styles.cardOption,
              borderColor: wizard.booking_type_id === bt.id ? 'var(--primary)' : 'transparent',
              boxShadow: wizard.booking_type_id === bt.id ? '0 0 0 2px var(--primary)' : 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontSize: '2rem' }}>{bt.icon || '📅'}</span>
            <strong style={{ display: 'block', marginTop: '0.5rem', color: 'var(--heading)' }}>{bt.name}</strong>
            {bt.description && (
              <small style={{ color: 'var(--muted)', marginTop: '0.25rem', display: 'block' }}>{bt.description}</small>
            )}
          </button>
        ))}
        {errors.booking_type && <p style={{ color: 'var(--red)', gridColumn: '1 / -1' }}>{errors.booking_type}</p>}
      </div>
    )
  }

  function renderStep1() {
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={styles.label}>Event Date</label>
            <input
              type="date"
              value={wizard.booking_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => update({ booking_date: e.target.value })}
              style={{ ...styles.input, borderColor: errors.booking_date ? 'var(--red)' : 'transparent' }}
            />
            {errors.booking_date && <span style={styles.error}>{errors.booking_date}</span>}
          </div>
          <div>
            <label style={styles.label}>Arrival Time</label>
            <input
              type="time"
              value={wizard.booking_time}
              onChange={e => update({ booking_time: e.target.value })}
              style={{ ...styles.input, borderColor: errors.booking_time ? 'var(--red)' : 'transparent' }}
            />
            {errors.booking_time && <span style={styles.error}>{errors.booking_time}</span>}
          </div>
        </div>
        <div>
          <label style={styles.label}>Estimated Duration (hours)</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={wizard.duration_hours}
              onChange={e => update({ duration_hours: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 60, fontWeight: 600, color: 'var(--heading)' }}>
              {wizard.duration_hours}h
            </span>
          </div>
          {errors.duration && <span style={styles.error}>{errors.duration}</span>}
        </div>
      </div>
    )
  }

  function renderStep2() {
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div>
          <label style={styles.label}>Number of Adults</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => update({ adults: Math.max(1, wizard.adults - 1) })} style={styles.qtyBtn}>−</button>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--heading)', minWidth: 60, textAlign: 'center' }}>
              {wizard.adults}
            </span>
            <button onClick={() => update({ adults: Math.min(500, wizard.adults + 1) })} style={styles.qtyBtn}>+</button>
          </div>
          {errors.adults && <span style={styles.error}>{errors.adults}</span>}
        </div>
        <div>
          <label style={styles.label}>Number of Children</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => update({ children: Math.max(0, wizard.children - 1) })} style={styles.qtyBtn}>−</button>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--heading)', minWidth: 60, textAlign: 'center' }}>
              {wizard.children}
            </span>
            <button onClick={() => update({ children: Math.min(200, wizard.children + 1) })} style={styles.qtyBtn}>+</button>
          </div>
          {errors.children && <span style={styles.error}>{errors.children}</span>}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Total guests: <strong>{wizard.adults + wizard.children}</strong>
        </p>
      </div>
    )
  }

  function renderStep3() {
    if (!config) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
        {(config.venue_areas || []).map((area: any) => {
          const slot = availability?.slots?.find(s => s.venue_area_id === area.id)
          const isAvailable = slot ? slot.is_available : true
          const totalGuests = wizard.adults + wizard.children
          const withinCapacity = totalGuests >= area.capacity_min && totalGuests <= area.capacity_max

          return (
            <button
              key={area.id}
              onClick={() => { update({ venue_area_id: area.id }); setErrors({}) }}
              disabled={!isAvailable || !withinCapacity}
              style={{
                ...styles.cardOption,
                opacity: (!isAvailable || !withinCapacity) ? 0.5 : 1,
                borderColor: wizard.venue_area_id === area.id ? 'var(--primary)' : 'transparent',
                boxShadow: wizard.venue_area_id === area.id ? '0 0 0 2px var(--primary)' : 'var(--shadow-sm)',
                cursor: (!isAvailable || !withinCapacity) ? 'not-allowed' : 'pointer',
              }}
            >
              <strong style={{ color: 'var(--heading)' }}>{area.name}</strong>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>
                {area.description?.slice(0, 60)}
              </small>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>
                {area.capacity_min}–{area.capacity_max} guests
              </small>
              {!isAvailable && <small style={{ color: 'var(--red)', display: 'block' }}>Unavailable</small>}
              {!withinCapacity && <small style={{ color: 'var(--red)', display: 'block' }}>Outside capacity</small>}
            </button>
          )
        })}
        {availLoading && <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Checking availability...</p>}
        {errors.venue_area && <p style={{ color: 'var(--red)', gridColumn: '1 / -1' }}>{errors.venue_area}</p>}
      </div>
    )
  }

  function renderStep4() {
    if (!config) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
        {(config.food_packages || []).map((pkg: any) => (
          <button
            key={pkg.id}
            onClick={() => update({ food_package_id: wizard.food_package_id === pkg.id ? '' : pkg.id })}
            style={{
              ...styles.cardOption,
              borderColor: wizard.food_package_id === pkg.id ? 'var(--primary)' : 'transparent',
              boxShadow: wizard.food_package_id === pkg.id ? '0 0 0 2px var(--primary)' : 'var(--shadow-sm)',
            }}
          >
            <strong style={{ color: 'var(--heading)' }}>{pkg.name}</strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.25rem 0' }}>
              {pkg.description?.slice(0, 80)}
            </p>
            <small style={{ color: 'var(--primary)', fontWeight: 600 }}>
              from {formatCurrency(pkg.per_person_weekday)}/pp
            </small>
            {wizard.food_package_id === pkg.id && (
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>
                Click to deselect
              </small>
            )}
          </button>
        ))}
      </div>
    )
  }

  function renderStep5() {
    if (!config) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
        {(config.drink_packages || []).map((pkg: any) => (
          <button
            key={pkg.id}
            onClick={() => update({ drink_package_id: wizard.drink_package_id === pkg.id ? '' : pkg.id })}
            style={{
              ...styles.cardOption,
              borderColor: wizard.drink_package_id === pkg.id ? 'var(--primary)' : 'transparent',
              boxShadow: wizard.drink_package_id === pkg.id ? '0 0 0 2px var(--primary)' : 'var(--shadow-sm)',
            }}
          >
            <strong style={{ color: 'var(--heading)' }}>{pkg.name}</strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.25rem 0' }}>
              {pkg.description?.slice(0, 80)}
            </p>
            <small style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {pkg.pricing_model === 'per_person' ? `${formatCurrency(pkg.amount_weekday)}/pp` :
               pkg.pricing_model === 'flat_rate' ? formatCurrency(pkg.amount_weekday) : 'Consumption'}
            </small>
            {wizard.drink_package_id === pkg.id && (
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>
                Click to deselect
              </small>
            )}
          </button>
        ))}
      </div>
    )
  }

  function renderStep6() {
    if (!config) return null
    const grouped = (config.addon_categories || []).map(cat => ({
      ...cat,
      items: (config.addons || []).filter((a: any) => a.category_id === cat.id),
    }))

    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {grouped.map(cat => (
          <div key={cat.id}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--heading)', marginBottom: '0.75rem', fontWeight: 600 }}>
              {cat.name}
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {cat.items.map((addon: any) => {
                const qty = wizard.addon_selections[addon.id] || 0
                return (
                  <div key={addon.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '12px', border: `1px solid ${qty > 0 ? 'var(--primary)' : 'var(--beige-dark)'}`,
                    background: qty > 0 ? 'rgba(194, 106, 45, 0.05)' : 'var(--white)',
                    gap: '0.5rem', flexWrap: isNarrow ? 'wrap' : 'nowrap',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{addon.icon || '📌'}</span>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--heading)' }}>{addon.name}</strong>
                      </div>
                      <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.15rem' }}>
                        {formatCurrency(addon.amount_weekday)}
                        {addon.pricing_model === 'per_person' ? ' per person' :
                         addon.pricing_model === 'per_hour' ? ' per hour' : ''}
                      </small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          const next = { ...wizard.addon_selections }
                          if (qty <= 1) delete next[addon.id]
                          else next[addon.id] = qty - 1
                          update({ addon_selections: next })
                        }}
                        style={{ ...styles.smallBtn, opacity: qty === 0 ? 0.3 : 1 }}
                        disabled={qty === 0}
                      >
                        −
                      </button>
                      <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600, color: 'var(--heading)' }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => update({ addon_selections: { ...wizard.addon_selections, [addon.id]: qty + 1 } })}
                        style={{ ...styles.smallBtn, opacity: qty >= addon.max_quantity ? 0.3 : 1 }}
                        disabled={qty >= addon.max_quantity}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderStep7() {
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={styles.label}>Full Name *</label>
            <input
              type="text"
              placeholder="Your full name"
              value={wizard.name}
              onChange={e => update({ name: e.target.value })}
              style={{ ...styles.input, borderColor: errors.name ? 'var(--red)' : 'transparent' }}
            />
            {errors.name && <span style={styles.error}>{errors.name}</span>}
          </div>
          <div>
            <label style={styles.label}>Phone Number *</label>
            <input
              type="tel"
              placeholder="071 234 5678"
              value={wizard.phone}
              onChange={e => update({ phone: e.target.value })}
              style={{ ...styles.input, borderColor: errors.phone ? 'var(--red)' : 'transparent' }}
            />
            {errors.phone && <span style={styles.error}>{errors.phone}</span>}
          </div>
        </div>
        <div>
          <label style={styles.label}>Email Address *</label>
          <input
            type="email"
            placeholder="your@email.com"
            value={wizard.email}
            onChange={e => update({ email: e.target.value })}
            style={{ ...styles.input, borderColor: errors.email ? 'var(--red)' : 'transparent' }}
          />
          {errors.email && <span style={styles.error}>{errors.email}</span>}
        </div>
        <div>
          <label style={styles.label}>Company / Organisation</label>
          <input
            type="text"
            placeholder="Optional"
            value={wizard.company}
            onChange={e => update({ company: e.target.value })}
            style={styles.input}
          />
        </div>
        <div>
          <label style={styles.label}>Special Requests</label>
          <textarea
            placeholder="Dietary requirements, seating preferences, or anything else we should know"
            rows={4}
            value={wizard.special_requests}
            onChange={e => update({ special_requests: e.target.value })}
            style={{ ...styles.input, resize: 'vertical', minHeight: 80 }}
          />
        </div>
      </div>
    )
  }

  function renderStep8() {
    return (
      <div>
        <div style={{ background: 'var(--beige)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--heading)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
            Booking Summary
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
            <Row label="Booking Type" value={config?.booking_types.find((b: any) => b.id === wizard.booking_type_id)?.name || '—'} />
            <Row label="Date & Time" value={`${wizard.booking_date} at ${wizard.booking_time} (${wizard.duration_hours}h)`} />
            <Row label="Guests" value={`${wizard.adults} adults, ${wizard.children} children`} />
            <Row label="Venue Area" value={config?.venue_areas.find((a: any) => a.id === wizard.venue_area_id)?.name || '—'} />
            <Row label="Food Package" value={config?.food_packages.find((p: any) => p.id === wizard.food_package_id)?.name || 'None selected'} />
            <Row label="Drinks Package" value={config?.drink_packages.find((p: any) => p.id === wizard.drink_package_id)?.name || 'None selected'} />
            <Row label="Add-ons" value={(() => {
              const selected = Object.entries(wizard.addon_selections).filter(([, q]) => q > 0)
              return selected.length > 0
                ? selected.map(([id, qty]) => `${config?.addons.find((a: any) => a.id === id)?.name || '?'} × ${qty}`).join(', ')
                : 'None'
            })()} />
            <Row label="Name" value={wizard.name} />
            <Row label="Contact" value={`${wizard.phone} | ${wizard.email}`} />
            {wizard.special_requests && <Row label="Special Requests" value={wizard.special_requests} />}
          </div>
        </div>

        {quotation && (
          <div style={{
            background: 'linear-gradient(135deg, var(--beige), var(--cream))',
            borderRadius: '16px', padding: '1.5rem',
          }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--heading)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
              Quotation Breakdown
            </h3>
            {quotation.line_items.filter(i => i.total > 0).map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.4rem 0', fontSize: '0.85rem',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
              }}>
                <span style={{ color: 'var(--body)' }}>{item.label}</span>
                <strong style={{ color: 'var(--heading)' }}>{formatCurrency(item.total)}</strong>
              </div>
            ))}
            <div style={{ borderTop: '2px solid var(--primary)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--heading)' }}>Total</span>
                <strong style={{ color: 'var(--primary)' }}>{formatCurrency(quotation.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                <span style={{ color: 'var(--body)' }}>Deposit Required</span>
                <strong>{formatCurrency(quotation.deposit_amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--body)' }}>Balance Due</span>
                <strong>{formatCurrency(quotation.balance_amount)}</strong>
              </div>
            </div>
          </div>
        )}

        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
          By confirming, you agree to our terms and conditions. A 30% deposit secures your booking.
        </p>
      </div>
    )
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <strong style={{ color: 'var(--heading)', textAlign: 'right' }}>{value}</strong>
    </div>
  )
}

function calcEndTime(startTime: string, durationHours: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const totalMin = h * 60 + m + durationHours * 60
  const endH = Math.floor(totalMin / 60) % 24
  const endM = Math.round(totalMin % 60)
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: 'var(--beige)',
    minHeight: '100vh',
    paddingBottom: '4rem',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 1rem',
  },
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    padding: '1.5rem 0',
    overflowX: 'auto',
    gap: 0,
    WebkitOverflowScrolling: 'touch',
  },
  wizardRow: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  quotationSidebar: {
    width: 340,
    maxWidth: '100%',
    flexShrink: 0,
  },
  navBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    border: '2px solid var(--beige-dark)',
    background: '#fff',
    color: 'var(--heading)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 600,
    color: 'var(--heading)',
    fontSize: '0.9rem',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    border: '2px solid var(--beige-dark)',
    background: 'var(--cream)',
    fontSize: '0.95rem',
    color: 'var(--heading)',
    fontFamily: 'var(--font-body)',
  },
  error: {
    color: 'var(--red)',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
    display: 'block',
  },
  cardOption: {
    background: '#fff',
    borderRadius: '16px',
    padding: '1.25rem',
    border: '2px solid transparent',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: '2px solid var(--beige-dark)',
    background: '#fff',
    fontSize: '1.25rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--heading)',
    fontWeight: 600,
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid var(--beige-dark)',
    background: '#fff',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--heading)',
  },
}