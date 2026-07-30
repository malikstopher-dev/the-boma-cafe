'use client'

import { type LucideIcon, type LucideProps } from 'lucide-react'
import * as IconComponents from './icons'

const iconRegistry = IconComponents as unknown as Record<string, LucideIcon>

interface IconProps extends LucideProps {
  name: string
}

export default function Icon({ name, size = 18, ...props }: IconProps) {
  const LucideIconComponent = iconRegistry[name]

  if (LucideIconComponent && typeof LucideIconComponent === 'function') {
    return <LucideIconComponent size={size} {...props} />
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx={12} cy={12} r={4} />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}
