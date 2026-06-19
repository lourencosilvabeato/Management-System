import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:3000'
const OUT = 'docs/screenshots'
const EMAIL = 'admin@niu.pt'
const PASS = 'test1234'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

// ── login ────────────────────────────────────────────────────────────────────
async function login() {
  await page.goto(`${BASE}/propostas`)
  // if redirected to login
  if (page.url().includes('/login') || page.url().includes('/admin')) {
    // try payload admin login
    await page.goto(`${BASE}/admin/login`)
    await page.waitForLoadState('networkidle')
    const email = page.locator('input[name="email"], input[type="email"]').first()
    const pass  = page.locator('input[name="password"], input[type="password"]').first()
    await email.fill(EMAIL)
    await pass.fill(PASS)
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
  await page.waitForTimeout(1200)
})

// ── get first proposal id ─────────────────────────────────────────────────────
let proposalId = null
try {
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/proposals?limit=1&depth=0')
    const j = await r.json()
    return j?.docs?.[0]?.id
  })
  proposalId = res
} catch (_) {}

// ── proposal detail tabs ───────────────────────────────────────────────────────
if (proposalId) {
  await page.goto(`${BASE}/propostas/${proposalId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // base data tab (default)
  await shot('proposal-drawer.png', async () => {})

  // state selector — click to open state section
  await shot('state-selector.png', async () => {
    const btn = page.locator('button').filter({ hasText: /Avançar|Transição|estado/i }).first()
    if (await btn.count() > 0) await btn.click()
    await page.waitForTimeout(500)
  })

  // creative tab
  await shot('creative-zone.png', async () => {
    await page.goto(`${BASE}/propostas/${proposalId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const criativaTab = page.locator('[role="tab"]').filter({ hasText: /criativ/i }).first()
    if (await criativaTab.count() > 0) {
      await criativaTab.click()
      await page.waitForTimeout(600)
    }
  })

  // budgeting tab
  await shot('budgeting-tab.png', async () => {
    await page.goto(`${BASE}/propostas/${proposalId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const orcTab = page.locator('[role="tab"]').filter({ hasText: /orçament/i }).first()
    if (await orcTab.count() > 0) {
      await orcTab.click()
      await page.waitForTimeout(600)
    }
  })

  // estimate chat (same tab, scroll down or find chat section)
  await shot('estimate-chat.png', async () => {
    await page.goto(`${BASE}/propostas/${proposalId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const orcTab = page.locator('[role="tab"]').filter({ hasText: /orçament/i }).first()
    if (await orcTab.count() > 0) {
      await orcTab.click()
      await page.waitForTimeout(600)
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)
  })
} else {
  console.log('⚠ No proposals found — skipping detail screenshots')
  ;['proposal-drawer.png','state-selector.png','creative-zone.png','budgeting-tab.png','estimate-chat.png'].forEach(f => {
    console.log(`  placeholder: ${OUT}/${f}`)
  })
}

// ── payload admin ─────────────────────────────────────────────────────────────
await shot('payload-admin.png', async () => {
  await page.goto(`${BASE}/admin`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
})

await browser.close()
console.log(`\nDone. Screenshots saved to ${OUT}/`)
