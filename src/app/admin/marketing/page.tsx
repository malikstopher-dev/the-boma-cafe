'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/admin/BackButton'
import { GENERATOR_TYPES, MarketingProject, Template, BrandAsset, generateId } from '@/lib/marketing/types'
import { BUILT_IN_TEMPLATES } from '@/lib/marketing/templates'
import { createDefaultDesign } from '@/lib/marketing/generators'
import MediaPicker from '@/components/admin/MediaPicker'
import { getAssetUrl } from '@/lib/storage'

type Tab = 'generator' | 'projects' | 'templates' | 'assets'

const STATUS_COLORS: Record<string, string> = {
  draft: '#C8A04E',
  published: '#4CAF50',
  archived: '#6B6358',
  deleted: '#E85454',
}

export default function MarketingStudio() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('generator')
  const [projects, setProjects] = useState<MarketingProject[]>([])
  const [templates, setTemplates] = useState<Template[]>(BUILT_IN_TEMPLATES)
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (campaignFilter) params.set('campaign', campaignFilter)
      const res = await fetch(`/api/cms/marketing?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e)
    }
  }, [searchQuery, typeFilter, statusFilter, campaignFilter])

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/marketing?scope=assets')
      if (res.ok) setAssets(await res.json())
    } catch (e) {
      console.error('Failed to fetch assets:', e)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([fetchProjects(), fetchAssets()])
      setIsLoading(false)
    }
    load()
  }, [fetchProjects, fetchAssets])

  const handleCreateFromTemplate = async (template: Template) => {
    try {
      const res = await fetch('/api/cms/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          type: template.type,
          projectData: template.designData,
          tags: template.tags,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        router.push(`/admin/marketing/${data.id}`)
      } else {
        const err = await res.json()
        alert('Failed to create project: ' + (err.error || 'Unknown error'))
      }
    } catch (e) {
      console.error('Failed to create from template:', e)
      alert('Failed to create project. Check console for details.')
    }
  }

  const handleCreateBlank = async (type: (typeof GENERATOR_TYPES)[number]) => {
    try {
      const design = createDefaultDesign(type.id, type.defaultWidth, type.defaultHeight)
      const res = await fetch('/api/cms/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `New ${type.label}`,
          type: type.id,
          projectData: design,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        router.push(`/admin/marketing/${data.id}`)
      }
    } catch (e) {
      console.error('Failed to create project:', e)
    }
  }

  const handleDuplicate = async (project: MarketingProject) => {
    try {
      const res = await fetch('/api/cms/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${project.name} (Copy)`,
          type: project.type,
          projectData: project.projectData,
          tags: project.tags,
          campaign: project.campaign,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        router.push(`/admin/marketing/${data.id}`)
      }
    } catch (e) {
      console.error('Failed to duplicate project:', e)
    }
  }

  const handleSoftDelete = async (id: string) => {
    if (!confirm('Archive this project? It can be restored later.')) return
    try {
      await fetch(`/api/cms/marketing?id=${id}`, { method: 'DELETE' })
      fetchProjects()
    } catch (e) {
      console.error('Failed to delete project:', e)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch('/api/cms/marketing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, createVersion: false }),
      })
      fetchProjects()
    } catch (e) {
      console.error('Failed to update status:', e)
    }
  }

  const filteredTemplates = templates.filter(t => {
    if (typeFilter && t.type !== typeFilter) return false
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const campaigns = Array.from(new Set(projects.map(p => p.campaign).filter(Boolean) as string[]))

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'generator', label: 'Generator', icon: '🎨' },
    { id: 'projects', label: 'Projects', icon: '📁' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'assets', label: 'Assets', icon: '🏪' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <BackButton />
        <h1 style={{ fontSize: '2rem', color: '#F0EBE3' }}>Marketing Studio</h1>
        <p style={{ color: '#A09888' }}>Create and manage marketing assets</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #3A3428', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === tab.id ? '#C8A04E' : 'transparent',
              color: activeTab === tab.id ? '#F0EBE3' : '#F0EBE3',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* GENERATOR TAB */}
      {activeTab === 'generator' && (
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#F0EBE3', marginBottom: '1rem' }}>Choose a Generator</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {GENERATOR_TYPES.map(gt => (
              <button
                key={gt.id}
                onClick={() => handleCreateBlank(gt)}
                style={{
                  background: '#1E1A14',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{gt.icon}</div>
                <h3 style={{ fontSize: '1.1rem', color: '#F0EBE3', marginBottom: '0.25rem' }}>{gt.label}</h3>
                <p style={{ fontSize: '0.85rem', color: '#A09888' }}>{gt.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3A3428', fontSize: '0.95rem', background: '#2A261E', color: '#F0EBE3' }}
            />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #3A3428', background: '#2A261E', color: '#F0EBE3' }}
            >
              <option value="">All Types</option>
              {GENERATOR_TYPES.map(gt => (
                <option key={gt.id} value={gt.id}>{gt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #3A3428', background: '#2A261E', color: '#F0EBE3' }}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={campaignFilter}
              onChange={e => setCampaignFilter(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #3A3428', background: '#2A261E', color: '#F0EBE3' }}
            >
              <option value="">All Campaigns</option>
              {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#A09888' }}>Loading...</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#242018', borderRadius: '12px', color: '#A09888' }}>
              No projects found. Create one from the Generator tab.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {projects.map(project => (
                <div
                  key={project.id}
                  style={{
                    background: '#1E1A14',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem' }}>{GENERATOR_TYPES.find(g => g.id === project.type)?.icon || '📄'}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <a
                          href={`/admin/marketing/${project.id}`}
                          style={{ fontSize: '1.05rem', fontWeight: 600,                           color: '#F0EBE3', textDecoration: 'none', cursor: 'pointer' }}
                          onClick={e => { e.preventDefault(); router.push(`/admin/marketing/${project.id}`) }}
                        >
                          {project.name}
                        </a>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: STATUS_COLORS[project.status] + '20',
                          color: STATUS_COLORS[project.status],
                        }}>
                          {project.status}
                        </span>
                        {project.lockedBy && (
                          <span style={{ fontSize: '0.75rem', color: '#E85454' }}>🔒 {project.lockedBy}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#A09888' }}>
                        <span>{GENERATOR_TYPES.find(g => g.id === project.type)?.label || project.type}</span>
                        {project.campaign && <span>📢 {project.campaign}</span>}
                        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <select
                      value={project.status}
                      onChange={e => handleStatusChange(project.id, e.target.value)}
                      style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #3A3428', fontSize: '0.8rem', background: '#2A261E', color: '#F0EBE3' }}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button
                      onClick={() => handleDuplicate(project)}
                      style={{ padding: '0.4rem 0.75rem', background: '#242018', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      title="Duplicate"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleSoftDelete(project.id)}
                      style={{ padding: '0.4rem 0.75rem', background: 'rgba(232,84,84,0.15)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      title="Archive"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setActiveTab('templates') }}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #3A3428', fontSize: '0.95rem', background: '#2A261E', color: '#F0EBE3' }}
            />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #3A3428', background: '#2A261E', color: '#F0EBE3' }}
            >
              <option value="">All Types</option>
              {GENERATOR_TYPES.map(gt => (
                <option key={gt.id} value={gt.id}>{gt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                style={{
                  background: '#1E1A14',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  style={{
                    height: '180px',
                    background: template.designData.background.type === 'solid'
                      ? template.designData.background.color || '#F5EDE3'
                      : 'linear-gradient(135deg, #FDF8F3, #E8D5C4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    fontSize: '3rem',
                    opacity: 0.5,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '1rem',
                    wordBreak: 'break-word',
                    overflow: 'hidden',
                    maxHeight: '140px',
                  }}>
                    {template.name}
                  </div>
                  {template.isBuiltIn && (
                    <span style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      background: '#C8A04E',
                      color: '#F0EBE3',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}>
                      Built-in
                    </span>
                  )}
                </div>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: '#F0EBE3', marginBottom: '0.25rem' }}>{template.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#A09888', marginBottom: '0.75rem' }}>{template.description}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{ background: '#242018', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem' }}>
                      {GENERATOR_TYPES.find(g => g.id === template.type)?.label || template.type}
                    </span>
                    <span style={{ background: '#242018', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem' }}>
                      {template.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCreateFromTemplate(template)}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ASSETS TAB */}
      {activeTab === 'assets' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#F0EBE3' }}>Brand Asset Library</h2>
            <MediaPicker module="marketing" type="campaign_image" onChange={() => fetchAssets()} label="+ Add Asset" />
          </div>

          {assets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#242018', borderRadius: '12px', color: '#A09888' }}>
              No brand assets yet. Add your logos, colors, and fonts.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {assets.map(asset => (
                <div
                  key={asset.id}
                  style={{
                    background: '#1E1A14',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{
                    height: '120px',
                    background: asset.type === 'color' ? asset.value || '#F5EDE3' : '#242018',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {(() => {
                      const u = getAssetUrl(asset)
                      return u ? (
                        <img src={u} alt={asset.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                      ) : asset.type === 'color' ? (
                        <span style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', fontWeight: 600 }}>{asset.value}</span>
                      ) : (
                        <span style={{ fontSize: '2rem', color: '#A09888' }}>{asset.type === 'font' ? 'Aa' : '📄'}</span>
                      )
                    })()}
                    <span style={{
                      position: 'absolute',
                      top: '0.5rem',
                      left: '0.5rem',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                    }}>
                      {asset.type}
                    </span>
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F0EBE3', marginBottom: '0.15rem' }}>{asset.name}</p>
                    {asset.category && <p style={{ fontSize: '0.75rem', color: '#A09888' }}>{asset.category}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
