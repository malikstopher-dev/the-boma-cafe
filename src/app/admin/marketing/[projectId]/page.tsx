'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BackButton from '@/components/admin/BackButton'
import { MarketingProject, MarketingProjectVersion, ExportFormat, GeneratorType, DesignData, GENERATOR_TYPES, generateId } from '@/lib/marketing/types'
import { renderDesignToCanvas, exportDesign, generateSVG, createDefaultDesign } from '@/lib/marketing/generators'

export default function ProjectEditor() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [project, setProject] = useState<MarketingProject | null>(null)
  const [versions, setVersions] = useState<MarketingProjectVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
  const [exportQuality, setExportQuality] = useState(0.92)
  const [exportScale, setExportScale] = useState(1)
  const [editingElement, setEditingElement] = useState<string | null>(null)
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/cms/marketing?id=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
        if (data.lockedBy && data.lockedBy !== 'current-user') {
          setIsLocked(true)
          setLockedBy(data.lockedBy)
        }
      }
    } catch (e) {
      console.error('Failed to fetch project:', e)
    }
  }, [projectId])

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/cms/marketing?scope=versions&id=${projectId}`)
      if (res.ok) setVersions(await res.json())
    } catch (e) {
      console.error('Failed to fetch versions:', e)
    }
  }, [projectId])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([fetchProject(), fetchVersions()])
      setIsLoading(false)
    }
    load()
  }, [fetchProject, fetchVersions])

  // Acquire lock
  useEffect(() => {
    if (!projectId) return
    fetch(`/api/cms/marketing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, lock: true, lockedBy: 'current-user', createVersion: false }),
    }).catch(() => {})
    return () => {
      fetch(`/api/cms/marketing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, unlock: true, createVersion: false }),
      }).catch(() => {})
    }
  }, [projectId])

  // Autosave every 30s
  useEffect(() => {
    if (!project || isLocked) return
    autosaveTimer.current = setInterval(() => {
      handleSave(false)
    }, 30000)
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
    }
  }, [project, isLocked])

  // Render to canvas when project loads
  useEffect(() => {
    if (!project || !canvasRef.current || !project.projectData) return
    const canvas = canvasRef.current
    renderDesignToCanvas(canvas, project.projectData).catch(err => {
      console.error('Canvas render failed:', err)
    })
  }, [project])

  const handleSave = async (showToast = true) => {
    if (!project || isLocked) return
    setIsSaving(true)
    try {
      // Re-render to capture latest canvas state
      if (canvasRef.current) {
        await renderDesignToCanvas(canvasRef.current, project.projectData)
        const thumbnail = canvasRef.current.toDataURL('image/jpeg', 0.5)
        await fetch('/api/cms/marketing', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: project.id,
            projectData: project.projectData,
            thumbnail,
            createVersion: true,
            versionDescription: `Auto-save ${new Date().toLocaleString()}`,
          }),
        })
      } else {
        await fetch('/api/cms/marketing', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: project.id,
            projectData: project.projectData,
            createVersion: true,
          }),
        })
      }
      if (showToast) {
        setSaveMessage('Saved!')
        setTimeout(() => setSaveMessage(''), 2000)
      }
      fetchVersions()
    } catch (e) {
      console.error('Save failed:', e)
      if (showToast) {
        setSaveMessage('Save failed')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    }
    setIsSaving(false)
  }

  const handleExport = async () => {
    if (!canvasRef.current) return
    setIsSaving(true)

    // Autosave before export
    if (!isLocked) {
      await handleSave(false)
    }

    try {
      const result = await exportDesign(canvasRef.current, exportFormat, exportQuality)

      if (exportFormat === 'print') {
        setSaveMessage('Print dialog opened')
        setTimeout(() => setSaveMessage(''), 2000)
      } else {
        const a = document.createElement('a')
        a.href = result.url
        a.download = `${project?.name || 'export'}.${exportFormat}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(result.url)
        setSaveMessage(`Exported as ${exportFormat.toUpperCase()}`)
        setTimeout(() => setSaveMessage(''), 2000)
      }
    } catch (e) {
      console.error('Export failed:', e)
      setSaveMessage('Export failed')
      setTimeout(() => setSaveMessage(''), 3000)
    }
    setIsSaving(false)
  }

  const handleExportSVG = async () => {
    if (!project) return
    setIsSaving(true)
    try {
      const svg = generateSVG(project.projectData)
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setSaveMessage('Exported as SVG')
      setTimeout(() => setSaveMessage(''), 2000)
    } catch (e) {
      console.error('SVG export failed:', e)
    }
    setIsSaving(false)
  }

  const handleRestoreVersion = async (version: MarketingProjectVersion) => {
    if (!confirm(`Restore version ${version.versionNumber} from ${new Date(version.createdAt).toLocaleString()}?`)) return
    try {
      await fetch('/api/cms/marketing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          projectData: version.projectData,
          createVersion: true,
          versionDescription: `Restored from version ${version.versionNumber}`,
        }),
      })
      await fetchProject()
      setShowHistory(false)
      setSaveMessage(`Restored version ${version.versionNumber}`)
      setTimeout(() => setSaveMessage(''), 2000)
    } catch (e) {
      console.error('Restore failed:', e)
    }
  }

  const handleElementUpdate = (elementId: string, field: string, value: any) => {
    if (!project || isLocked) return
    const updated = {
      ...project,
      projectData: {
        ...project.projectData,
        elements: project.projectData.elements.map(el =>
          el.id === elementId
            ? { ...el, props: { ...el.props, [field]: value } }
            : el
        ),
      },
    }
    setProject(updated)
  }

  const handleAddElement = (type: 'text' | 'image' | 'shape' | 'qr' | 'icon' | 'pattern') => {
    if (!project || isLocked) return
    const w = project.projectData.width
    const h = project.projectData.height
    const newEl: import('@/lib/marketing/types').DesignElement = {
      id: generateId(),
      type,
      x: w * 0.1, y: h * 0.1,
      width: w * 0.8, height: 100,
      rotation: 0, opacity: 1, visible: true,
      zIndex: project.projectData.elements.length + 1,
      props: type === 'text'
        ? { content: 'New Text', fontFamily: 'Poppins', fontSize: 36, fontWeight: 400, fontStyle: 'normal' as const, textAlign: 'center' as const, color: '#1F1F1F', lineHeight: 1.5, letterSpacing: 0, textTransform: 'none' as const }
        : type === 'shape'
          ? { shapeType: 'rectangle' as const, fillColor: '#C26A2D' }
          : { src: '', fit: 'cover' as const, borderRadius: 0 },
    }
    setProject({
      ...project,
      projectData: {
        ...project.projectData,
        elements: [...project.projectData.elements, newEl],
      },
    })
    setEditingElement(newEl.id)
  }

  const handleDeleteElement = (elementId: string) => {
    if (!project || isLocked) return
    setProject({
      ...project,
      projectData: {
        ...project.projectData,
        elements: project.projectData.elements.filter(el => el.id !== elementId),
      },
    })
    setEditingElement(null)
  }

  const handleDuplicateProject = async () => {
    if (!project) return
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
      console.error('Duplicate failed:', e)
    }
  }

  const handleNameChange = async (name: string) => {
    if (!project) return
    setProject({ ...project, name })
    await fetch('/api/cms/marketing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: project.id, name, createVersion: false }),
    })
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading project...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-light)' }}>Project not found</p>
        <button onClick={() => router.push('/admin/marketing')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Marketing Studio
        </button>
      </div>
    )
  }

  const typeInfo = GENERATOR_TYPES.find(g => g.id === project.type)

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <BackButton />
          <input
            type="text"
            value={project.name}
            onChange={e => handleNameChange(e.target.value)}
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--dark-brown)',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              borderBottom: '2px solid transparent',
              width: '300px',
            }}
            onFocus={e => { e.target.style.borderBottomColor = 'var(--primary)' }}
            onBlur={e => { e.target.style.borderBottomColor = 'transparent' }}
          />
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: project.status === 'draft' ? '#fef3c7' : project.status === 'published' ? '#dcfce7' : '#f3f4f6',
            color: project.status === 'draft' ? '#92400e' : project.status === 'published' ? '#166534' : '#6b7280',
            textTransform: 'capitalize',
          }}>
            {project.status}
          </span>
          {typeInfo && <span style={{ fontSize: '1.2rem' }}>{typeInfo.icon}</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {saveMessage && (
            <span style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              background: saveMessage.includes('fail') ? '#fee2e2' : '#dcfce7',
              color: saveMessage.includes('fail') ? '#dc2626' : '#16a34a',
            }}>
              {saveMessage}
            </span>
          )}
          {isLocked && (
            <span style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626' }}>
              🔒 Locked by {lockedBy}
            </span>
          )}
          <button onClick={() => setShowHistory(!showHistory)} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
            📜 History
          </button>
          <button onClick={handleDuplicateProject} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
            📋 Duplicate
          </button>
          <button onClick={() => setShowExport(!showExport)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            📥 Export
          </button>
          <button onClick={() => handleSave(true)} disabled={isSaving || isLocked} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {/* Canvas Preview */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: 'var(--white)',
            borderRadius: '16px',
            padding: '1rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            overflow: 'auto',
          }}>
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          {/* Elements Panel */}
          <div style={{
            background: 'var(--white)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--dark-brown)' }}>Elements</h3>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => handleAddElement('text')} title="Add Text" style={{ padding: '0.3rem 0.5rem', background: 'var(--cream)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>T</button>
                <button onClick={() => handleAddElement('shape')} title="Add Shape" style={{ padding: '0.3rem 0.5rem', background: 'var(--cream)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>□</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {project.projectData.elements.map(el => (
                <button
                  key={el.id}
                  onClick={() => setEditingElement(el.id === editingElement ? null : el.id)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: editingElement === el.id ? 'var(--cream)' : 'transparent',
                    border: '1px solid var(--cream)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--dark-brown)' }}>
                    {el.type === 'text' ? '🔤 ' : el.type === 'shape' ? '🔲 ' : el.type === 'image' ? '🖼️ ' : '📷 '}
                    {el.type === 'text' ? (el.props as any).content?.substring(0, 30) || 'Text' : el.type}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteElement(el.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', padding: '0.2rem' }}
                  >
                    ✕
                  </button>
                </button>
              ))}
            </div>
          </div>

          {/* Property Editor */}
          {editingElement && (() => {
            const el = project.projectData.elements.find(e => e.id === editingElement)
            if (!el) return null
            const p = el.props as any
            return (
              <div style={{
                background: 'var(--white)',
                borderRadius: '16px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-md)',
              }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--dark-brown)', marginBottom: '0.75rem', textTransform: 'capitalize' }}>
                  {el.type} Properties
                </h3>

                {el.type === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Content</label>
                      <textarea
                        value={p.content || ''}
                        onChange={e => handleElementUpdate(el.id, 'content', e.target.value)}
                        rows={3}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cream)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Font Size</label>
                        <input type="number" value={p.fontSize} onChange={e => handleElementUpdate(el.id, 'fontSize', Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cream)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Weight</label>
                        <select value={p.fontWeight} onChange={e => handleElementUpdate(el.id, 'fontWeight', Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cream)' }}>
                          <option value={300}>Light</option>
                          <option value={400}>Regular</option>
                          <option value={500}>Medium</option>
                          <option value={600}>Semi Bold</option>
                          <option value={700}>Bold</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Color</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="color" value={p.color || '#000000'} onChange={e => handleElementUpdate(el.id, 'color', e.target.value)} style={{ width: '40px', height: '40px', borderRadius: '6px', border: '1px solid var(--cream)', cursor: 'pointer' }} />
                        <input type="text" value={p.color || ''} onChange={e => handleElementUpdate(el.id, 'color', e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cream)', fontSize: '0.85rem' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Text Align</label>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {(['left', 'center', 'right'] as const).map(a => (
                          <button
                            key={a}
                            onClick={() => handleElementUpdate(el.id, 'textAlign', a)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              background: p.textAlign === a ? 'var(--primary)' : 'var(--cream)',
                              color: p.textAlign === a ? 'var(--white)' : 'var(--text)',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            {a === 'left' ? '≡' : a === 'center' ? '≡' : '≡'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {el.type === 'shape' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                      <select value={p.shapeType} onChange={e => handleElementUpdate(el.id, 'shapeType', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cream)' }}>
                        <option value="rectangle">Rectangle</option>
                        <option value="rounded-rect">Rounded Rectangle</option>
                        <option value="circle">Circle</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Fill Color</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="color" value={p.fillColor || '#000000'} onChange={e => handleElementUpdate(el.id, 'fillColor', e.target.value)} style={{ width: '40px', height: '40px', borderRadius: '6px', border: '1px solid var(--cream)' }} />
                        <input type="text" value={p.fillColor || ''} onChange={e => handleElementUpdate(el.id, 'fillColor', e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cream)' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
          onClick={() => setShowExport(false)}
        >
          <div
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              padding: '2rem',
              width: '400px',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '1.25rem' }}>Export Design</h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Format</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {(['png', 'jpg', 'svg', 'pdf', 'html', 'print'] as ExportFormat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setExportFormat(f)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      background: exportFormat === f ? 'var(--primary)' : 'var(--cream)',
                      color: exportFormat === f ? 'var(--white)' : 'var(--text)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {exportFormat === 'jpg' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                  Quality: {Math.round(exportQuality * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={exportQuality}
                  onChange={e => setExportQuality(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {exportFormat === 'svg' ? (
                <button onClick={handleExportSVG} disabled={isSaving} className="btn btn-primary" style={{ flex: 1 }}>
                  {isSaving ? 'Exporting...' : 'Export SVG'}
                </button>
              ) : (
                <button onClick={handleExport} disabled={isSaving} className="btn btn-primary" style={{ flex: 1 }}>
                  {isSaving ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
                </button>
              )}
              <button onClick={() => setShowExport(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
          onClick={() => setShowHistory(false)}
        >
          <div
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              padding: '2rem',
              width: '500px',
              maxHeight: '70vh',
              overflow: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '1.25rem' }}>Version History</h2>

            {versions.length === 0 ? (
              <p style={{ color: 'var(--text-light)' }}>No versions yet. Save to create a version.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {versions.map(version => (
                  <div
                    key={version.id}
                    style={{
                      padding: '1rem',
                      background: 'var(--cream)',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--dark-brown)' }}>
                        Version {version.versionNumber}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        {new Date(version.createdAt).toLocaleString()}
                      </div>
                      {version.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                          {version.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRestoreVersion(version)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        background: 'var(--primary)',
                        color: 'var(--white)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowHistory(false)} className="btn btn-ghost" style={{ marginTop: '1rem', width: '100%' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
