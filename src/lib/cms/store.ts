import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

const DATA_FILES = {
  settings: 'settings.json',
  categories: 'categories.json',
  menuItems: 'menuItems.json',
  events: 'events.json',
  promotions: 'promotions.json',
  gallery: 'gallery.json',
  popup: 'popup.json',
  announcement: 'announcement.json',
  testimonials: 'testimonials.json',
  inquiries: 'inquiries.json',
  pages: 'pages.json',
} as const;

type DataKey = keyof typeof DATA_FILES;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(key: DataKey): string {
  return path.join(DATA_DIR, DATA_FILES[key]);
}

export function readData<T>(key: DataKey, defaultValue: T): T {
  ensureDataDir();
  const filePath = getFilePath(key);
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
  }
  
  return defaultValue;
}

export function writeData<T>(key: DataKey, data: T): boolean {
  ensureDataDir();
  const filePath = getFilePath(key);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
    return false;
  }
}

export function deleteData(key: DataKey): boolean {
  const filePath = getFilePath(key);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting ${key}:`, error);
    return false;
  }
}

export function initializeData<T>(key: DataKey, defaultValue: T): T {
  const current = readData<T>(key, null as unknown as T);
  if (current === null) {
    writeData(key, defaultValue);
    return defaultValue;
  }
  return current;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
