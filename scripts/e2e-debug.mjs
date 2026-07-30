import http from 'node:http'

const BASE = 'http://localhost:3333'
const ADMIN_PASSWORD = 'Lovers0884'

let cookie = ''

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' }
    if (cookie) headers['Cookie'] = cookie
    const r = http.request(`${BASE}${path}`, { method, headers, timeout: 30000 }, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => {
        const setCookie = res.headers['set-cookie']
        if (setCookie) {
          console.log('Set-Cookie raw:', JSON.stringify(setCookie))
          const match = setCookie[0].match(/boma_admin_auth=([^;]+)/)
          if (match) {
            cookie = `boma_admin_auth=${match[1]}`
            console.log('Extracted cookie:', cookie.substring(0, 50) + '...')
          } else {
            // Try all cookies
            for (const sc of setCookie) {
              console.log('  Cookie entry:', sc.substring(0, 80))
            }
          }
        }
        resolve({ status: res.statusCode, body: data, parsed: tryParse(data) })
      })
    })
    r.on('error', reject)
    if (body) r.write(JSON.stringify(body))
    r.end()
  })
}

function tryParse(s) { try { return JSON.parse(s) } catch { return null } }

async function main() {
  // Login
  const login = await req('POST', '/api/admin/auth', { password: ADMIN_PASSWORD })
  console.log('Login:', login.status, JSON.stringify(login.parsed))
  console.log('Cookie after login:', cookie)

  // Manually compute expected hash
  const crypto = await import('node:crypto')
  const expectedHash = crypto.createHash('sha256').update(`admin:${ADMIN_PASSWORD}`).digest('hex')
  console.log('Expected hash:', expectedHash)
  console.log('Cookie matches hash:', cookie === `boma_admin_auth=${expectedHash}`)

  // Try with manually computed cookie
  cookie = `boma_admin_auth=${expectedHash}`
  console.log('Using manually computed cookie')

  // Test UOMs
  console.log('\n--- GET UOMs ---')
  const uoms = await req('GET', '/api/inventory/uoms')
  console.log('Status:', uoms.status)
  console.log('Body:', uoms.body?.substring(0, 500))

  console.log('\n--- POST UOM ---')
  const create = await req('POST', '/api/inventory/uoms', { name: 'TestUOM', symbol: 't', category: 'discrete' })
  console.log('Status:', create.status)
  console.log('Body:', create.body?.substring(0, 500))

  console.log('\n--- GET Products ---')
  const products = await req('GET', '/api/inventory/products')
  console.log('Status:', products.status)
  console.log('Body:', products.body?.substring(0, 500))

  console.log('\n--- GET Dashboard ---')
  const dash = await req('GET', '/api/inventory/dashboard?section=combined')
  console.log('Status:', dash.status)
  console.log('Body:', dash.body?.substring(0, 500))
}

main().catch(console.error)
