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
      <div className="p-6">
        {isLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map(t => (
              <div key={t.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold text-white">{t.display_name}</span>
                  {!t.is_trackable && (
                    <span className="text-xs text-gray-500">(reference only)</span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{t.description ?? t.name}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 border-t border-gray-700 pt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Products by Container</h2>
          <p className="text-sm text-gray-400">
            Container tracking allows you to manage stock by physical containers.
            Assign a container type and units-per-container to each product in the product settings.
          </p>
        </div>
      </div>
    </AdminPage>
  )
}
