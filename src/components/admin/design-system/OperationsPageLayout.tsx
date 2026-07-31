import type { ReactNode } from 'react'

interface OperationsPageLayoutProps {
  whatHappened: ReactNode
  needsAttention: ReactNode
  nextActions: ReactNode
  children: ReactNode
}

/**
 * Every operations page answers three questions:
 *  1. What happened?        — summary of recent activity
 *  2. What needs attention? — alerts, warnings, items needing action
 *  3. What should I do next?— action buttons (Reconcile Now, Create PO, Log Waste, …)
 */
export default function OperationsPageLayout({
  whatHappened,
  needsAttention,
  nextActions,
  children,
}: OperationsPageLayoutProps) {
  return (
    <div className="p-6 space-y-6">
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          What happened?
        </h2>
        {whatHappened}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          What needs attention?
        </h2>
        {needsAttention}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          What should I do next?
        </h2>
        {nextActions}
      </section>

      {children && (
        <section>
          {children}
        </section>
      )}
    </div>
  )
}
