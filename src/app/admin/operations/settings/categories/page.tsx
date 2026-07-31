import AdminPage from '@/components/admin/design-system/AdminPage'
import { CategoriesView } from '@/inventory/components/settings-views'

export default function CategoriesSettingsPage() {
  return (
    <AdminPage title="Categories" description="Organise products into categories">
      <CategoriesView />
    </AdminPage>
  )
}
