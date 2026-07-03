import {
  DesignData, ExportFormat, GeneratorResult, BackgroundConfig,
  DesignElement, TextProps, ImageProps, ShapeProps, QRProps,
} from './types'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function renderBackground(ctx: CanvasRenderingContext2D, bg: BackgroundConfig, w: number, h: number): Promise<void> {
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color || '#FFFFFF'
    ctx.fillRect(0, 0, w, h)
  } else if (bg.type === 'gradient' && bg.gradient) {
    let gradient: CanvasGradient
    if (bg.gradient.type === 'linear') {
      const rad = (bg.gradient.angle * Math.PI) / 180
      const cx = w / 2, cy = h / 2
      const dx = Math.cos(rad) * w, dy = Math.sin(rad) * h
      gradient = ctx.createLinearGradient(cx - dx / 2, cy - dy / 2, cx + dx / 2, cy + dy / 2)
    } else {
      gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2)
    }
    for (const stop of bg.gradient.stops) {
      gradient.addColorStop(stop.position / 100, stop.color)
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  } else if (bg.type === 'image' && bg.imageSrc) {
    try {
      const img = await loadImage(bg.imageSrc)
      ctx.drawImage(img, 0, 0, w, h)
    } catch {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, w, h)
    }
  }
}

function renderText(ctx: CanvasRenderingContext2D, el: DesignElement): void {
  const p = el.props as TextProps
  ctx.save()
  ctx.globalAlpha = el.opacity
  const rad = (el.rotation * Math.PI) / 180
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate(rad)
  ctx.translate(-(el.x + el.width / 2), -(el.y + el.height / 2))

  ctx.font = `${p.fontStyle === 'italic' ? 'italic ' : ''}${p.fontWeight} ${p.fontSize}px "${p.fontFamily}", serif`
  ctx.fillStyle = p.color
  ctx.textAlign = p.textAlign
  ctx.textBaseline = 'top'

  const lines = (p.content || '').split('\n')
  const alignX = p.textAlign === 'center' ? el.x + el.width / 2 : p.textAlign === 'right' ? el.x + el.width : el.x
  let y = el.y
  const lineH = p.fontSize * (p.lineHeight || 1.5)

  for (const line of lines) {
    let displayText = line
    if (p.textTransform === 'uppercase') displayText = line.toUpperCase()
    else if (p.textTransform === 'lowercase') displayText = line.toLowerCase()
    else if (p.textTransform === 'capitalize') displayText = line.replace(/\b\w/g, c => c.toUpperCase())
    ctx.fillText(displayText, alignX, y)
    y += lineH
  }
  ctx.restore()
}

async function renderImage(ctx: CanvasRenderingContext2D, el: DesignElement): Promise<void> {
  const p = el.props as ImageProps
  if (!p.src) return
  ctx.save()
  ctx.globalAlpha = el.opacity
  const rad = (el.rotation * Math.PI) / 180
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate(rad)
  ctx.translate(-(el.x + el.width / 2), -(el.y + el.height / 2))

  if (p.borderRadius) {
    const r = p.borderRadius
    ctx.beginPath()
    ctx.moveTo(el.x + r, el.y)
    ctx.lineTo(el.x + el.width - r, el.y)
    ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + r)
    ctx.lineTo(el.x + el.width, el.y + el.height - r)
    ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - r, el.y + el.height)
    ctx.lineTo(el.x + r, el.y + el.height)
    ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - r)
    ctx.lineTo(el.x, el.y + r)
    ctx.quadraticCurveTo(el.x, el.y, el.x + r, el.y)
    ctx.closePath()
    ctx.clip()
  }

  try {
    const img = await loadImage(p.src)
    if (p.fit === 'cover') {
      const scale = Math.max(el.width / img.width, el.height / img.height)
      const sw = img.width * scale, sh = img.height * scale
      const sx = el.x - (sw - el.width) / 2, sy = el.y - (sh - el.height) / 2
      ctx.drawImage(img, sx, sy, sw, sh)
    } else if (p.fit === 'contain') {
      const scale = Math.min(el.width / img.width, el.height / img.height)
      const sw = img.width * scale, sh = img.height * scale
      const sx = el.x + (el.width - sw) / 2, sy = el.y + (el.height - sh) / 2
      ctx.drawImage(img, sx, sy, sw, sh)
    } else {
      ctx.drawImage(img, el.x, el.y, el.width, el.height)
    }
  } catch {
    ctx.fillStyle = '#E8D5C4'
    ctx.fillRect(el.x, el.y, el.width, el.height)
  }
  ctx.restore()
}

function renderShape(ctx: CanvasRenderingContext2D, el: DesignElement): void {
  const p = el.props as ShapeProps
  ctx.save()
  ctx.globalAlpha = el.opacity
  const rad = (el.rotation * Math.PI) / 180
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate(rad)
  ctx.translate(-(el.x + el.width / 2), -(el.y + el.height / 2))

  ctx.beginPath()
  if (p.shapeType === 'circle') {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2
    const r = Math.min(el.width, el.height) / 2
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  } else if (p.shapeType === 'rounded-rect' || (p.shapeType === 'rectangle' && p.borderRadius)) {
    const rad2 = p.borderRadius || 0
    ctx.moveTo(el.x + rad2, el.y)
    ctx.lineTo(el.x + el.width - rad2, el.y)
    ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + rad2)
    ctx.lineTo(el.x + el.width, el.y + el.height - rad2)
    ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - rad2, el.y + el.height)
    ctx.lineTo(el.x + rad2, el.y + el.height)
    ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - rad2)
    ctx.lineTo(el.x, el.y + rad2)
    ctx.quadraticCurveTo(el.x, el.y, el.x + rad2, el.y)
    ctx.closePath()
  } else {
    ctx.rect(el.x, el.y, el.width, el.height)
  }

  if (p.fillColor) {
    ctx.fillStyle = p.fillColor
    ctx.fill()
  }
  if (p.borderColor && p.borderWidth) {
    ctx.strokeStyle = p.borderColor
    ctx.lineWidth = p.borderWidth
    ctx.stroke()
  }
  ctx.restore()
}

async function renderQR(ctx: CanvasRenderingContext2D, el: DesignElement): Promise<void> {
  const p = el.props as QRProps
  if (!p.url) return
  ctx.save()
  ctx.globalAlpha = el.opacity

  const qrSize = p.size || Math.min(el.width, el.height)
  const qrX = el.x + (el.width - qrSize) / 2
  const qrY = el.y + (el.height - qrSize) / 2

  ctx.fillStyle = p.bgColor || '#FFFFFF'
  ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8)

  ctx.fillStyle = p.fgColor || '#000000'
  const moduleCount = 25
  const moduleSize = qrSize / moduleCount
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if ((row * moduleCount + col * 7 + row * 3) % 5 < 2) {
        ctx.fillRect(qrX + col * moduleSize, qrY + row * moduleSize, moduleSize, moduleSize)
      }
    }
  }

  if (p.logoInset) {
    try {
      const logo = await loadImage(p.logoInset)
      const logoSize = qrSize * 0.25
      const lx = qrX + (qrSize - logoSize) / 2
      const ly = qrY + (qrSize - logoSize) / 2
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(lx - 4, ly - 4, logoSize + 8, logoSize + 8)
      ctx.drawImage(logo, lx, ly, logoSize, logoSize)
    } catch { }
  }
  ctx.restore()
}

export async function renderDesignToCanvas(
  canvas: HTMLCanvasElement,
  design: DesignData
): Promise<void> {
  if (!design || !design.width || !design.height) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = design.width
  canvas.height = design.height

  await renderBackground(ctx, design.background || { type: 'solid', color: '#FFFFFF' }, design.width, design.height)

  const sorted = [...design.elements].sort((a, b) => a.zIndex - b.zIndex)

  for (const el of sorted) {
    if (!el.visible) continue
    try {
      switch (el.type) {
        case 'text':
          renderText(ctx, el)
          break
        case 'image':
          await renderImage(ctx, el)
          break
        case 'shape':
          renderShape(ctx, el)
          break
        case 'qr':
          await renderQR(ctx, el)
          break
      }
    } catch (e) {
      console.error('Render element error:', el.id, e)
    }
  }
}

export async function exportDesign(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number = 0.92
): Promise<GeneratorResult> {
  const w = canvas.width
  const h = canvas.height

  switch (format) {
    case 'png': {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('PNG export failed')
      return { blob, url: URL.createObjectURL(blob), format, width: w, height: h }
    }
    case 'jpg': {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (!blob) throw new Error('JPG export failed')
      return { blob, url: URL.createObjectURL(blob), format, width: w, height: h }
    }
    case 'svg': {
      const dataUrl = canvas.toDataURL('image/png')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <image href="${dataUrl}" width="${w}" height="${h}" />
      </svg>`
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      return { blob, url: URL.createObjectURL(blob), format, width: w, height: h }
    }
    case 'html': {
      const dataUrl = canvas.toDataURL('image/png')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Export</title><style>
        body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f0f0}
        img{max-width:100%;height:auto;box-shadow:0 4px 24px rgba(0,0,0,0.15)}
      </style></head><body><img src="${dataUrl}" /></body></html>`
      const blob = new Blob([html], { type: 'text/html' })
      return { blob, url: URL.createObjectURL(blob), format, width: w, height: h }
    }
    case 'pdf': {
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      const pdfHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Export PDF</title><style>
        @page{margin:0}body{margin:0}img{width:100%;height:auto;display:block}
      </style></head><body><img src="${dataUrl}" /></body></html>`
      const blob = new Blob([pdfHtml], { type: 'text/html' })
      return { blob, url: URL.createObjectURL(blob), format: 'pdf', width: w, height: h }
    }
    case 'print': {
      const dataUrl = canvas.toDataURL('image/png')
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Print</title><style>
          @page{margin:0}body{margin:0}img{width:100%;height:auto;display:block}
        </style></head><body><img src="${dataUrl}" onload="window.print();window.close()" /></body></html>`)
        printWindow.document.close()
      }
      const blob = new Blob([dataUrl], { type: 'image/png' })
      return { blob, url: dataUrl, format, width: w, height: h }
    }
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

export function generateSVG(design: DesignData): string {
  const w = design.width, h = design.height
  let defs = ''
  let elements = ''

  if (design.background.type === 'solid') {
    elements += `<rect width="${w}" height="${h}" fill="${design.background.color || '#FFFFFF'}" />`
  } else if (design.background.type === 'gradient' && design.background.gradient) {
    const g = design.background.gradient
    const id = 'bg-grad'
    const stops = g.stops.map(s => `<stop offset="${s.position}%" stop-color="${s.color}" />`).join('')
    if (g.type === 'linear') {
      const rad = (g.angle * Math.PI) / 180
      defs += `<linearGradient id="${id}" x1="${50 - 50 * Math.cos(rad)}%" y1="${50 - 50 * Math.sin(rad)}%" x2="${50 + 50 * Math.cos(rad)}%" y2="${50 + 50 * Math.sin(rad)}%">${stops}</linearGradient>`
    } else {
      defs += `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stops}</radialGradient>`
    }
    elements += `<rect width="${w}" height="${h}" fill="url(#${id})" />`
  }

  const sorted = [...design.elements].sort((a, b) => a.zIndex - b.zIndex)
  for (const el of sorted) {
    if (!el.visible) continue
    const opacity = el.opacity < 1 ? ` opacity="${el.opacity}"` : ''
    const transform = el.rotation ? ` transform="rotate(${el.rotation} ${el.x + el.width / 2} ${el.y + el.height / 2})"` : ''

    if (el.type === 'text') {
      const p = el.props as TextProps
      const align = p.textAlign === 'center' ? 'middle' : p.textAlign === 'right' ? 'end' : 'start'
      const anchor = p.textAlign === 'center' ? el.x + el.width / 2 : p.textAlign === 'right' ? el.x + el.width : el.x
      const lines = (p.content || '').split('\n')
      const lineH = p.fontSize * (p.lineHeight || 1.5)
      const y0 = el.y
      const textAnchor = ` text-anchor="${align}"`
      const fill = ` fill="${p.color}"`
      const fontFamily = ` font-family="${p.fontFamily}"`
      const fontWeight = ` font-weight="${p.fontWeight}"`
      const fontSize = ` font-size="${p.fontSize}"`
      const letterSpacing = p.letterSpacing ? ` letter-spacing="${p.letterSpacing}"` : ''
      elements += lines.map((line, i) =>
        `<text x="${anchor}" y="${y0 + i * lineH}"${textAnchor}${fill}${fontFamily}${fontWeight}${fontSize}${letterSpacing}${opacity}${transform}>${escapeXml(line)}</text>`
      ).join('\n')
    } else if (el.type === 'image') {
      const p = el.props as ImageProps
      if (p.src) {
        const clipId = `clip-${el.id}`
        if (p.borderRadius) {
          const r = p.borderRadius
          defs += `<clipPath id="${clipId}"><rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${r}" ry="${r}" /></clipPath>`
          elements += `<image href="${p.src}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" preserveAspectRatio="${p.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}" clip-path="url(#${clipId})"${opacity}${transform} />`
        } else {
          elements += `<image href="${p.src}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" preserveAspectRatio="${p.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}"${opacity}${transform} />`
        }
      }
    } else if (el.type === 'shape') {
      const p = el.props as ShapeProps
      const fill = p.fillColor ? ` fill="${p.fillColor}"` : ''
      const stroke = p.borderColor ? ` stroke="${p.borderColor}"` : ''
      const strokeWidth = p.borderWidth ? ` stroke-width="${p.borderWidth}"` : ''
      if (p.shapeType === 'circle') {
        const cx = el.x + el.width / 2, cy = el.y + el.height / 2, r = Math.min(el.width, el.height) / 2
        elements += `<circle cx="${cx}" cy="${cy}" r="${r}"${fill}${stroke}${strokeWidth}${opacity}${transform} />`
      } else {
        const rx = p.borderRadius || 0
        elements += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" ry="${rx}"${fill}${stroke}${strokeWidth}${opacity}${transform} />`
      }
    } else if (el.type === 'qr') {
      const p = el.props as QRProps
      const size = p.size || Math.min(el.width, el.height)
      const qrX = el.x + (el.width - size) / 2
      const qrY = el.y + (el.height - size) / 2
      elements += `<rect x="${qrX - 4}" y="${qrY - 4}" width="${size + 8}" height="${size + 8}" fill="${p.bgColor || '#FFFFFF'}"${opacity}${transform} />`
      const moduleCount = 25
      const moduleSize = size / moduleCount
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if ((row * moduleCount + col * 7 + row * 3) % 5 < 2) {
            elements += `<rect x="${qrX + col * moduleSize}" y="${qrY + row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${p.fgColor || '#000000'}" />`
          }
        }
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${elements}</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function createDefaultDesign(type: string, w: number, h: number): DesignData {
  return {
    width: w,
    height: h,
    dpi: 72,
    background: { type: 'solid', color: '#FFFFFF' },
    elements: [
      {
        id: 'default-title',
        type: 'text',
        x: w * 0.1, y: h * 0.3,
        width: w * 0.8, height: h * 0.2,
        rotation: 0, opacity: 1, visible: true, zIndex: 1,
        props: {
          content: 'New Design',
          fontFamily: 'Playfair Display',
          fontSize: Math.round(Math.min(w, h) * 0.08),
          fontWeight: 700, fontStyle: 'normal',
          textAlign: 'center', color: '#1F1F1F',
          lineHeight: 1.2, letterSpacing: 2,
          textTransform: 'none',
        },
      },
    ],
    assets: [],
  }
}
