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
            style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:8,padding:20,display:'block',transition:'all 0.2s',color:'#F0EBE3'}}
          >
            <h3 style={{fontWeight:600,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{section.title}</h3>
            <p style={{fontSize:14,color:'#A09888',marginTop:4,fontFamily:'Inter, sans-serif'}}>{section.description}</p>
          </Link>
        ))}
      </div>
    </AdminPage>
  )
}
