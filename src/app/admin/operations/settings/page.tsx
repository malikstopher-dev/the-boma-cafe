import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'

const SECTIONS = [
  { href: '/admin/operations/settings/uoms', title: 'Units of Measure', description: 'Manage measurement units and their categories' },
  { href: '/admin/operations/settings/categories', title: 'Categories', description: 'Organise products into categories' },
  { href: '/admin/operations/settings/cost-centres', title: 'Cost Centres', description: 'Where costs are assigned — Restaurant, Bar, Kitchen, Events and more' },
]

export default function SettingsHubPage() {
  return (
    <AdminPage title="Settings" description="Reference data and configuration">
      <div className="grid md:grid-cols-3 gap-4">
        {SECTIONS.map(section => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-white border rounded-lg p-5 hover:border-brand-500 hover:shadow-sm transition-all group"
          >
            <h3 className="font-semibold text-gray-800 group-hover:text-brand-700">{section.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{section.description}</p>
          </Link>
        ))}
      </div>
    </AdminPage>
  )
}
