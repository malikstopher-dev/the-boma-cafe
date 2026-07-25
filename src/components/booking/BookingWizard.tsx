'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import SuccessContent from './SuccessContent'
import LoadingView from './LoadingView'
import ErrorView from './ErrorView'
import WizardView from './WizardView'

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

function calcEndTime(startTime: string, durationHours: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const totalMin = h * 60 + m + durationHours * 60
  const endH = Math.floor(totalMin / 60) % 24
  const endM = Math.round(totalMin % 60)
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

export default function BookingWizard() {
  const [config, setConfig] = useState<any>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState('')
  const [wizard, setWizard] = useState<WizardState>(INITIAL_STATE)
  const [step, setStep] = useState(0)
  const [quotation, setQuotation] = useState<any>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [availability, setAvailability] = useState<any>(null)
  const [availLoading, setAvailLoading] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)

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
      setEmailSent(data.email_sent === true)
    } catch {
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }, [wizard, validateCurrentStep])

  const handleReset = useCallback(() => {
    setStep(0)
    setWizard(INITIAL_STATE)
    setSubmitted(false)
    setSubmitResult(null)
    setQuotation(null)
    setEmailSent(false)
  }, [])

  if (configLoading) {
    return <LoadingView />
  }

  if (configError) {
    return <ErrorView message={configError} />
  }

  if (submitted && submitResult) {
    return <SuccessContent submitResult={submitResult} email={wizard.email} onReset={handleReset} emailSent={emailSent} />
  }

  return (
    <WizardView
      config={config}
      wizard={wizard}
      step={step}
      errors={errors}
      quotation={quotation}
      quoteLoading={quoteLoading}
      availLoading={availLoading}
      availability={availability}
      isNarrow={isNarrow}
      enoughForQuote={!!enoughForQuote}
      submitting={submitting}
      update={update}
      setErrors={setErrors}
      handleNext={handleNext}
      handleBack={handleBack}
      handleSubmit={handleSubmit}
      STEPS={STEPS}
    />
  )
}
