import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'
import { uploadFile, deleteFile, generateStoragePath, getAssetUrl, VALID_MODULES, ALLOWED_MIME_TYPES } from '@/lib/storage'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function supabase() {
  return getAdminClient()
}

function snakeToCamel(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
    result[camelKey] = value
  }
  return result
}

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const campaign = searchParams.get('campaign')
  const search = searchParams.get('search')
  const projectId = searchParams.get('id')
  const scope = searchParams.get('scope') // 'projects' | 'templates' | 'assets' | 'versions'

  try {
    const client = await supabase()

    // Versions for a specific project
    if (scope === 'versions' && projectId) {
      const { data, error } = await client
        .from('marketing_project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
      if (error) throw error
      return NextResponse.json((data || []).map(snakeToCamel))
    }

    // Templates
    if (scope === 'templates') {
      let query = client.from('marketing_templates').select('*')
      if (type) query = query.eq('type', type)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json((data || []).map(snakeToCamel))
    }

    // Brand assets
    if (scope === 'assets') {
      let query = client.from('marketing_brand_assets').select('*')
      const assetType = searchParams.get('assetType')
      const module = searchParams.get('module')
      if (assetType) query = query.eq('type', assetType)
      if (module) query = query.eq('module', module)
      const { data, error } = await query.order('name', { ascending: true })
      if (error) throw error
      return NextResponse.json((data || []).map(snakeToCamel))
    }

    // Single project
    if (projectId) {
      const { data, error } = await client.from('marketing_projects').select('*').eq('id', projectId).single()
      if (error) throw error
      return NextResponse.json(snakeToCamel(data))
    }

    // List projects
    let query = client.from('marketing_projects').select('*')

    if (type) query = query.eq('type', type)
    if (campaign) query = query.eq('campaign', campaign)

    if (status) {
      if (status === 'active') {
        query = query.in('status', ['draft', 'published'])
      } else {
        query = query.eq('status', status)
      }
    } else {
      query = query.in('status', ['draft', 'published', 'archived'])
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,tags.cs.{${search}},campaign.ilike.%${search}%`)
    }

    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) throw error
    return NextResponse.json((data || []).map(snakeToCamel))
  } catch (error) {
    console.error('Marketing GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch marketing data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const contentType = request.headers.get('content-type') || ''

    // File upload (multipart)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const module = (formData.get('module') as string) || ''
      const type = (formData.get('type') as string) || ''
      const name = (formData.get('name') as string) || file?.name || 'Untitled'
      const tags = (formData.get('tags') as string) || ''

      if (!file) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 })
      }

      if (!VALID_MODULES.includes(module as any)) {
        return NextResponse.json({ error: `Invalid module. Must be one of: ${VALID_MODULES.join(', ')}` }, { status: 400 })
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `File type ${file.type} is not allowed` }, { status: 400 })
      }

      const storagePath = generateStoragePath(module, file.name)
      const client = await supabase()
      const now = new Date().toISOString()

      await uploadFile(storagePath, file)

      const parsedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

      const { data: asset, error } = await client.from('marketing_brand_assets').insert({
        name,
        type,
        url: '',  // url column keeps backward compat; storage metadata in dedicated columns
        bucket: 'boma-images',
        storage_path: storagePath,
        module,
        tags: parsedTags,
        category: module,
        created_by: formData.get('createdBy') as string || '',
        created_at: now,
        updated_at: now,
      }).select().single()

      if (error) {
        await deleteFile(storagePath).catch(() => {})
        throw error
      }

      return NextResponse.json({
        success: true,
        data: asset,
        resolvedUrl: getAssetUrl(asset),
      })
    }

    const body = await request.json()
    const client = await supabase()
    const now = new Date().toISOString()
    const scope = body.scope || 'project'

    // Create brand asset
    if (scope === 'asset') {
      const { data, error } = await client.from('marketing_brand_assets').insert({
        name: body.name,
        type: body.type,
        url: body.url || '',
        value: body.value || '',
        preview: body.preview || '',
        category: body.category || '',
        tags: body.tags || [],
        created_by: body.createdBy || '',
        created_at: now,
        updated_at: now,
      }).select().single()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    // Create template
    if (scope === 'template') {
      const { data, error } = await client.from('marketing_templates').insert({
        name: body.name,
        type: body.type,
        category: body.category || '',
        description: body.description || '',
        thumbnail: body.thumbnail || '',
        design_data: body.designData || {},
        tags: body.tags || [],
        is_built_in: false,
        language: body.language || '',
        created_by: body.createdBy || '',
        created_at: now,
        updated_at: now,
      }).select().single()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    // Create project (optionally from template)
    const projectId = randomUUID()

    const { data: project, error: projectError } = await client.from('marketing_projects').insert({
      id: projectId,
      name: body.name || 'Untitled Project',
      type: body.type || 'flyer',
      template_id: body.templateId || null,
      project_data: body.projectData || {},
      thumbnail: body.thumbnail || '',
      status: 'draft',
      tags: body.tags || [],
      campaign: body.campaign || '',
      language: body.language || '',
      created_by: body.createdBy || '',
      created_at: now,
      updated_at: now,
    }).select().single()
    if (projectError) throw projectError

    // Create initial version
    await client.from('marketing_project_versions').insert({
      project_id: projectId,
      version_number: 1,
      project_data: body.projectData || {},
      created_by: body.createdBy || '',
      created_at: now,
      description: 'Initial version',
    })

    return NextResponse.json({ success: true, data: snakeToCamel(project) })
  } catch (error) {
    console.error('Marketing POST error:', error)
    return NextResponse.json({ error: 'Failed to create marketing item' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const body = await request.json()
    const client = await supabase()
    const now = new Date().toISOString()
    const scope = body.scope || 'project'

    // Update brand asset
    if (scope === 'asset') {
      const updates: any = {
        name: body.name,
        type: body.type,
        value: body.value || '',
        preview: body.preview || '',
        category: body.category || '',
        tags: body.tags || [],
        updated_at: now,
      }
      if (body.url !== undefined) updates.url = body.url
      if (body.module !== undefined) updates.module = body.module
      if (body.storage_path !== undefined) updates.storage_path = body.storage_path
      if (body.bucket !== undefined) updates.bucket = body.bucket
      const { error } = await client.from('marketing_brand_assets').update(updates).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Update template
    if (scope === 'template') {
      const { error } = await client.from('marketing_templates').update({
        name: body.name,
        category: body.category || '',
        description: body.description || '',
        thumbnail: body.thumbnail || '',
        design_data: body.designData || {},
        tags: body.tags || [],
        language: body.language || '',
        updated_at: now,
      }).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (!body.id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const unlock = body.unlock === true

    // Update project
    const updateData: any = {
      updated_at: now,
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.projectData !== undefined) updateData.project_data = body.projectData
    if (body.status !== undefined) updateData.status = body.status
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.campaign !== undefined) updateData.campaign = body.campaign
    if (body.language !== undefined) updateData.language = body.language
    if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail

    // Locking
    if (unlock) {
      updateData.locked_by = ''
      updateData.locked_at = null
    } else if (body.lock === true) {
      updateData.locked_by = body.lockedBy || ''
      updateData.locked_at = now
    }

    const { error: updateError } = await client.from('marketing_projects').update(updateData).eq('id', body.id)
    if (updateError) throw updateError

    // Create new version if project data changed
    if (body.projectData !== undefined && body.createVersion !== false) {
      const { data: versions } = await client
        .from('marketing_project_versions')
        .select('version_number')
        .eq('project_id', body.id)
        .order('version_number', { ascending: false })
        .limit(1)

      const nextVersion = (versions && versions.length > 0 ? versions[0].version_number : 0) + 1

      await client.from('marketing_project_versions').insert({
        project_id: body.id,
        version_number: nextVersion,
        project_data: body.projectData,
        created_by: body.createdBy || '',
        created_at: now,
        description: body.versionDescription || `Version ${nextVersion}`,
      })
    }

    const { data: updated } = await client.from('marketing_projects').select('*').eq('id', body.id).single()
    return NextResponse.json({ success: true, data: snakeToCamel(updated) })
  } catch (error) {
    console.error('Marketing PUT error:', error)
    return NextResponse.json({ error: 'Failed to update marketing item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const scope = searchParams.get('scope') || 'project'
    const hardDelete = searchParams.get('hardDelete') === 'true'

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const client = await supabase()

    if (scope === 'asset') {
      // Fetch before deleting to get storage_path
      const { data: asset } = await client.from('marketing_brand_assets').select('storage_path').eq('id', id).single()
      await client.from('marketing_brand_assets').delete().eq('id', id)
      // Clean up Supabase Storage if this was a stored asset
      if (asset?.storage_path) {
        await deleteFile(asset.storage_path).catch(() => {})
      }
      return NextResponse.json({ success: true })
    }

    if (scope === 'template') {
      await client.from('marketing_templates').delete().eq('id', id)
      return NextResponse.json({ success: true })
    }

    if (hardDelete) {
      await client.from('marketing_project_versions').delete().eq('project_id', id)
      await client.from('marketing_projects').delete().eq('id', id)
      return NextResponse.json({ success: true })
    }

    // Soft delete
    await client.from('marketing_projects').update({
      status: 'deleted',
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Marketing DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete marketing item' }, { status: 500 })
  }
}
