export type GeneratorType =
  | 'flyer'
  | 'social'
  | 'poster'
  | 'voucher'
  | 'loyalty'
  | 'table_tent'
  | 'event_poster'
  | 'qr'
  | 'campaign'

export type ProjectStatus = 'draft' | 'published' | 'archived' | 'deleted'
export type TemplateCategory = string
export type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf' | 'html' | 'print'
export type MarketingRole = 'super_admin' | 'admin' | 'marketing_manager' | 'designer'

export interface MarketingProject {
  id: string
  name: string
  type: GeneratorType
  templateId?: string
  projectData: DesignData
  thumbnail?: string
  status: ProjectStatus
  tags: string[]
  campaign?: string
  language?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  lockedBy?: string
  lockedAt?: string
}

export interface MarketingProjectVersion {
  id: string
  projectId: string
  versionNumber: number
  projectData: DesignData
  createdBy?: string
  createdAt: string
  description?: string
}

export interface DesignData {
  width: number
  height: number
  dpi: number
  elements: DesignElement[]
  background: BackgroundConfig
  assets: AssetReference[]
}

export interface DesignElement {
  id: string
  type: 'text' | 'image' | 'shape' | 'qr' | 'icon' | 'pattern'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  zIndex: number
  props: TextProps | ImageProps | ShapeProps | QRProps | IconProps
}

export interface TextProps {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
  lineHeight: number
  letterSpacing: number
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

export interface ImageProps {
  src: string
  fit: 'cover' | 'contain' | 'fill'
  borderRadius: number
  borderColor?: string
  borderWidth?: number
}

export interface ShapeProps {
  shapeType: 'rectangle' | 'circle' | 'line' | 'rounded-rect'
  fillColor: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
}

export interface QRProps {
  url: string
  fgColor: string
  bgColor: string
  logoInset?: string
  size: number
}

export interface IconProps {
  iconName: string
  color: string
  size: number
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'pattern'
  color?: string
  gradient?: {
    type: 'linear' | 'radial'
    angle: number
    stops: { color: string; position: number }[]
  }
  imageSrc?: string
  patternId?: string
}

export interface AssetReference {
  assetId: string
  type: AssetType
  usage: 'background' | 'logo' | 'icon' | 'image' | 'pattern'
}

export type AssetType = 'logo' | 'font' | 'color' | 'icon' | 'background' | 'food_image' | 'pattern' | 'qr_preset' | 'campaign_image'

export interface BrandAsset {
  id: string
  name: string
  type: AssetType
  url?: string
  value?: string
  preview?: string
  category?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface MarketingPermission {
  role: MarketingRole
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canPublish: boolean
  canManageAssets: boolean
  canManageTemplates: boolean
  canManagePermissions: boolean
  canExport: boolean
}

export interface Template {
  id: string
  name: string
  type: GeneratorType
  category: TemplateCategory
  description: string
  thumbnail?: string
  designData: DesignData
  tags: string[]
  isBuiltIn: boolean
  createdAt: string
  updatedAt: string
  language?: string
}

export interface LockInfo {
  projectId: string
  lockedBy: string
  lockedAt: string
}

export interface ExportRequest {
  projectId: string
  format: ExportFormat
  scale?: number
  quality?: number
}

export interface GeneratorResult {
  blob: Blob
  url: string
  format: ExportFormat
  width: number
  height: number
}

export const GENERATOR_TYPES: { id: GeneratorType; label: string; icon: string; defaultWidth: number; defaultHeight: number; description: string }[] = [
  { id: 'flyer', label: 'Flyer Generator', icon: '📄', defaultWidth: 2480, defaultHeight: 3508, description: 'A4 promotional flyers' },
  { id: 'social', label: 'Social Media Post', icon: '📱', defaultWidth: 1080, defaultHeight: 1080, description: 'Square social media graphics' },
  { id: 'poster', label: 'Poster Generator', icon: '🖼️', defaultWidth: 3508, defaultHeight: 4960, description: 'Large format posters' },
  { id: 'voucher', label: 'Gift Voucher', icon: '🎁', defaultWidth: 640, defaultHeight: 400, description: 'Gift voucher cards' },
  { id: 'loyalty', label: 'Loyalty Card', icon: '💳', defaultWidth: 600, defaultHeight: 375, description: 'Customer loyalty cards' },
  { id: 'table_tent', label: 'Table Tent', icon: '🏴', defaultWidth: 1500, defaultHeight: 2100, description: 'Table top displays' },
  { id: 'event_poster', label: 'Event Poster', icon: '📅', defaultWidth: 2480, defaultHeight: 3508, description: 'Event announcement posters' },
  { id: 'qr', label: 'QR Code', icon: '📷', defaultWidth: 1000, defaultHeight: 1000, description: 'Customizable QR codes' },
  { id: 'campaign', label: 'Campaign Manager', icon: '🚀', defaultWidth: 1920, defaultHeight: 1080, description: 'Multi-channel campaigns' },
]

export const MARKETING_PERMISSIONS: Record<MarketingRole, MarketingPermission> = {
  super_admin: {
    role: 'super_admin', canCreate: true, canEdit: true, canDelete: true, canPublish: true,
    canManageAssets: true, canManageTemplates: true, canManagePermissions: true, canExport: true,
  },
  admin: {
    role: 'admin', canCreate: true, canEdit: true, canDelete: false, canPublish: true,
    canManageAssets: true, canManageTemplates: true, canManagePermissions: false, canExport: true,
  },
  marketing_manager: {
    role: 'marketing_manager', canCreate: true, canEdit: true, canDelete: false, canPublish: true,
    canManageAssets: true, canManageTemplates: false, canManagePermissions: false, canExport: true,
  },
  designer: {
    role: 'designer', canCreate: true, canEdit: true, canDelete: false, canPublish: false,
    canManageAssets: false, canManageTemplates: false, canManagePermissions: false, canExport: true,
  },
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
