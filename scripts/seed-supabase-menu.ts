import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

// Load .env.local manually
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

// Import defaultMenuItems directly (compiled at runtime by tsx)
const { defaultMenuItems } = require('../src/data/defaultData')

async function seed() {
  console.log(`Reading ${defaultMenuItems.length} menu items from defaultData.ts...`)

  let ok = 0
  let fail = 0

  for (const item of defaultMenuItems) {
    const record = {
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      price: String(item.price ?? 0),
      sizes: item.variants ? JSON.stringify(item.variants.map((v: any) => ({ name: v.name, price: v.price }))) : null,
      add_ons: item.addOns ? JSON.stringify(item.addOns.map((a: any) => ({ name: a.name, price: a.price }))) : null,
      category: item.category ?? null,
    }

    const { error } = await supabase
      .from('menu_items_supabase')
      .upsert(record, { onConflict: 'id' })

    if (error) {
      console.error(`  FAIL ${item.name} (${item.id}): ${error.message}`)
      fail++
    } else {
      ok++
    }
  }

  const { count, error: countError } = await supabase
    .from('menu_items_supabase')
    .select('id', { count: 'exact', head: true })

  if (countError) {
    console.error('Verification failed:', countError.message)
  } else {
    console.log(`\nDone: ${ok} upserted, ${fail} failed. Total in table: ${count}`)
  }
}

seed().catch((err: any) => {
  console.error('Seed script failed:', err)
  process.exit(1)
})
