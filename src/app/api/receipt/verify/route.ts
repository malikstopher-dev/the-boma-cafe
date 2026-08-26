import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  createOrderAccessProof,
  orderAccessCookieName,
  ORDER_ACCESS_COOKIE_MAX_AGE,
  verifyOrderPhone,
} from '@/lib/order-public-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!await checkRateLimit(`receipt-verify:${ip}`)) {
      return new Response(
        `<!DOCTYPE html><html><body><script>alert('Too many attempts. Please wait and try again.');history.back()</script></body></html>`,
        { status: 429, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const formData = await request.formData()
    const ref = formData.get('ref') as string
    let phone = formData.get('phone') as string

    if (!ref || !phone) {
      return new Response(
        `<!DOCTYPE html><html><body><script>alert('Missing ref or phone');history.back()</script></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('orders')
      .select('phone')
      .eq('order_ref', ref)
      .maybeSingle()

    if (error) {
      return new Response(
        `<!DOCTYPE html><html><body><script>alert('Verification is temporarily unavailable');history.back()</script></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (!data || !verifyOrderPhone(phone, data.phone || '')) {
      return new Response(
        `<!DOCTYPE html><html><body><script>alert('Phone number does not match this order');history.back()</script></body></html>`,
        { status: 401, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const redirectUrl = new URL(`/receipt/${ref}`, request.url)
    const response = NextResponse.redirect(redirectUrl, 303)
    response.cookies.set(orderAccessCookieName(ref), createOrderAccessProof(ref), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ORDER_ACCESS_COOKIE_MAX_AGE,
    })
    return response
  } catch (error) {
    console.error('[receipt verification] failed:', error instanceof Error ? error.message : String(error))
    return new Response(
      `<!DOCTYPE html><html><body><script>alert('Verification failed');history.back()</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
