import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:3000'
const OUT = 'docs/screenshots'
const EMAIL = 'admin@niu.pt'
const PASS = 'test1234'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
const page = await ctx.newPage()

// ── login ────────────────────────────────────────────────────────────────────
async function login() {
  await page.goto(`${BASE}/propostas`)
  if (page.url().includes('/login') || page.url().includes('/admin')) {
    await page.goto(`${BASE}/admin/login`)
    await page.waitForLoadState('networkidle')
    await page.locator('input[name="email"], input[type="email"]').first().fill(EMAIL)
    await page.locator('input[name="password"], input[type="password"]').first().fill(PASS)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    await page.goto(`${BASE}/propostas`)
    await page.waitForLoadState('networkidle')
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────
async function shot(name, fn) {
  try {
    await fn()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${name}`, fullPage: false })
    console.log(`✓ ${name}`)
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`)
  }
}

// ── login page ────────────────────────────────────────────────────────────────
await shot('login.png', async () => {
  await page.goto(`${BASE}/admin/login`)
  await page.waitForLoadState('networkidle')
})

await login()

// ── proposals list ────────────────────────────────────────────────────────────
await shot('proposals-list.png', async () => {
  await page.goto(`${BASE}/propostas`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
})

// ── find the EmOrcamentacao proposal ─────────────────────────────────────────
let proposalId = null
try {
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/proposals?limit=50&depth=0')
    const j = await r.json()
    const orca = j?.docs?.find((p) => p.estado === 'EmOrcamentacao')
    return orca?.id ?? j?.docs?.[0]?.id
  })
  proposalId = res
  console.log(`Using proposal id: ${proposalId}`)
} catch (_) {}

// ── proposal detail tabs ───────────────────────────────────────────────────────
if (proposalId) {
  // base data tab (default)
  await shot('proposal-drawer.png', async () => {
    await page.goto(`${BASE}/propostas/${proposalId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  // state selector — open the transition area
  await shot('state-selector.png', async () => {
    await page.goto(`${BASE}/propostas/${proposalId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const btn = page.locator('button').filter({ hasText: /Avançar|Transição|estado/i }).first()
    if (await btn.count() > 0) await btn.click()
    await page.waitForTimeout(500)
  })

  // creative tab
  await shot('creative-zone.png', async () => {
    await page.goto(`${BASE}/propostas/${proposalId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const tab = page.locator('[role="tab"]').filter({ hasText: /criativ/i }).first()
    if (await tab.count() > 0) {
      await tab.click()
      await page.waitForTimeout(600)
    }
  })

  // budgeting tab — shows AI estimate
  await shot('budgeting-tab.png', async () => {
    await page.goto(`${BASE}/propostas/${proposalId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const tab = page.locator('[role="tab"]').filter({ hasText: /orçament/i }).first()
    if (await tab.count() > 0) {
      await tab.click()
      await page.waitForTimeout(800)
    }
  })

  // estimate chat — bottom of budgeting tab
  await shot('estimate-chat.png', async () => {
    await page.goto(`${BASE}/propostas/${proposalId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const tab = page.locator('[role="tab"]').filter({ hasText: /orçament/i }).first()
    if (await tab.count() > 0) {
      await tab.click()
      await page.waitForTimeout(800)
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)
  })
} else {
  console.log('⚠ No proposals found — skipping detail screenshots')
}

// ── payload admin ─────────────────────────────────────────────────────────────
await shot('payload-admin.png', async () => {
  await page.goto(`${BASE}/admin`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
})

await browser.close()
console.log(`\nDone. Screenshots saved to ${OUT}/`)
