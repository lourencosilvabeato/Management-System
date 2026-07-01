import { chromium } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const BASE = 'http://localhost:3000'
const OUT = path.join(process.cwd(), 'docs/screenshots')

// The proposal used for all single-proposal screenshots
const DEMO_PROPOSAL = 'Stand Expo Tech 2026'

async function main() {
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: false, channel: 'chromium' })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // ── 1. Login page ───────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${OUT}/login.png` })
  console.log('✓ login.png')

  // ── 2. Log in ───────────────────────────────────────────────────────────────
  await page.fill('input[id="field-email"]', 'admin@niu.pt')
  await page.fill('input[id="field-password"]', 'test1234')
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(2000)
  await page.waitForLoadState('networkidle')

  // ── 3. Payload admin dashboard ──────────────────────────────────────────────
  await page.screenshot({ path: `${OUT}/payload-admin.png` })
  console.log('✓ payload-admin.png')

  // ── Helper: go to propostas and wait for table ───────────────────────────────
  const goToList = async () => {
    await page.goto(`${BASE}/propostas`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=PROP-', { timeout: 15000 })
  }

  // ── Helper: open DEMO_PROPOSAL drawer ───────────────────────────────────────
  const openDemoProposal = async () => {
    await goToList()
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const text = await row.textContent()
      if (text?.includes(DEMO_PROPOSAL)) {
        await row.click()
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
        await page.waitForTimeout(500)
        return
      }
    }
    throw new Error(`Proposal "${DEMO_PROPOSAL}" not found in table`)
  }

  // ── Helper: scroll the drawer's overflow container ──────────────────────────
  const scrollDrawer = async (position: 'top' | 'bottom') => {
    await page.evaluate((pos) => {
      // The dialog content div is the scroll container
      const container =
        document.querySelector('[role="dialog"] [data-radix-scroll-area-viewport]') ??
        document.querySelector('[role="dialog"] .overflow-y-auto') ??
        document.querySelector('[role="dialog"] > div > div')
      if (!container) return
      if (pos === 'top') container.scrollTop = 0
      else container.scrollTop = container.scrollHeight
    }, position)
    await page.waitForTimeout(300)
  }

  // ── 4. Proposals list ───────────────────────────────────────────────────────
  await goToList()
  await page.screenshot({ path: `${OUT}/proposals-list.png` })
  console.log('✓ proposals-list.png')

  // ── 5. Proposal drawer — dados base tab ─────────────────────────────────────
  await openDemoProposal()
  await scrollDrawer('top')
  await page.screenshot({ path: `${OUT}/proposal-drawer.png` })
  console.log('✓ proposal-drawer.png')

  // ── 6. State selector ───────────────────────────────────────────────────────
  await scrollDrawer('bottom')
  await page.screenshot({ path: `${OUT}/state-selector.png` })
  console.log('✓ state-selector.png')

  // Close drawer
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // ── 7. Creative zone tab ────────────────────────────────────────────────────
  await openDemoProposal()
  await page.click('button[role="tab"]:has-text("Criativa")')
  await page.waitForTimeout(600)
  await scrollDrawer('top')
  await page.screenshot({ path: `${OUT}/creative-zone.png` })
  console.log('✓ creative-zone.png')

  // Close drawer
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // ── 8. Budgeting tab — TOP: confiança badge + abordagem técnica ──────────────
  await openDemoProposal()
  await page.click('button[role="tab"]:has-text("Orçamentação")')

  // Wait for estimate to be fully rendered
  console.log('  Waiting for estimate to load...')
  await page.waitForFunction(
    () => {
      const dialog = document.querySelector('[role="dialog"]')
      return dialog?.textContent?.includes('Confiança') || dialog?.textContent?.includes('Total Geral')
    },
    { timeout: 300000 },
  ).catch(() => console.warn('  Warning: estimate may not have loaded fully'))

  await page.waitForTimeout(800)
  await scrollDrawer('top')
  await page.screenshot({ path: `${OUT}/budgeting-tab.png` })
  console.log('✓ budgeting-tab.png')

  // ── 9. Estimate chat — BOTTOM: last estimate items + chat input ──────────────
  await scrollDrawer('bottom')
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/estimate-chat.png` })
  console.log('✓ estimate-chat.png')

  await browser.close()
  console.log('\nAll screenshots saved to docs/screenshots/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
