import { getAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { orderAccessCookieName, verifyOrderAccessProof } from '@/lib/order-public-auth'

interface Props {
  params: Promise<{ ref: string }>
}

export const metadata: Metadata = {
  title: 'Receipt - The Boma Café',
}

function ReceiptContent({ data }: { data: any }) {
  let items: any[] = []
  try {
    const parsed = JSON.parse(data.items_json)
    items = Array.isArray(parsed) ? parsed : (parsed?.items || [])
  } catch {}

  const tn = data.table_number

  return (
    <div style={{
      fontFamily: "'Courier New', monospace",
      fontSize: '14px',
      maxWidth: '320px',
      margin: '0 auto',
      padding: '20px',
      color: '#000',
      background: '#fff',
      minHeight: '100vh',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '20px', margin: 0 }}>THE BOMA CAFÉ</h1>
        <p style={{ margin: '0.25rem 0', fontSize: '12px', color: '#555' }}>
          {new Date(data.created_at).toLocaleDateString('en-ZA')}
          {' '}
          {new Date(data.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '12px', color: '#555', wordBreak: 'break-all' }}>
          {data.order_ref}
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />

      <p style={{ fontSize: '13px', margin: '0.5rem 0' }}>
        <strong>{data.customer_name}</strong>
        <br />
        {data.order_type.toUpperCase()}
        {tn ? ` — Table ${tn}` : ''}
        {(data as any).delivery_address && !(data as any)._is_customer_view ? ` — ${(data as any).delivery_address}` : ''}
      </p>

      <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />

      {items.map((item: any, i: number) => (
        <div key={i} style={{ margin: '0.5rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><strong>{item.quantity}x</strong> {item.name}</span>
            <span>R{(item.price * item.quantity).toFixed(2)}</span>
          </div>
          {item.notes && (
            <div style={{ fontSize: '11px', color: '#888', marginLeft: '1rem' }}>⚠ {item.notes}</div>
          )}
          {item.selected_size && (
            <div style={{ fontSize: '11px', color: '#888', marginLeft: '1rem' }}>
              Size: {item.selected_size.name} (+R{item.selected_size.price.toFixed(2)})
            </div>
          )}
        </div>
      ))}

      <hr style={{ border: 'none', borderTop: '2px solid #000' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700 }}>
        <span>TOTAL</span>
        <span>R{data.total.toFixed(2)}</span>
      </div>

      <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />

      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '12px', color: '#555' }}>
        <p>Thank you for your order!</p>
        <p style={{ fontSize: '10px', marginTop: '0.5rem' }}>
          The Boma Café · WhatsApp: +27 71 601 0903
        </p>
      </div>

      <div id="print-button-container" style={{ textAlign: 'center', marginTop: '1.5rem' }} />

      <script
        dangerouslySetInnerHTML={{
          __html: `
            var btn = document.createElement('button');
            btn.textContent = '🖨️ Print Receipt';
            btn.style.cssText = 'padding:10px 24px;font-size:14px;font-weight:700;background:#000;color:#fff;border:none;border-radius:8px;cursor:pointer';
            btn.onclick = function() { window.print() };
            document.getElementById('print-button-container').appendChild(btn);
          `,
        }}
      />

      <style>{`
        @media print {
          #print-button-container { display: none !important; }
          body { background: #fff !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  )
}

function VerifyForm({ ref, error }: { ref: string; error?: string }) {
  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a14', padding: '1rem',
    }}>
      <form method="POST" action={`/api/receipt/verify`} style={{
        background: '#16162a', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '360px',
      }}>
        <input type="hidden" name="ref" value={ref} />
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem' }}>🧾</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: '0.5rem 0 0' }}>View Receipt</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Enter phone number to access receipt for {ref}
          </p>
        </div>
        <input
          type="tel" name="phone" placeholder="Phone number on order" required
          style={{
            width: '100%', padding: '0.875rem', borderRadius: '10px', fontSize: '1rem',
            border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff',
            textAlign: 'center', boxSizing: 'border-box', outline: 'none',
          }}
        />
        {error && (
          <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>
        )}
        <button type="submit" style={{
          width: '100%', marginTop: '1rem', padding: '0.875rem', border: 'none', borderRadius: '10px',
          background: '#f59e0b', color: '#000', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
        }}>
          View Receipt
        </button>
        <p style={{ marginTop: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
          Admin users can access receipts directly from the dashboard
        </p>
      </form>
    </div>
  )
}

export default async function ReceiptPage({ params }: Props) {
  const { ref } = await params

  // Check admin/kitchen session
  const session = await getSession()
  const isAuthed = session?.role === 'admin' || session?.role === 'kitchen'

  // Customer access is a short-lived, signed, HttpOnly proof created only by
  // the phone verification endpoint. URL query parameters are never trusted.
  let isVerified = false
  if (!isAuthed) {
    const cookieStore = await cookies()
    const proof = cookieStore.get(orderAccessCookieName(ref))?.value
    try {
      isVerified = verifyOrderAccessProof(ref, proof)
    } catch (error) {
      console.error('[receipt] verification proof failed:', error instanceof Error ? error.message : String(error))
    }
  }

  if (!isAuthed && !isVerified) {
    return <VerifyForm ref={ref} />
  }

  const supabase = getAdminClient()

  const selectCols = isAuthed
    ? 'order_ref, customer_name, order_type, table_number, items_json, total, created_at, delivery_address'
    : 'order_ref, customer_name, order_type, table_number, items_json, total, created_at'

  const { data, error } = await supabase
    .from('orders')
    .select(selectCols)
    .eq('order_ref', ref)
    .maybeSingle()

  if (error || !data) notFound()

  if (!isAuthed) {
    (data as any)._is_customer_view = true
  }

  return <ReceiptContent data={(data as any)} />
}
