import { getAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

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

  const tn = data.table_number || (() => { try { return JSON.parse(data.items_json)?.metadata?.tableNumber } catch { return undefined } })()

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
        {data.delivery_address ? ` — ${data.delivery_address}` : ''}
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

export default async function ReceiptPage({ params }: Props) {
  const { ref } = await params

  const { data, error } = await getAdminClient()
    .from('orders')
    .select('*')
    .eq('order_ref', ref)
    .maybeSingle()

  if (error || !data) notFound()

  return <ReceiptContent data={data} />
}
