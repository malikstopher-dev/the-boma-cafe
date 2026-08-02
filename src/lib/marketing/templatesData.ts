import {
  Template, DesignData, DesignElement, GeneratorType, TextProps, ImageProps, ShapeProps, QRProps,
} from './types'
import {
  BOMA_TEMPLATES, BomaTemplate, BomaAssetType,
} from './bomaMarketingTemplates'
import { BUILT_IN_TEMPLATES } from './templates'

export const BOMA_GENERATOR_TYPE_MAP: Record<BomaAssetType, GeneratorType> = {
  Flyer: 'flyer',
  SocialMediaPost: 'social',
  PosterLarge: 'poster',
  GiftVoucher: 'voucher',
  LoyaltyCard: 'loyalty',
  TableTent: 'table_tent',
  EventPoster: 'event_poster',
  QRCodeStand: 'qr',
}

const FONT_MAP: Record<string, { fontFamily: string; fontWeight: number; fontStyle: 'normal' | 'italic' }> = {
  BomaScript: { fontFamily: 'Dancing Script', fontWeight: 400, fontStyle: 'normal' },
  BomaHeaderBold: { fontFamily: 'Montserrat', fontWeight: 800, fontStyle: 'normal' },
  BomaBody: { fontFamily: 'Poppins', fontWeight: 400, fontStyle: 'normal' },
  BomaBodyItalic: { fontFamily: 'Poppins', fontWeight: 400, fontStyle: 'italic' },
}

function asBag(style: unknown): Record<string, any> {
  return (style && typeof style === 'object' ? style : {}) as Record<string, any>
}

function num(value: any, fallback = 0): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    return isFinite(n) ? n : fallback
  }
  return fallback
}

function toRadius(value: any): number {
  const n = num(value)
  return n === 0 ? 0 : Math.round(n)
}

function parseBorder(border: any): { borderWidth?: number; borderColor?: string } {
  if (typeof border !== 'string') return {}
  const m = border.match(/^(\d+)px\s+(?:solid|dashed|dotted)\s+(#[0-9a-fA-F]{3,8})/)
  if (!m) return {}
  return { borderWidth: parseInt(m[1], 10), borderColor: m[2] }
}

function toBackground(b: BomaTemplate): DesignData['background'] {
  const baseColor = b.backgroundStyle.baseColor || '#FFFFFF'
  switch (b.backgroundStyle.gradientType) {
    case 'split_red_dark':
      return {
        type: 'gradient',
        gradient: { type: 'linear', angle: 180, stops: [{ color: '#E31B23', position: 0 }, { color: baseColor, position: 100 }] },
      }
    case 'bottom_fade':
      return {
        type: 'gradient',
        gradient: { type: 'linear', angle: 180, stops: [{ color: baseColor, position: 0 }, { color: '#0A0A0A', position: 100 }] },
      }
    default:
      return { type: 'solid', color: baseColor }
  }
}

function toShapeType(t: string | undefined): ShapeProps['shapeType'] {
  switch (t) {
    case 'scallop_circle':
    case 'grid_circles':
    case 'icon':
      return 'circle'
    case 'line':
      return 'line'
    case 'rounded-rect':
    case 'rect_gradient':
    case 'border_pattern':
      return 'rounded-rect'
    case 'rect':
    default:
      return 'rectangle'
  }
}

function toElements(b: BomaTemplate): DesignElement[] {
  const w = b.canvasSize.width
  const h = b.canvasSize.height
  const pxW = (pct: number) => Math.round((pct / 100) * w)
  const pxH = (pct: number) => Math.round((pct / 100) * h)

  return b.elements.map(el => {
    const pos = el.position
    const style = asBag(el.style)
    const rotation = pos.rotation ?? style.rotation ?? 0
    const opacity = typeof style.opacity === 'number' ? style.opacity : 1
    const base = {
      id: el.id,
      x: pxW(pos.x),
      y: pxH(pos.y),
      rotation,
      opacity,
      visible: true,
      zIndex: pos.zIndex,
    }

    switch (el.type) {
      case 'text': {
        const font = FONT_MAP[style.fontFamily] || FONT_MAP.BomaBody
        const props: TextProps = {
          content: el.content ?? '',
          fontFamily: font.fontFamily,
          fontSize: num(style.fontSize, 24),
          fontWeight: font.fontWeight,
          fontStyle: font.fontStyle,
          textAlign: style.textAlign ?? 'center',
          color: style.color ?? '#0A0A0A',
          lineHeight: num(style.lineHeight, 1.2),
          letterSpacing: 0,
          textTransform: style.textTransform === 'uppercase' ? 'uppercase' : 'none',
        }
        const width = pxW(pos.width ?? 80)
        const lineCount = (props.content.match(/\n/g) || []).length + 1
        const height = Math.round(props.fontSize * props.lineHeight * lineCount)
        return { ...base, type: 'text', width, height, props }
      }
      case 'image_placeholder':
      case 'logo': {
        const border = parseBorder(style.border)
        const props: ImageProps = {
          src: '',
          fit: style.objectFit === 'contain' ? 'contain' : 'cover',
          borderRadius: toRadius(style.borderRadius ?? (style.shapeType === 'food_photo_frame' ? 9999 : 0)),
          ...(border.borderColor && border.borderWidth ? { borderColor: border.borderColor, borderWidth: border.borderWidth } : {}),
        }
        const width = pxW(pos.width ?? 40)
        const height = pxH(pos.height ?? (pos.width ?? 40) * 0.75)
        return { ...base, type: 'image', width, height, props }
      }
      case 'shape': {
        const props: ShapeProps = {
          shapeType: toShapeType(style.shapeType),
          fillColor: style.fillColor ?? style.colorStart ?? 'transparent',
          borderRadius: toRadius(style.borderRadius),
        }
        const width = pxW(pos.width ?? 20)
        const height = pxH(pos.height ?? (pos.width ?? 20))
        return { ...base, type: 'shape', width, height, props }
      }
      case 'qr_code': {
        const size = pxW(pos.width ?? 20)
        const props: QRProps = {
          url: '',
          fgColor: style.foregroundColor ?? '#0A0A0A',
          bgColor: style.backgroundColor === 'transparent' ? '#FFFFFF' : (style.backgroundColor ?? '#FFFFFF'),
          size,
        }
        return { ...base, type: 'qr', width: size, height: size, props }
      }
      default: {
        const props: ShapeProps = { shapeType: 'rectangle', fillColor: 'transparent', borderRadius: 0 }
        const width = pxW(pos.width ?? 20)
        const height = pxH(pos.height ?? (pos.width ?? 20))
        return { ...base, type: 'shape', width, height, props }
      }
    }
  })
}

export function convertBomaTemplate(t: BomaTemplate): Template {
  return {
    id: t.id,
    name: t.name,
    type: BOMA_GENERATOR_TYPE_MAP[t.type],
    category: 'Boma Brand',
    description: `${t.name} • ${t.canvasSize.width}×${t.canvasSize.height}px (${t.canvasSize.aspectRatio})`,
    isBuiltIn: true,
    tags: ['boma', 'brand', t.type.toLowerCase()],
    createdAt: '2026-08-03T00:00:00Z',
    updatedAt: '2026-08-03T00:00:00Z',
    designData: {
      width: t.canvasSize.width,
      height: t.canvasSize.height,
      dpi: 300,
      background: toBackground(t),
      elements: toElements(t),
      assets: [],
    },
  }
}

export const BOMA_BUILT_IN_TEMPLATES: Template[] = BOMA_TEMPLATES.map(convertBomaTemplate)

export const ALL_MARKETING_TEMPLATES: Template[] = [...BUILT_IN_TEMPLATES, ...BOMA_BUILT_IN_TEMPLATES]

export function getMergedTemplateById(id: string): Template | undefined {
  return ALL_MARKETING_TEMPLATES.find(t => t.id === id)
}

export function getBomaTemplateByType(type: GeneratorType): Template | undefined {
  return BOMA_BUILT_IN_TEMPLATES.find(t => t.type === type)
}

export function getMergedTemplatesByType(type: GeneratorType | string): Template[] {
  return ALL_MARKETING_TEMPLATES.filter(t => t.type === type || !t.type)
}