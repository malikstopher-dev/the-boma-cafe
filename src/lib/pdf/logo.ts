import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

let cachedLogoDataUri: string | null = null
let cachedHeroDataUri: string | null = null

function findLogoPath(): string | null {
  const candidates = [
    join(process.cwd(), 'public', 'images', 'logo-pdf.png'),
    join(process.cwd(), 'public', 'logo.png'),
    join(process.cwd(), 'public', 'logo.svg'),
    join(process.cwd(), 'public', 'images', 'logo.png'),
    join(process.cwd(), 'public', 'images', 'logo.svg'),
    join(process.cwd(), 'public', 'assets', 'logo.png'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

function findHeroImagePath(): string | null {
  const candidates = [
    join(process.cwd(), 'videos', 'hero-poster.jpg'),
    join(process.cwd(), 'public', 'images', 'hero.jpg'),
    join(process.cwd(), 'public', 'hero.jpg'),
    join(process.cwd(), 'public', 'images', 'venue.jpg'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

export function getLogoDataUri(): string | null {
  if (cachedLogoDataUri) return cachedLogoDataUri

  try {
    const logoPath = findLogoPath()
    if (!logoPath) {
      console.warn('Logo file not found in public/')
      return null
    }

    const ext = logoPath.endsWith('.svg') ? 'svg+xml' : 'png'
    const buffer = readFileSync(logoPath)
    const base64 = buffer.toString('base64')
    cachedLogoDataUri = `data:image/${ext};base64,${base64}`
    return cachedLogoDataUri
  } catch (err) {
    console.error('Failed to load logo:', err)
    return null
  }
}

export function getHeroImageDataUri(): string | null {
  if (cachedHeroDataUri) return cachedHeroDataUri

  try {
    const heroPath = findHeroImagePath()
    if (!heroPath) {
      return null
    }

    const ext = heroPath.endsWith('.png') ? 'png' : 'jpeg'
    const buffer = readFileSync(heroPath)
    const base64 = buffer.toString('base64')
    cachedHeroDataUri = `data:image/${ext};base64,${base64}`
    return cachedHeroDataUri
  } catch (err) {
    console.error('Failed to load hero image:', err)
    return null
  }
}

export function clearLogoCache(): void {
  cachedLogoDataUri = null
  cachedHeroDataUri = null
}