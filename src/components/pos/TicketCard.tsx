import type { CSSProperties, ReactNode } from 'react'
import type { OrderStatus } from '@/lib/pos/types'

const STATUS_COLOR: Partial<Record<OrderStatus, string>> = { pending:'#fbbf24', confirmed:'#60a5fa', preparing:'#fbbf24', packing:'#a78bfa', ready:'#34d399', served:'#22d3ee', completed:'#94a3b8', cancelled:'#f87171', rejected:'#f87171' }

interface TicketCardProps { children: ReactNode; status?: OrderStatus; accent?: string; className?: string; style?: CSSProperties; onClick?: () => void }
export default function TicketCard({ children, status, accent, className, style, onClick }: TicketCardProps) {
  const color = accent || (status ? STATUS_COLOR[status] : '#a78bfa')
  return <article className={className} onClick={onClick} style={{ position:'relative', overflow:'hidden', background:'linear-gradient(145deg,rgba(27,35,54,.98),rgba(15,23,42,.98))', border:`1px solid ${color}55`, borderRadius:16, boxShadow:`0 12px 32px rgba(0,0,0,.28), 0 0 20px ${color}12`, ...style }}>
    <span aria-hidden="true" style={{ position:'absolute', inset:'0 auto 0 0', width:4, background:color, boxShadow:`0 0 14px ${color}66` }} />
    {children}
  </article>
}
