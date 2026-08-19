import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const EXPECTED_INLINE_IMAGES = 6
const WEBP_QUALITY = 82
const MAX_WIDTH = 1600

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const originalsDir = join(scriptDir, 'originals')
const outputDir = join(repoRoot, 'public', 'menu', 'migrated')
const manifestPath = join(scriptDir, 'manifest.json')

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseDataUri(value) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(value)
  if (!match) throw new Error('Unsupported inline image value')
  return { mimeType: match[1].toLowerCase(), bytes: Buffer.from(match[2], 'base64') }
}

function pngDimensions(bytes) {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Expected a PNG image')
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

async function writeOrVerify(path, bytes) {
  try {
    const existing = await readFile(path)
    if (sha256(existing) !== sha256(bytes)) throw new Error(`Existing backup differs: ${path}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    await writeFile(path, bytes)
  }
}

function createWebp(inputPath, outputPath, width) {
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath]
  if (width > MAX_WIDTH) args.push('-vf', `scale=${MAX_WIDTH}:-2`)
  args.push('-c:v', 'libwebp', '-quality', String(WEBP_QUALITY), '-compression_level', '6', '-preset', 'picture', outputPath)

  const result = spawnSync('ffmpeg', args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || 'ffmpeg failed')
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase environment variables are required')

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from('menu_items')
    .select('id,name,image')
    .ilike('image', 'data:%')
    .order('id')

  if (error) throw error
  if ((data ?? []).length !== EXPECTED_INLINE_IMAGES) {
    throw new Error(`Expected ${EXPECTED_INLINE_IMAGES} inline images, found ${(data ?? []).length}`)
  }

  await mkdir(originalsDir, { recursive: true })
  await mkdir(outputDir, { recursive: true })

  const entries = []
  for (const row of data ?? []) {
    const currentValue = String(row.image ?? '')
    const { mimeType, bytes } = parseDataUri(currentValue)
    const dimensions = pngDimensions(bytes)
    const baseName = `${slugify(row.name)}-${row.id.slice(0, 8)}`
    const originalPath = join(originalsDir, `${baseName}.png`)
    const outputPath = join(outputDir, `${baseName}.webp`)

    await writeOrVerify(originalPath, bytes)
    createWebp(originalPath, outputPath, dimensions.width)
    const optimized = await readFile(outputPath)

    entries.push({
      menuItemId: row.id,
      menuItemName: row.name,
      currentImage: {
        valueType: 'data-uri',
        mimeType,
        characterLength: currentValue.length,
        dataUriSha256: sha256(Buffer.from(currentValue, 'utf8')),
        binaryBytes: bytes.length,
        binarySha256: sha256(bytes),
        width: dimensions.width,
        height: dimensions.height,
      },
      proposedImage: {
        sourceFile: relative(repoRoot, outputPath).replaceAll('\\', '/'),
        objectName: `menu/migrated/${baseName}.webp`,
        finalPath: `/menu/migrated/${baseName}.webp`,
        mimeType: 'image/webp',
        bytes: optimized.length,
        sha256: sha256(optimized),
        maxWidth: MAX_WIDTH,
        quality: WEBP_QUALITY,
      },
      rollback: {
        originalFile: relative(repoRoot, originalPath).replaceAll('\\', '/'),
        reconstructAs: `${mimeType};base64`,
        expectedDataUriSha256: sha256(Buffer.from(currentValue, 'utf8')),
        sqlTemplate: `UPDATE public.menu_items SET image = :reconstructed_data_uri WHERE id = '${row.id}';`,
      },
    })
  }

  const manifest = {
    version: 1,
    sourceTable: 'public.menu_items',
    imageField: 'image',
    expectedInlineImageCount: EXPECTED_INLINE_IMAGES,
    productionMutationPerformed: false,
    entries,
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  const originalBytes = entries.reduce((sum, entry) => sum + entry.currentImage.binaryBytes, 0)
  const optimizedBytes = entries.reduce((sum, entry) => sum + entry.proposedImage.bytes, 0)
  console.log(JSON.stringify({ images: entries.length, originalBytes, optimizedBytes, savedBytes: originalBytes - optimizedBytes, manifest: relative(repoRoot, manifestPath) }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
