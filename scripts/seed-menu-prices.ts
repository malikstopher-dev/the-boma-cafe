import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

// Load .env.local manually (tsx doesn't auto-load Next.js env files)
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    let value = trimmed.slice(eqIdx + 1)
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DB_PATH = path.join(process.cwd(), 'data', 'cms.db')

function getDbItems(): any[] {
  // Use better-sqlite3 directly (DON'T import from src/lib/db to avoid
  // TS compilation issues). This is a standalone seed script.
  const Database = require('better-sqlite3')
  const db = new Database(DB_PATH)
  const rows = db.prepare('SELECT id, name, description, price, sizes, add_ons FROM menu_items ORDER BY name').all()
  db.close()
  return rows
}

async function seed() {
  console.log('Reading menu items from SQLite...')
  const items = getDbItems()
  console.log(`Found ${items.length} items in SQLite`)

  // Upsert each item into Supabase
  for (const item of items) {
    const record = {
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      price: item.price ?? '0',
      sizes: typeof item.sizes === 'string' ? item.sizes : item.sizes ? JSON.stringify(item.sizes) : null,
      add_ons: typeof item.add_ons === 'string' ? item.add_ons : item.add_ons ? JSON.stringify(item.add_ons) : null,
    }

    const { error } = await supabase
      .from('menu_items_supabase')
      .upsert(record, { onConflict: 'id' })

    if (error) {
      console.error(`Failed to upsert ${item.name} (${item.id}):`, error.message)
    } else {
      console.log(`  OK ${item.name} (${item.price})`)
    }
  }

  // Verify count
  const { count, error } = await supabase
    .from('menu_items_supabase')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('Verification failed:', error.message)
  } else {
    console.log(`\nSeeded ${count} menu items into menu_items_supabase`)
  }
}

seed().catch((err) => {
  console.error('Seed script failed:', err)
  process.exit(1)
})
