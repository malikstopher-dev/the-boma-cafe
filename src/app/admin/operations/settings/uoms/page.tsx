import AdminPage from '@/components/admin/design-system/AdminPage'
import { UomsView } from '@/inventory/components/settings-views'

export default function UomsSettingsPage() {
  return (
    <AdminPage title="Units of Measure" description="Manage measurement units and their categories">
      <UomsView />
    </AdminPage>
  )
}
