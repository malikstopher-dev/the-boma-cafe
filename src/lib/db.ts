import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'data', 'cms.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.join(process.cwd(), 'data');
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeTables();
  }
  return db;
}

function initializeTables() {
  const database = getDb();
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price TEXT,
      image TEXT,
      sizes TEXT,
      add_ons TEXT,
      options TEXT,
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      is_on_promo INTEGER DEFAULT 0,
      promo_badge TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES menu_categories(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT,
      time TEXT,
      location TEXT,
      cover_image TEXT,
      gallery_images TEXT,
      status TEXT DEFAULT 'upcoming',
      show_on_homepage INTEGER DEFAULT 0,
      cta_link TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      image TEXT,
      price_text TEXT,
      cta_text TEXT,
      cta_link TEXT,
      is_active INTEGER DEFAULT 1,
      display_on_homepage INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT,
      category TEXT,
      is_featured INTEGER DEFAULT 0,
      board_id INTEGER,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gallery_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS popup (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'announcement',
      title TEXT,
      description TEXT,
      image TEXT,
      cta_text TEXT,
      cta_link TEXT,
      is_enabled INTEGER DEFAULT 0,
      show_once_per_session INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcement (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      link TEXT,
      link_text TEXT,
      is_enabled INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      subject TEXT,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS page_content (
      id TEXT PRIMARY KEY,
      page TEXT NOT NULL,
      section TEXT,
      key TEXT,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  initializeDefaults(database);
}

function initializeDefaults(database: Database.Database) {
  const settingsCount = database.prepare('SELECT COUNT(*) as count FROM site_settings').get() as { count: number };
  
  if (settingsCount.count === 0) {
    const defaults = {
      siteName: 'The Boma Cafe',
      siteTagline: 'Where the Rustic Meets the Soulful',
      logo: '/logo.png',
      favicon: '/favicon.ico',
      footerText: '© {year} The Boma Cafe. All rights reserved.',
      phone: '071 592 1190',
      phone2: '072 996 2212',
      email: 'info@thebomacafe.co.za',
      address: 'Sandton, Johannesburg, South Africa',
      openingHours: 'Mon-Sun: 8:00 AM - 10:00 PM',
      mapEmbedUrl: '',
      whatsapp: 'https://wa.me/27715921190',
      facebook: 'https://facebook.com/thebomacafe',
      instagram: 'https://instagram.com/thebomacafe',
      twitter: '',
      tiktok: 'https://tiktok.com/@thebomacafe',
      youtube: ''
    };
    
    const insert = database.prepare('INSERT INTO site_settings (id, key, value) VALUES (?, ?, ?)');
    Object.entries(defaults).forEach(([key, value]) => {
      insert.run(uuidv4(), key, JSON.stringify(value));
    });
  }

  const popupCount = database.prepare('SELECT COUNT(*) as count FROM popup').get() as { count: number };
  if (popupCount.count === 0) {
    database.prepare(`
      INSERT INTO popup (id, type, title, description, cta_text, cta_link, is_enabled, show_once_per_session, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 'announcement', 'Welcome to The Boma Cafe', 'Experience authentic rustic dining', 'View Menu', '/menu', 0, 1, '2026-01-01', '2026-12-31');
  }

  const announcementCount = database.prepare('SELECT COUNT(*) as count FROM announcement').get() as { count: number };
  if (announcementCount.count === 0) {
    database.prepare(`
      INSERT INTO announcement (id, text, link, link_text, is_enabled)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), '🎉 Join us for Live Music every Friday & Saturday evening!', '/events', 'View Events', 1);
  }

  const boardsCount = database.prepare('SELECT COUNT(*) as count FROM gallery_boards').get() as { count: number };
  if (boardsCount.count === 0) {
    const boards = [
      { name: 'Events', description: 'Gallery photos from our events' },
      { name: 'Food', description: 'Delicious food photos' },
      { name: 'Venue', description: 'Our beautiful venue' },
      { name: 'People', description: 'Happy guests' },
      { name: 'Promotions', description: 'Special offers and promotions' }
    ];
    const insertBoard = database.prepare('INSERT INTO gallery_boards (id, name, description, order_index) VALUES (?, ?, ?, ?)');
    boards.forEach((board, index) => {
      insertBoard.run(index + 1, board.name, board.description, index);
    });
  }
}

export function getSetting(key: string): any {
  const database = getDb();
  const row = database.prepare('SELECT value FROM site_settings WHERE key = ?').get(key) as { value: string } | undefined;
  if (row) {
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }
  return null;
}

export function getAllSettings(): Record<string, any> {
  const database = getDb();
  const rows = database.prepare('SELECT key, value FROM site_settings').all() as { key: string; value: string }[];
  const settings: Record<string, any> = {};
  rows.forEach(row => {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  });
  return settings;
}

export function setSetting(key: string, value: any): boolean {
  try {
    const database = getDb();
    const existing = database.prepare('SELECT id FROM site_settings WHERE key = ?').get(key);
    
    if (existing) {
      database.prepare('UPDATE site_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(JSON.stringify(value), key);
    } else {
      database.prepare('INSERT INTO site_settings (id, key, value) VALUES (?, ?, ?)').run(uuidv4(), key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.error('Error setting value:', error);
    return false;
  }
}

export function setMultipleSettings(settings: Record<string, any>): boolean {
  try {
    const database = getDb();
    const update = database.prepare('UPDATE site_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
    const insert = database.prepare('INSERT INTO site_settings (id, key, value) VALUES (?, ?, ?)');
    
    const transaction = database.transaction(() => {
      Object.entries(settings).forEach(([key, value]) => {
        const existing = database.prepare('SELECT id FROM site_settings WHERE key = ?').get(key);
        if (existing) {
          update.run(JSON.stringify(value), key);
        } else {
          insert.run(uuidv4(), key, JSON.stringify(value));
        }
      });
    });
    
    transaction();
    return true;
  } catch (error) {
    console.error('Error setting multiple values:', error);
    return false;
  }
}

export function getCategories(): any[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM menu_categories ORDER BY order_index ASC').all() as any[];
  return rows.map(row => ({
    ...row,
    isActive: row.is_active === 1
  }));
}

export function saveCategory(category: any): any {
  const database = getDb();
  const now = new Date().toISOString();
  
  if (category.id) {
    database.prepare(`
      UPDATE menu_categories 
      SET name = ?, description = ?, order_index = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(category.name, category.description || '', category.order || 0, category.isActive ? 1 : 0, now, category.id);
    return category;
  } else {
    const id = uuidv4();
    database.prepare(`
      INSERT INTO menu_categories (id, name, description, order_index, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, category.name, category.description || '', category.order || 0, category.isActive ? 1 : 0, now, now);
    return { ...category, id };
  }
}

export function deleteCategory(id: string): boolean {
  try {
    const database = getDb();
    database.prepare('DELETE FROM menu_items WHERE category_id = ?').run(id);
    database.prepare('DELETE FROM menu_categories WHERE id = ?').run(id);
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
}

export function getMenuItems(): any[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM menu_items ORDER BY order_index ASC').all() as any[];
  return rows.map(row => ({
    ...row,
    isAvailable: row.is_available === 1,
    isFeatured: row.is_featured === 1,
    isOnPromo: row.is_on_promo === 1,
    sizes: row.sizes ? JSON.parse(row.sizes) : null,
    addOns: row.add_ons ? JSON.parse(row.add_ons) : null,
    options: row.options ? JSON.parse(row.options) : null
  }));
}

export function saveMenuItem(item: any): any {
  const database = getDb();
  const now = new Date().toISOString();
  
  if (item.id) {
    database.prepare(`
      UPDATE menu_items 
      SET category_id = ?, name = ?, description = ?, price = ?, image = ?, 
          sizes = ?, add_ons = ?, options = ?, is_available = ?, is_featured = ?, 
          is_on_promo = ?, promo_badge = ?, order_index = ?, updated_at = ?
      WHERE id = ?
    `).run(
      item.categoryId || item.category_id, item.name, item.description || '', 
      item.price || '', item.image || '', 
      item.sizes ? JSON.stringify(item.sizes) : null,
      item.addOns ? JSON.stringify(item.addOns) : null,
      item.options ? JSON.stringify(item.options) : null,
      item.isAvailable ? 1 : 0, item.isFeatured ? 1 : 0, 
      item.isOnPromo ? 1 : 0, item.promoBadge || '', item.order || 0, now, item.id
    );
    return item;
  } else {
    const id = uuidv4();
    database.prepare(`
      INSERT INTO menu_items (id, category_id, name, description, price, image, sizes, add_ons, options, is_available, is_featured, is_on_promo, promo_badge, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, item.categoryId || item.category_id, item.name, item.description || '', 
      item.price || '', item.image || '',
      item.sizes ? JSON.stringify(item.sizes) : null,
      item.addOns ? JSON.stringify(item.addOns) : null,
      item.options ? JSON.stringify(item.options) : null,
      item.isAvailable !== false ? 1 : 0, item.isFeatured ? 1 : 0, 
      item.isOnPromo ? 1 : 0, item.promoBadge || '', item.order || 0, now, now
    );
    return { ...item, id };
  }
}

export function deleteMenuItem(id: string): boolean {
  try {
    const database = getDb();
    database.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    return true;
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return false;
  }
}

export function getEvents(): any[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM events ORDER BY order_index ASC').all() as any[];
  return rows.map(row => ({
    ...row,
    isFeatured: row.status === 'featured',
    isUpcoming: row.status === 'upcoming',
    showOnHomepage: row.show_on_homepage === 1,
    galleryImages: row.gallery_images ? JSON.parse(row.gallery_images) : []
  }));
}

export function saveEvent(event: any): any {
  const database = getDb();
  const now = new Date().toISOString();
  
  const status = event.isFeatured ? 'featured' : (event.isUpcoming || event.status === 'upcoming') ? 'upcoming' : 'past';
  
  if (event.id) {
    database.prepare(`
      UPDATE events 
      SET title = ?, description = ?, date = ?, time = ?, location = ?, cover_image = ?, 
          gallery_images = ?, status = ?, show_on_homepage = ?, cta_link = ?, order_index = ?, updated_at = ?
      WHERE id = ?
    `).run(
      event.title, event.description || '', event.date || '', event.time || '', 
      event.location || '', event.coverImage || event.image || '',
      event.galleryImages ? JSON.stringify(event.galleryImages) : null,
      status, event.showOnHomepage ? 1 : 0, event.ctaLink || '', event.order || 0, now, event.id
    );
    return event;
  } else {
    const id = uuidv4();
    database.prepare(`
      INSERT INTO events (id, title, description, date, time, location, cover_image, gallery_images, status, show_on_homepage, cta_link, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, event.title, event.description || '', event.date || '', event.time || '', 
      event.location || '', event.coverImage || event.image || '',
      event.galleryImages ? JSON.stringify(event.galleryImages) : null,
      status, event.showOnHomepage ? 1 : 0, event.ctaLink || '', event.order || 0, now, now
    );
    return { ...event, id };
  }
}

export function deleteEvent(id: string): boolean {
  try {
    const database = getDb();
    database.prepare('DELETE FROM events WHERE id = ?').run(id);
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    return false;
  }
}

export function getPromotions(): any[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM promotions ORDER BY order_index ASC').all() as any[];
  return rows.map(row => ({
    ...row,
    isActive: row.is_active === 1,
    displayOnHomepage: row.display_on_homepage === 1
  }));
}

export function savePromotion(promotion: any): any {
  const database = getDb();
  const now = new Date().toISOString();
  
  if (promotion.id) {
    database.prepare(`
      UPDATE promotions 
      SET title = ?, description = ?, image = ?, price_text = ?, cta_text = ?, cta_link = ?, 
          is_active = ?, display_on_homepage = ?, start_date = ?, end_date = ?, order_index = ?, updated_at = ?
      WHERE id = ?
    `).run(
      promotion.title, promotion.description || '', promotion.image || '', 
      promotion.priceText || '', promotion.ctaText || '', promotion.ctaLink || '',
      promotion.isActive ? 1 : 0, promotion.displayOnHomepage ? 1 : 0,
      promotion.startDate || null, promotion.endDate || null, promotion.order || 0, now, promotion.id
    );
    return promotion;
  } else {
    const id = uuidv4();
    database.prepare(`
      INSERT INTO promotions (id, title, description, image, price_text, cta_text, cta_link, is_active, display_on_homepage, start_date, end_date, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, promotion.title, promotion.description || '', promotion.image || '',
      promotion.priceText || '', promotion.ctaText || '', promotion.ctaLink || '',
      promotion.isActive !== false ? 1 : 0, promotion.displayOnHomepage ? 1 : 0,
      promotion.startDate || null, promotion.endDate || null, promotion.order || 0, now, now
    );
    return { ...promotion, id };
  }
}

export function deletePromotion(id: string): boolean {
  try {
    const database = getDb();
    database.prepare('DELETE FROM promotions WHERE id = ?').run(id);
    return true;
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return false;
  }
}

export function getGallery(): any[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM gallery ORDER BY order_index ASC').all() as any[];
  return rows.map(row => ({
    ...row,
    isFeatured: row.is_featured === 1
  }));
}

export function saveGalleryItem(item: any): any {
  const database = getDb();
  const now = new Date().toISOString();
  
  if (item.id) {
    database.prepare(`
      UPDATE gallery 
      SET url = ?, title = ?, category = ?, is_featured = ?, board_id = ?, order_index = ?, updated_at = ?
      WHERE id = ?
    `).run(
      item.url, item.title || '', item.category || '', item.isFeatured ? 1 : 0, 
      item.boardId || item.board_id || null, item.order || 0, now, item.id
    );
    return item;
  } else {
    const id = uuidv4();
    database.prepare(`
      INSERT INTO gallery (id, url, title, category, is_featured, board_id, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, item.url, item.title || '', item.category || '', item.isFeatured ? 1 : 0,
      item.boardId || item.board_id || null, item.order || 0, now, now
    );
    return { ...item, id };
  }
}

export function deleteGalleryItem(id: string): boolean {
  try {
    const database = getDb();
    database.prepare('DELETE FROM gallery WHERE id = ?').run(id);
    return true;
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return false;
  }
}

export function getGalleryBoards(): any[] {
  const database = getDb();
  return database.prepare('SELECT * FROM gallery_boards ORDER BY order_index ASC').all() as any[];
}

export function getPopup(): any {
  const database = getDb();
  const row = database.prepare('SELECT * FROM popup LIMIT 1').get() as any;
  if (row) {
    return {
      ...row,
      isEnabled: row.is_enabled === 1,
      showOncePerSession: row.show_once_per_session === 1
    };
  }
  return null;
}

export function savePopup(popup: any): boolean {
  try {
    const database = getDb();
    const now = new Date().toISOString();
    
    const existing = database.prepare('SELECT id FROM popup LIMIT 1').get() as { id: string } | undefined;
    
    if (existing) {
      database.prepare(`
        UPDATE popup 
        SET type = ?, title = ?, description = ?, image = ?, cta_text = ?, cta_link = ?, 
            is_enabled = ?, show_once_per_session = ?, start_date = ?, end_date = ?, updated_at = ?
        WHERE id = ?
      `).run(
        popup.type || 'announcement', popup.title || '', popup.description || '', 
        popup.image || '', popup.ctaText || '', popup.ctaLink || '',
        popup.isEnabled ? 1 : 0, popup.showOncePerSession ? 1 : 0,
        popup.startDate || null, popup.endDate || null, now, existing.id
      );
    } else {
      database.prepare(`
        INSERT INTO popup (id, type, title, description, image, cta_text, cta_link, is_enabled, show_once_per_session, start_date, end_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), popup.type || 'announcement', popup.title || '', popup.description || '',
        popup.image || '', popup.ctaText || '', popup.ctaLink || '',
        popup.isEnabled ? 1 : 0, popup.showOncePerSession ? 1 : 0,
        popup.startDate || null, popup.endDate || null, now
      );
    }
    return true;
  } catch (error) {
    console.error('Error saving popup:', error);
    return false;
  }
}

export function getAnnouncement(): any {
  const database = getDb();
  const row = database.prepare('SELECT * FROM announcement LIMIT 1').get() as any;
  if (row) {
    return {
      ...row,
      isEnabled: row.is_enabled === 1
    };
  }
  return null;
}

export function saveAnnouncement(announcement: any): boolean {
  try {
    const database = getDb();
    const now = new Date().toISOString();
    
    const existing = database.prepare('SELECT id FROM announcement LIMIT 1').get() as { id: string } | undefined;
    
    if (existing) {
      database.prepare(`
        UPDATE announcement 
        SET text = ?, link = ?, link_text = ?, is_enabled = ?, updated_at = ?
        WHERE id = ?
      `).run(announcement.text || '', announcement.link || '', announcement.linkText || '', announcement.isEnabled ? 1 : 0, now, existing.id);
    } else {
      database.prepare(`
        INSERT INTO announcement (id, text, link, link_text, is_enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), announcement.text || '', announcement.link || '', announcement.linkText || '', announcement.isEnabled ? 1 : 0, now);
    }
    return true;
  } catch (error) {
    console.error('Error saving announcement:', error);
    return false;
  }
}

export function getInquiries(): any[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all() as any[];
  return rows.map(row => ({
    ...row,
    isRead: row.is_read === 1
  }));
}

export function saveInquiry(inquiry: any): any {
  const database = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  database.prepare(`
    INSERT INTO inquiries (id, name, email, phone, subject, message, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, inquiry.name, inquiry.email || '', inquiry.phone || '', inquiry.subject || '', inquiry.message || '', 0, now);
  
  return { ...inquiry, id, createdAt: now };
}

export function markInquiryRead(id: string): boolean {
  try {
    const database = getDb();
    database.prepare('UPDATE inquiries SET is_read = 1 WHERE id = ?').run(id);
    return true;
  } catch (error) {
    console.error('Error marking inquiry read:', error);
    return false;
  }
}

export function generateId(): string {
  return uuidv4();
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}