import { getAdminClient } from './supabase'
import { randomUUID } from 'crypto'

const supabase = () => getAdminClient()

function mapRow(row: any, mapping: Record<string, string>): any {
  const result: any = {}
  for (const [from, to] of Object.entries(mapping)) {
    if (from in row) result[to] = row[from]
  }
  return result
}

function snakeToCamel(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
    result[camelKey] = value
  }
  return result
}

function camelToSnake(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

// --- Settings ---

export async function getAllSettings(): Promise<Record<string, any>> {
  const { data, error } = await (await supabase()).from('site_settings').select('key, value')
  if (error) throw error
  const settings: Record<string, any> = {}
  for (const row of data) {
    try { settings[row.key] = JSON.parse(row.value) } catch { settings[row.key] = row.value }
  }
  return settings
}

export async function setMultipleSettings(settings: Record<string, any>): Promise<boolean> {
  const client = await supabase()
  for (const [key, value] of Object.entries(settings)) {
    const { data: existing } = await client.from('site_settings').select('id').eq('key', key).maybeSingle()
    const payload = { key, value: JSON.stringify(value), updated_at: new Date().toISOString() }
    if (existing) {
      await client.from('site_settings').update(payload).eq('key', key)
    } else {
      await client.from('site_settings').insert({ ...payload, id: randomUUID() })
    }
  }
  return true
}

export async function getSetting(key: string): Promise<any> {
  const { data, error } = await (await supabase()).from('site_settings').select('value').eq('key', key).maybeSingle()
  if (error || !data) return null
  try { return JSON.parse(data.value) } catch { return data.value }
}

export async function setSetting(key: string, value: any): Promise<boolean> {
  const client = await supabase()
  const payload = { key, value: JSON.stringify(value), updated_at: new Date().toISOString() }
  const { data: existing } = await client.from('site_settings').select('id').eq('key', key).maybeSingle()
  if (existing) {
    await client.from('site_settings').update(payload).eq('key', key)
  } else {
    await client.from('site_settings').insert({ ...payload, id: randomUUID() })
  }
  return true
}

// --- Menu Categories ---

export async function getCategories(): Promise<any[]> {
  console.log("cms-supabase.getCategories() — querying menu_categories")
  const client = await supabase()
  console.log("cms-supabase.getCategories() — got admin client")
  const { data, error } = await client.from('menu_categories').select('*').order('order_index', { ascending: true })
  console.log("cms-supabase.getCategories() — query done, error:", error, "data count:", data?.length)
  if (error) {
    console.error("cms-supabase.getCategories() — Supabase error:", error)
    console.error("cms-supabase.getCategories() — error.code:", (error as any)?.code)
    console.error("cms-supabase.getCategories() — error.message:", (error as any)?.message)
    console.error("cms-supabase.getCategories() — error.details:", (error as any)?.details)
    console.error("cms-supabase.getCategories() — error.hint:", (error as any)?.hint)
    throw error
  }
  return (data || []).map(c => ({
    ...snakeToCamel(c),
    id: c.id,
    isActive: c.is_active,
    order: c.order_index,
  }))
}

export async function saveCategory(category: any): Promise<any> {
  const client = await supabase()
  const now = new Date().toISOString()
  const payload = {
    name: category.name,
    description: category.description || '',
    order_index: category.order || 0,
    is_active: category.isActive !== false,
    updated_at: now,
  }
  if (category.id) {
    await client.from('menu_categories').update(payload).eq('id', category.id)
    return category
  } else {
    const id = randomUUID()
    await client.from('menu_categories').insert({ ...payload, id, created_at: now })
    return { ...category, id }
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  const client = await supabase()
  await client.from('menu_items').delete().eq('category_id', id)
  await client.from('menu_categories').delete().eq('id', id)
  return true
}

// --- Menu Items ---

export async function getMenuItems(): Promise<any[]> {
  console.log("cms-supabase.getMenuItems() — querying menu_items")
  const client = await supabase()
  console.log("cms-supabase.getMenuItems() — got admin client")
  const { data, error } = await client.from('menu_items').select('*').order('order_index', { ascending: true })
  console.log("cms-supabase.getMenuItems() — query done, error:", error, "data count:", data?.length)
  if (error) {
    console.error("cms-supabase.getMenuItems() — Supabase error:", error)
    console.error("cms-supabase.getMenuItems() — error.code:", (error as any)?.code)
    console.error("cms-supabase.getMenuItems() — error.message:", (error as any)?.message)
    console.error("cms-supabase.getMenuItems() — error.details:", (error as any)?.details)
    console.error("cms-supabase.getMenuItems() — error.hint:", (error as any)?.hint)
    throw error
  }
  return (data || []).map(item => {
    const sizes = item.sizes ? JSON.parse(item.sizes) : null;
    const addOns = item.add_ons ? JSON.parse(item.add_ons) : null;
    return {
      ...snakeToCamel(item),
      id: item.id,
      categoryId: item.category_id,
      price: Number(item.price) || 0,
      isAvailable: item.is_available,
      isFeatured: item.is_featured,
      isOnPromo: item.is_on_promo,
      sizes: sizes ? sizes.map((s: any) => ({ ...s, price: Number(s.price) })) : null,
      addOns: addOns ? addOns.map((a: any) => ({ ...a, price: Number(a.price) })) : null,
      options: item.options ? JSON.parse(item.options) : null,
    };
  })
}

export async function saveMenuItem(item: any): Promise<any> {
  const client = await supabase()
  const now = new Date().toISOString()
  const payload = {
    category_id: item.categoryId || item.category_id,
    name: item.name,
    description: item.description || '',
    price: item.price || '',
    image: item.image || '',
    sizes: item.sizes ? JSON.stringify(item.sizes) : null,
    add_ons: item.addOns ? JSON.stringify(item.addOns) : null,
    options: item.options ? JSON.stringify(item.options) : null,
    is_available: item.isAvailable !== false,
    is_featured: item.isFeatured || false,
    is_on_promo: item.isOnPromo || false,
    promo_badge: item.promoBadge || '',
    order_index: item.order || 0,
    updated_at: now,
  }
  if (item.id) {
    await client.from('menu_items').update(payload).eq('id', item.id)
    return item
  } else {
    const id = randomUUID()
    await client.from('menu_items').insert({ ...payload, id, created_at: now })
    return { ...item, id }
  }
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  await (await supabase()).from('menu_items').delete().eq('id', id)
  return true
}

// --- Events ---

export async function getEvents(): Promise<any[]> {
  const { data, error } = await (await supabase()).from('events').select('*').order('order_index', { ascending: true })
  if (error) throw error
  return (data || []).map(e => ({
    ...snakeToCamel(e),
    id: e.id,
    isFeatured: e.status === 'featured',
    isUpcoming: e.status === 'upcoming',
    showOnHomepage: e.show_on_homepage,
    visible: e.visible !== false,
    ctaLabel: e.cta_label || 'Book Now',
    galleryImages: e.gallery_images ? JSON.parse(e.gallery_images) : [],
  }))
}

export async function saveEvent(event: any): Promise<any> {
  const client = await supabase()
  const now = new Date().toISOString()
  const status = event.isFeatured ? 'featured' : (event.isUpcoming || event.status === 'upcoming') ? 'upcoming' : 'past'
  const payload = {
    title: event.title,
    description: event.description || '',
    date: event.date || '',
    time: event.time || '',
    location: event.location || '',
    category: event.category || '',
    cover_image: event.coverImage || event.image || '',
    gallery_images: event.galleryImages ? JSON.stringify(event.galleryImages) : null,
    status,
    show_on_homepage: event.showOnHomepage || false,
    cta_label: event.ctaLabel || 'Book Now',
    cta_link: event.ctaLink || '',
    order_index: event.order || 0,
    visible: event.visible !== false,
    updated_at: now,
  }
  if (event.id) {
    await client.from('events').update(payload).eq('id', event.id)
    return event
  } else {
    const id = randomUUID()
    await client.from('events').insert({ ...payload, id, created_at: now })
    return { ...event, id }
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  await (await supabase()).from('events').delete().eq('id', id)
  return true
}

// --- Last Week Highlight ---

export async function getLastWeekHighlight(): Promise<any> {
  const { data, error } = await (await supabase()).from('last_week_highlights').select('*').limit(1).maybeSingle()
  if (error || !data) return null
  return {
    ...snakeToCamel(data),
    id: data.id,
    visible: data.visible,
    autoplay: data.autoplay,
    muted: data.muted,
    loop: data.loop_video,
  }
}

export async function saveLastWeekHighlight(highlight: any): Promise<boolean> {
  const client = await supabase()
  const now = new Date().toISOString()
  const { data: existing } = await client.from('last_week_highlights').select('id').limit(1).maybeSingle()
  const payload = {
    title: highlight.title || '',
    description: highlight.description || '',
    video_src: highlight.videoSrc || '',
    poster_image: highlight.posterImage || '',
    cta_label: highlight.ctaLabel || '',
    cta_link: highlight.ctaLink || '',
    visible: highlight.visible !== false,
    autoplay: highlight.autoplay !== false,
    muted: highlight.muted !== false,
    loop_video: highlight.loop !== false,
    updated_at: now,
  }
  if (existing) {
    await client.from('last_week_highlights').update(payload).eq('id', existing.id)
  } else {
    await client.from('last_week_highlights').insert({ ...payload, id: randomUUID() })
  }
  return true
}

// --- Promotions ---

export async function getPromotions(): Promise<any[]> {
  const { data, error } = await (await supabase()).from('promotions').select('*').order('order_index', { ascending: true })
  if (error) throw error
  return (data || []).map(p => ({
    ...snakeToCamel(p),
    id: p.id,
    isActive: p.is_active,
    displayOnHomepage: p.display_on_homepage,
  }))
}

export async function savePromotion(promotion: any): Promise<any> {
  const client = await supabase()
  const now = new Date().toISOString()
  const payload = {
    title: promotion.title,
    description: promotion.description || '',
    image: promotion.image || '',
    price_text: promotion.priceText || '',
    cta_text: promotion.ctaText || '',
    cta_link: promotion.ctaLink || '',
    is_active: promotion.isActive !== false,
    display_on_homepage: promotion.displayOnHomepage || false,
    start_date: promotion.startDate || null,
    end_date: promotion.endDate || null,
    order_index: promotion.order || 0,
    updated_at: now,
  }
  if (promotion.id) {
    await client.from('promotions').update(payload).eq('id', promotion.id)
    return promotion
  } else {
    const id = randomUUID()
    await client.from('promotions').insert({ ...payload, id, created_at: now })
    return { ...promotion, id }
  }
}

export async function deletePromotion(id: string): Promise<boolean> {
  await (await supabase()).from('promotions').delete().eq('id', id)
  return true
}

// --- Gallery ---

export async function getGallery(): Promise<any[]> {
  const { data, error } = await (await supabase()).from('gallery').select('*').order('order_index', { ascending: true })
  if (error) throw error
  return (data || []).map(g => ({
    ...snakeToCamel(g),
    id: g.id,
    isFeatured: g.is_featured,
  }))
}

export async function saveGalleryItem(item: any): Promise<any> {
  const client = await supabase()
  const now = new Date().toISOString()
  const payload = {
    url: item.url,
    title: item.title || '',
    category: item.category || '',
    is_featured: item.isFeatured || false,
    board_id: item.boardId || item.board_id || null,
    order_index: item.order || 0,
    updated_at: now,
  }
  if (item.id) {
    await client.from('gallery').update(payload).eq('id', item.id)
    return item
  } else {
    const id = randomUUID()
    await client.from('gallery').insert({ ...payload, id, created_at: now })
    return { ...item, id }
  }
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  await (await supabase()).from('gallery').delete().eq('id', id)
  return true
}

export async function getGalleryBoards(): Promise<any[]> {
  const { data, error } = await (await supabase()).from('gallery_boards').select('*').order('order_index', { ascending: true })
  if (error) throw error
  return data || []
}

// --- Popup ---

export async function getPopup(): Promise<any> {
  const { data, error } = await (await supabase()).from('popup').select('*').limit(1).maybeSingle()
  if (error || !data) return null
  return {
    ...snakeToCamel(data),
    id: data.id,
    isEnabled: data.is_enabled,
    showOncePerSession: data.show_once_per_session,
    startTime: data.start_time || '09:30',
    endTime: data.end_time || '12:30',
    activeDays: data.active_days ? JSON.parse(data.active_days) : [6, 0],
    adultPrice: data.adult_price || 'R89',
    kidsPrice: data.kids_price || 'R45',
  }
}

export async function savePopup(popup: any): Promise<boolean> {
  const client = await supabase()
  const now = new Date().toISOString()
  const activeDays = Array.isArray(popup.activeDays) ? popup.activeDays : [6, 0]
  const { data: existing } = await client.from('popup').select('id').limit(1).maybeSingle()
  const payload = {
    type: popup.type || 'announcement',
    title: popup.title || '',
    description: popup.description || '',
    image: popup.image || '',
    cta_text: popup.ctaText || '',
    cta_link: popup.ctaLink || '',
    is_enabled: popup.isEnabled || false,
    show_once_per_session: popup.showOncePerSession !== false,
    start_date: popup.startDate || null,
    end_date: popup.endDate || null,
    start_time: popup.startTime || '09:30',
    end_time: popup.endTime || '12:30',
    active_days: JSON.stringify(activeDays),
    adult_price: popup.adultPrice || 'R89',
    kids_price: popup.kidsPrice || 'R45',
    updated_at: now,
  }
  if (existing) {
    await client.from('popup').update(payload).eq('id', existing.id)
  } else {
    await client.from('popup').insert({ ...payload, id: randomUUID() })
  }
  return true
}

// --- Announcement ---

export async function getAnnouncement(): Promise<any> {
  const { data, error } = await (await supabase()).from('announcement').select('*').limit(1).maybeSingle()
  if (error || !data) return null
  return {
    ...snakeToCamel(data),
    id: data.id,
    isEnabled: data.is_enabled,
  }
}

export async function saveAnnouncement(announcement: any): Promise<boolean> {
  const client = await supabase()
  const now = new Date().toISOString()
  const { data: existing } = await client.from('announcement').select('id').limit(1).maybeSingle()
  const payload = {
    text: announcement.text || '',
    link: announcement.link || '',
    link_text: announcement.linkText || '',
    is_enabled: announcement.isEnabled !== false,
    updated_at: now,
  }
  if (existing) {
    await client.from('announcement').update(payload).eq('id', existing.id)
  } else {
    await client.from('announcement').insert({ ...payload, id: randomUUID() })
  }
  return true
}

// --- Inquiries (reads from contact_messages, which is the Supabase table for contact form data) ---

export async function getInquiries(): Promise<any[]> {
  const { data, error } = await (await supabase()).from('contact_messages').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(i => ({
    id: i.id,
    name: i.name,
    email: i.email,
    phone: i.phone || '',
    subject: i.subject || '',
    message: i.message,
    isRead: i.is_read,
    createdAt: i.created_at,
  }))
}

export async function saveInquiry(inquiry: any): Promise<any> {
  const client = await supabase()
  const id = randomUUID()
  const now = new Date().toISOString()
  await client.from('contact_messages').insert({
    id,
    name: inquiry.name,
    email: inquiry.email || '',
    phone: inquiry.phone || '',
    subject: inquiry.subject || '',
    message: inquiry.message || '',
    is_read: false,
    created_at: now,
  })
  return { ...inquiry, id, createdAt: now }
}

export async function markInquiryRead(id: string): Promise<boolean> {
  await (await supabase()).from('contact_messages').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
  return true
}

// --- Bar Menu ---

export async function getBarCategories(): Promise<any[]> {
  const client = await supabase()
  const { data, error } = await client.from('bar_categories').select('*').order('order_index', { ascending: true })
  if (error) throw error
  return (data || []).map(c => ({ ...snakeToCamel(c), id: c.id, isActive: c.is_active, order: c.order_index }))
}

export async function saveBarCategory(category: any): Promise<any> {
  const client = await supabase()
  const now = new Date().toISOString()
  const payload = {
    name: category.name,
    order_index: category.order || 0,
    is_active: category.isActive !== false,
    updated_at: now,
  }
  if (category.id) {
    await client.from('bar_categories').update(payload).eq('id', category.id)
    return category
  } else {
    const id = randomUUID()
    await client.from('bar_categories').insert({ ...payload, id, created_at: now })
    return { ...category, id }
  }
}

export async function deleteBarCategory(id: string): Promise<boolean> {
  const client = await supabase()
  await client.from('bar_items').delete().eq('category_id', id)
  await client.from('bar_categories').delete().eq('id', id)
  return true
}

export async function getBarItems(): Promise<any[]> {
  const client = await supabase()
  const { data, error } = await client.from('bar_items').select('*').order('order_index', { ascending: true })
  if (error) throw error
  return (data || []).map(item => ({
    ...snakeToCamel(item),
    id: item.id,
    categoryId: item.category_id,
    isAvailable: item.is_available,
    bottle: item.bottle ? Number(item.bottle) : null,
    singlePrice: item.single_price ? Number(item.single_price) : null,
    glassPrice: item.glass_price ? Number(item.glass_price) : null,
    shotPrice: item.shot_price ? Number(item.shot_price) : null,
  }))
}

export async function saveBarItem(item: any): Promise<any> {
  const client = await supabase()
  const now = new Date().toISOString()
  const payload = {
    category_id: item.categoryId || item.category_id,
    name: item.name,
    bottle: item.bottle || null,
    single_price: item.singlePrice || item.single_price || null,
    glass_price: item.glassPrice || item.glass_price || null,
    shot_price: item.shotPrice || item.shot_price || null,
    price: item.price || null,
    order_index: item.order || 0,
    is_available: item.isAvailable !== false,
    updated_at: now,
  }
  if (item.id) {
    await client.from('bar_items').update(payload).eq('id', item.id)
    return item
  } else {
    const id = randomUUID()
    await client.from('bar_items').insert({ ...payload, id, created_at: now })
    return { ...item, id }
  }
}

export async function deleteBarItem(id: string): Promise<boolean> {
  await (await supabase()).from('bar_items').delete().eq('id', id)
  return true
}

// --- Full CMS bundle for public endpoint ---

export async function getPublicCMSData(): Promise<any> {
  const client = await supabase()
  const [settingsRes, announcementRes, popupRes, eventsRes, promotionsRes, galleryRes, barCategoriesRes, barItemsRes] = await Promise.all([
    client.from('site_settings').select('key, value'),
    client.from('announcement').select('*').limit(1).maybeSingle(),
    client.from('popup').select('*').limit(1).maybeSingle(),
    client.from('events').select('*').order('order_index').filter('visible', 'neq', false),
    client.from('promotions').select('*').order('order_index').filter('is_active', 'eq', true),
    client.from('gallery').select('*').order('order_index', { ascending: true }),
    client.from('bar_categories').select('*').order('order_index').filter('is_active', 'eq', true),
    client.from('bar_items').select('*').order('order_index').filter('is_available', 'eq', true),
  ])

  const settings: Record<string, any> = {}
  if (settingsRes.data) {
    for (const row of settingsRes.data) {
      try { settings[row.key] = JSON.parse(row.value) } catch { settings[row.key] = row.value }
    }
  }

  return {
    settings,
    announcement: announcementRes.data ? { ...snakeToCamel(announcementRes.data), isEnabled: announcementRes.data.is_enabled } : null,
    popup: popupRes.data ? { ...snakeToCamel(popupRes.data), isEnabled: popupRes.data.is_enabled } : null,
    events: (eventsRes.data || []).map((e: any) => ({ ...snakeToCamel(e), id: e.id })),
    promotions: (promotionsRes.data || []).map((p: any) => ({ ...snakeToCamel(p), id: p.id })),
    gallery: (galleryRes.data || []).map((g: any) => ({ ...snakeToCamel(g), id: g.id, isFeatured: g.is_featured })),
    barCategories: (barCategoriesRes.data || []).map((c: any) => ({ ...snakeToCamel(c), id: c.id, isActive: c.is_active, order: c.order_index })),
    barItems: (barItemsRes.data || []).map((i: any) => ({
      ...snakeToCamel(i),
      id: i.id,
      categoryId: i.category_id,
      isAvailable: i.is_available,
      bottle: i.bottle ? Number(i.bottle) : null,
      singlePrice: i.single_price ? Number(i.single_price) : null,
      glassPrice: i.glass_price ? Number(i.glass_price) : null,
      shotPrice: i.shot_price ? Number(i.shot_price) : null,
    })),
  }
}
