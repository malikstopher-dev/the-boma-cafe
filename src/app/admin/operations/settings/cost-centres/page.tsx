import AdminPage from '@/components/admin/design-system/AdminPage'
import { CostCentresView } from '@/inventory/components/settings-views'

export default function CostCentresSettingsPage() {
  return (
    <AdminPage title="Cost Centres" description="Where costs are assigned — Restaurant, Bar, Kitchen, Events and more">
      <CostCentresView />
    </AdminPage>
  )
}
