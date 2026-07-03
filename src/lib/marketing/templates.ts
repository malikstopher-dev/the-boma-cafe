import { Template, DesignData } from './types'

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'flyer-happy-hour',
    name: 'Happy Hour Special',
    type: 'flyer',
    category: 'Promotions',
    description: 'Happy hour drink specials flyer with classic warm tones',
    isBuiltIn: true,
    tags: ['promotion', 'drinks', 'weekend'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    designData: {
      width: 2480, height: 3508, dpi: 300,
      background: {
        type: 'gradient',
        gradient: { type: 'linear', angle: 135, stops: [{ color: '#FDF8F3', position: 0 }, { color: '#F5EDE3', position: 100 }] },
      },
      elements: [
        { id: 'fh1', type: 'text', x: 200, y: 400, width: 2080, height: 200, rotation: 0, opacity: 1, visible: true, zIndex: 1,
          props: { content: 'HAPPY HOUR', fontFamily: 'Playfair Display', fontSize: 120, fontWeight: 700, fontStyle: 'normal', textAlign: 'center', color: '#C26A2D', lineHeight: 1.2, letterSpacing: 4, textTransform: 'uppercase' } },
        { id: 'fh2', type: 'text', x: 200, y: 650, width: 2080, height: 120, rotation: 0, opacity: 1, visible: true, zIndex: 2,
          props: { content: 'Every Friday & Saturday • 5PM - 7PM', fontFamily: 'Poppins', fontSize: 40, fontWeight: 500, fontStyle: 'normal', textAlign: 'center', color: '#4B4033', lineHeight: 1.5, letterSpacing: 2, textTransform: 'none' } },
        { id: 'fh3', type: 'text', x: 400, y: 900, width: 1680, height: 600, rotation: 0, opacity: 1, visible: true, zIndex: 3,
          props: { content: 'Buy One Get One Free\non selected cocktails\n\n*T&Cs apply', fontFamily: 'Poppins', fontSize: 36, fontWeight: 400, fontStyle: 'normal', textAlign: 'center', color: '#7A6A58', lineHeight: 1.6, letterSpacing: 0.5, textTransform: 'none' } },
      ],
      assets: [],
    },
  },
  {
    id: 'social-weekend-buffet',
    name: 'Weekend Buffet',
    type: 'social',
    category: 'Food',
    description: 'Square social media post for weekend buffet',
    isBuiltIn: true,
    tags: ['food', 'buffet', 'weekend'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    designData: {
      width: 1080, height: 1080, dpi: 72,
      background: {
        type: 'gradient',
        gradient: { type: 'linear', angle: 180, stops: [{ color: '#C26A2D', position: 0 }, { color: '#8B4513', position: 100 }] },
      },
      elements: [
        { id: 'sw1', type: 'text', x: 80, y: 200, width: 920, height: 160, rotation: 0, opacity: 1, visible: true, zIndex: 1,
          props: { content: 'WEEKEND BUFFET', fontFamily: 'Playfair Display', fontSize: 72, fontWeight: 700, fontStyle: 'normal', textAlign: 'center', color: '#FFFFFF', lineHeight: 1.2, letterSpacing: 3, textTransform: 'uppercase' } },
        { id: 'sw2', type: 'text', x: 80, y: 400, width: 920, height: 100, rotation: 0, opacity: 1, visible: true, zIndex: 2,
          props: { content: 'Saturdays & Sundays', fontFamily: 'Poppins', fontSize: 32, fontWeight: 500, fontStyle: 'normal', textAlign: 'center', color: '#F5EDE3', lineHeight: 1.5, letterSpacing: 2, textTransform: 'none' } },
        { id: 'sw3', type: 'text', x: 80, y: 550, width: 920, height: 200, rotation: 0, opacity: 1, visible: true, zIndex: 3,
          props: { content: '9:30 AM - 2:30 PM\nR89 per adult | R45 per kid', fontFamily: 'Poppins', fontSize: 28, fontWeight: 400, fontStyle: 'normal', textAlign: 'center', color: '#F5EDE3', lineHeight: 1.6, letterSpacing: 0.5, textTransform: 'none' } },
      ],
      assets: [],
    },
  },
  {
    id: 'event-poster-live',
    name: 'Live Entertainment',
    type: 'event_poster',
    category: 'Events',
    description: 'Live music event poster',
    isBuiltIn: true,
    tags: ['events', 'music', 'entertainment'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    designData: {
      width: 3508, height: 4960, dpi: 300,
      background: {
        type: 'gradient',
        gradient: { type: 'radial', angle: 0, stops: [{ color: '#FDF8F3', position: 0 }, { color: '#E8D5C4', position: 100 }] },
      },
      elements: [
        { id: 'ep1', type: 'text', x: 300, y: 600, width: 2908, height: 300, rotation: 0, opacity: 1, visible: true, zIndex: 1,
          props: { content: 'LIVE ENTERTAINMENT', fontFamily: 'Playfair Display', fontSize: 160, fontWeight: 700, fontStyle: 'normal', textAlign: 'center', color: '#1F1F1F', lineHeight: 1.2, letterSpacing: 6, textTransform: 'uppercase' } },
        { id: 'ep2', type: 'text', x: 300, y: 950, width: 2908, height: 150, rotation: 0, opacity: 1, visible: true, zIndex: 2,
          props: { content: 'Thursday to Sunday', fontFamily: 'Poppins', fontSize: 48, fontWeight: 500, fontStyle: 'normal', textAlign: 'center', color: '#4B4033', lineHeight: 1.5, letterSpacing: 3, textTransform: 'none' } },
      ],
      assets: [],
    },
  },
]

export function getTemplatesByType(type: string): Template[] {
  return BUILT_IN_TEMPLATES.filter(t => t.type === type)
}

export function getTemplateById(id: string): Template | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id)
}
