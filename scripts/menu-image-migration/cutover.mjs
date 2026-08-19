import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const manifest = JSON.parse(await readFile(resolve(scriptDir, 'manifest.json'), 'utf8'))
const entries = [...manifest.entries].sort((a, b) => a.menuItemId.localeCompare(b.menuItemId))
const expectedIds = entries.map(entry => entry.menuItemId)

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function parseDataUri(value) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(value)
  if (!match) throw new Error('Expected a base64 image data URI')
  return Buffer.from(match[2], 'base64')
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase environment variables are required')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function fetchRows(client) {
  const { data, error } = await client
    .from('menu_items')
    .select('id,name,image')
    .in('id', expectedIds)
    .order('id')
  if (error) throw error
  return data ?? []
}

async function verifyLocalArtifacts() {
  for (const entry of entries) {
    const original = await readFile(resolve(repoRoot, entry.rollback.originalFile))
    if (sha256(original) !== entry.currentImage.binarySha256) {
      throw new Error(`Rollback PNG hash mismatch for ${entry.menuItemId}`)
    }
    const reconstructed = `data:${entry.rollback.reconstructAs},${original.toString('base64')}`
    if (sha256(Buffer.from(reconstructed, 'utf8')) !== entry.rollback.expectedDataUriSha256) {
      throw new Error(`Rollback data URI hash mismatch for ${entry.menuItemId}`)
    }
    const optimized = await readFile(resolve(repoRoot, entry.proposedImage.sourceFile))
    if (sha256(optimized) !== entry.proposedImage.sha256) {
      throw new Error(`Optimized WebP hash mismatch for ${entry.menuItemId}`)
    }
  }
}

async function preflight(client, exportPath) {
  await verifyLocalArtifacts()
  const rows = await fetchRows(client)
  if (rows.length !== entries.length) throw new Error(`Expected ${entries.length} rows, found ${rows.length}`)

  const { data: inlineRows, error: inlineError } = await client
    .from('menu_items')
    .select('id')
    .ilike('image', 'data:%')
    .order('id')
  if (inlineError) throw inlineError
  const liveInlineIds = (inlineRows ?? []).map(row => row.id)
  if (JSON.stringify(liveInlineIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`Inline-image row set differs from manifest: ${JSON.stringify(liveInlineIds)}`)
  }

  for (const [index, row] of rows.entries()) {
    const entry = entries[index]
    if (!entry || row.id !== entry.menuItemId) throw new Error(`Row order/ID mismatch at index ${index}`)
    const image = String(row.image ?? '')
    if (sha256(Buffer.from(image, 'utf8')) !== entry.currentImage.dataUriSha256) {
      throw new Error(`Production data URI hash mismatch for ${row.id}`)
    }
    const bytes = parseDataUri(image)
    if (sha256(bytes) !== entry.currentImage.binarySha256) {
      throw new Error(`Production PNG hash mismatch for ${row.id}`)
    }
  }

  if (!exportPath) throw new Error('Preflight requires --export <absolute-path>')
  const artifact = {
    version: 1,
    capturedAt: new Date().toISOString(),
    sourceTable: 'public.menu_items',
    manifestVersion: manifest.version,
    rows,
  }
  await writeFile(exportPath, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' })

  return {
    outcome: 'preflight_passed',
    rows: rows.length,
    inlineRows: liveInlineIds.length,
    exportPath,
    exportSha256: sha256(await readFile(exportPath)),
  }
}

async function applyCutover(client) {
  const { data, error } = await client.rpc('apply_u1b_menu_image_cutover')
  if (error) throw error
  return data
}

async function verifyCutover(client) {
  const rows = await fetchRows(client)
  if (rows.length !== entries.length) throw new Error(`Expected ${entries.length} rows, found ${rows.length}`)
  for (const [index, row] of rows.entries()) {
    const entry = entries[index]
    if (!entry || row.id !== entry.menuItemId) throw new Error(`Row order/ID mismatch at index ${index}`)
    if (row.image !== entry.proposedImage.finalPath) {
      throw new Error(`Unexpected production path for ${row.id}: ${String(row.image)}`)
    }
  }
  const { count, error } = await client
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .ilike('image', 'data:%')
  if (error) throw error
  if (count !== 0) throw new Error(`Expected zero inline images, found ${count}`)
  return { outcome: 'cutover_verified', rows: rows.length, inlineRows: count }
}

async function rollback(client, exportPath) {
  if (!exportPath) throw new Error('Rollback requires --export <absolute-path>')
  const artifact = JSON.parse(await readFile(exportPath, 'utf8'))
  const rows = [...(artifact.rows ?? [])].sort((a, b) => a.id.localeCompare(b.id))
  if (rows.length !== entries.length) throw new Error(`Rollback export contains ${rows.length} rows`)
  for (const [index, row] of rows.entries()) {
    const entry = entries[index]
    if (!entry || row.id !== entry.menuItemId) throw new Error(`Rollback row mismatch at index ${index}`)
    if (sha256(Buffer.from(String(row.image ?? ''), 'utf8')) !== entry.rollback.expectedDataUriSha256) {
      throw new Error(`Rollback export hash mismatch for ${row.id}`)
    }
  }
  const { data, error } = await client.rpc('rollback_u1b_menu_image_cutover', {
    p_rows: rows.map(row => ({ id: row.id, image: row.image })),
  })
  if (error) throw error
  return data
}

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const command = process.argv[2]
const client = getClient()
let result
if (command === 'preflight') result = await preflight(client, readArg('--export'))
else if (command === 'apply') result = await applyCutover(client)
else if (command === 'verify') result = await verifyCutover(client)
else if (command === 'rollback') result = await rollback(client, readArg('--export'))
else throw new Error('Usage: cutover.mjs <preflight|apply|verify|rollback> [--export <absolute-path>]')

console.log(JSON.stringify(result, null, 2))
