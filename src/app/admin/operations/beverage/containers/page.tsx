'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'

type ContainerType = {
  id: string
  name: string
  display_name: string
  description: string | null
  is_trackable: boolean
  sort_order: number
}

export default function ContainerTypesPage() {
  const [types, setTypes] = useState<ContainerType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inventory/container-types')
      .then(r => r.json())
      .then(json => setTypes(json.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <AdminPage title="Container Types" description="Track products by container (bottle, keg, case, etc.)">
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif" }}>
        {isLoading ? (
          <div style={{ color: '#6B6358' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {types.map(t => (
              <div
                key={t.id}
                style={{
                  background: '#1E1A14',
                  border: '1px solid #3A3428',
                  borderRadius: 12,
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#F0EBE3' }}>{t.display_name}</span>
                  {t.is_trackable ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#C8A04E', background: 'rgba(200,160,78,0.12)', padding: '2px 8px', borderRadius: 9999 }}>Trackable</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#6B6358' }}>(reference only)</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#A09888', margin: 0 }}>{t.description ?? t.name}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32, borderTop: '1px solid #3A3428', paddingTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3', marginBottom: 12 }}>Products by Container</h2>
          <p style={{ fontSize: 13, color: '#A09888', margin: 0 }}>
            Container tracking allows you to manage stock by physical containers.
            Assign a container type and units-per-container to each product in the product settings.
          </p>
        </div>
      </div>
    </AdminPage>
  )
}
