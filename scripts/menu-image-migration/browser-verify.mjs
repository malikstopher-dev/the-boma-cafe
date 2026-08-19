import puppeteer from 'puppeteer-core'

const base = process.env.U1B_BASE_URL ?? 'https://the-boma-cafe.vercel.app'
const executablePath = process.env.EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const viewports = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

async function responseSummary(response) {
  const text = await response.text()
  return {
    status: response.status(),
    bytes: Buffer.byteLength(text),
    hasDataUri: /data:/i.test(text),
  }
}

async function verifyViewport(browser, viewport) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport(viewport)
  const failures = []
  const warnings = []
  page.on('pageerror', error => {
    const issue = `pageerror:${page.url()}:${error.message}`
    // The waiter probe intentionally injects its saved staff record before hydration
    // to avoid creating a production staff account. That can make the first client
    // render differ from the signed-out server shell, while the resulting menu UI is
    // still verified below. Real waiter PIN login does not use this probe shortcut.
    if (page.url().includes('/waiter') && error.message.includes('React error #418')) warnings.push(issue)
    else failures.push(issue)
  })
  page.on('console', message => {
    if (message.type() === 'error') warnings.push(`console:${message.text()}`)
  })
  page.on('response', response => {
    if (response.status() >= 400) {
      const url = response.url()
      const issue = `http:${response.status()}:${url}`
      if (url.includes('/api/menu/public') || url.includes('/menu/migrated/')) failures.push(issue)
      else warnings.push(issue)
    }
  })

  const homepageResponse = page.waitForResponse(response => response.url().includes('/api/menu/public/homepage'))
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 120000 })
  const homepageApi = await responseSummary(await homepageResponse)
  await page.waitForFunction(() => document.body.innerText.includes('Signature Dishes'))
  const homepageLayout = await page.evaluate(() => ({
    title: document.title,
    signatureVisible: document.body.innerText.includes('Signature Dishes'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }))

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('boma_waiter_staff', JSON.stringify({
      id: 'u1b-visual-probe',
      name: 'U1B Visual Probe',
      role: 'waiter',
      employee_id: 'U1B-PROBE',
    }))
  })
  const waiterResponse = page.waitForResponse(response => response.url().includes('/api/menu/public/waiter'))
  await page.goto(`${base}/waiter`, { waitUntil: 'networkidle2', timeout: 120000 })
  const waiterApi = await responseSummary(await waiterResponse)
  await page.waitForFunction(() => document.body.innerText.includes('Select Table'))
  await page.evaluate(() => {
    const tableButton = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === '1')
    if (!(tableButton instanceof HTMLButtonElement)) throw new Error('Table 1 button not found')
    tableButton.click()
  })
  await page.waitForSelector('input[placeholder*="Search food"]')
  await page.waitForFunction(() => {
    const search = document.querySelector('input[placeholder*="Search food"]')
    const root = search?.parentElement?.parentElement
    return root && root.querySelectorAll('button').length > 1 && !root.textContent?.includes('No items found')
  })
  const waiterLayout = await page.evaluate(() => ({
    foodSearchVisible: Boolean(document.querySelector('input[placeholder*="Search food"]')),
    noItems: document.body.innerText.includes('No items found'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }))

  await page.goto(`${base}/menu`, { waitUntil: 'networkidle2', timeout: 120000 })
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('menu'))
  const publicMenuLayout = await page.evaluate(() => ({
    hasMenuText: document.body.innerText.toLowerCase().includes('menu'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }))

  await context.close()
  if (homepageApi.status !== 200 || homepageApi.hasDataUri) throw new Error(`${viewport.name} homepage API failed`)
  if (waiterApi.status !== 200 || waiterApi.hasDataUri) throw new Error(`${viewport.name} waiter API failed`)
  if (!homepageLayout.signatureVisible || homepageLayout.horizontalOverflow) throw new Error(`${viewport.name} homepage layout failed`)
  if (!waiterLayout.foodSearchVisible || waiterLayout.noItems || waiterLayout.horizontalOverflow) throw new Error(`${viewport.name} waiter layout failed`)
  if (!publicMenuLayout.hasMenuText || publicMenuLayout.horizontalOverflow) throw new Error(`${viewport.name} public menu layout failed`)
  if (failures.length > 0) throw new Error(`${viewport.name} browser errors: ${failures.join(' | ')}`)

  return { viewport: viewport.name, homepageApi, homepageLayout, waiterApi, waiterLayout, publicMenuLayout, warnings }
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

try {
  const results = []
  for (const viewport of viewports) results.push(await verifyViewport(browser, viewport))
  console.log(JSON.stringify({ outcome: 'browser_verification_passed', results }, null, 2))
} finally {
  await browser.close()
}
