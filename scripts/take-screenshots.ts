import { chromium } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const BASE = 'http://localhost:3000'
const OUT = path.join(process.cwd(), 'docs/screenshots')

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

  // ── Helper: open drawer for a specific proposal estado ──────────────────────
  const estadoBadgeText = (estado: string): string => ({
    Recebida: 'Recebida',
    EmElaboracao: 'Em Elaboração',
    EmOrcamentacao: 'Em Orçamentação',
    Enviada: 'Enviada',
    Ganha: 'Ganha',
    Perdida: 'Perdida',
  }[estado] ?? estado)

  const openProposalByEstado = async (estado: string): Promise<boolean> => {
    await page.goto(`${BASE}/propostas`)
    await page.waitForLoadState('networkidle')
    // Wait for TanStack Query to load data
    await page.waitForSelector('text=PROP-', { timeout: 15000 })
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    const label = estadoBadgeText(estado)
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const text = await row.textContent()
      if (text?.includes(label)) {
        await row.click()
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
        await page.waitForTimeout(500)
        return true
      }
    }
    return false
  }

  // ── 4. Proposals list ───────────────────────────────────────────────────────
  await page.goto(`${BASE}/propostas`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('text=PROP-', { timeout: 15000 })
  await page.screenshot({ path: `${OUT}/proposals-list.png` })
  console.log('✓ proposals-list.png')

  // ── 5. Proposal drawer (dados tab) ──────────────────────────────────────────
  await openProposalByEstado('EmElaboracao')
  await page.screenshot({ path: `${OUT}/proposal-drawer.png` })
  console.log('✓ proposal-drawer.png')

  // ── 6. State selector ───────────────────────────────────────────────────────
  // Scroll down inside the drawer to where StateSelector renders
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Avançar') || b.textContent?.includes('Iniciar'))
    btn?.scrollIntoView({ behavior: 'instant', block: 'center' })
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/state-selector.png` })
  console.log('✓ state-selector.png')

  // Close drawer
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // ── 7. Creative zone tab ────────────────────────────────────────────────────
  await openProposalByEstado('EmElaboracao')
  await page.click('button[role="tab"]:has-text("Criativa")')
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/creative-zone.png` })
  console.log('✓ creative-zone.png')

  // Close drawer
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // ── 8. Budgeting tab — wait for estimate to be fully rendered ────────────────
  const opened = await openProposalByEstado('EmOrcamentacao')
  if (opened) {
    await page.click('button[role="tab"]:has-text("Orçamentação")')
    // Wait for the estimate to appear — could be loading from AI or already present
    console.log('  Waiting for estimate to load...')
    await page.waitForFunction(
      () => {
        // Check for any visible monetary value (€) in the tab content
        const dialog = document.querySelector('[role="dialog"]')
        return dialog && (
          dialog.textContent?.includes('Total Geral') ||
          dialog.textContent?.includes('total_geral') ||
          dialog.textContent?.includes('Total:') ||
          (dialog.querySelector('.font-mono') !== null)
        )
      },
      { timeout: 300000 },
    ).catch(() => console.warn('  Warning: estimate may not be fully loaded'))
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${OUT}/budgeting-tab.png` })
    console.log('✓ budgeting-tab.png')

    // ── 9. Estimate chat ─────────────────────────────────────────────────────
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea')
      textarea?.scrollIntoView({ behavior: 'instant', block: 'center' })
    })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/estimate-chat.png` })
    console.log('✓ estimate-chat.png')
  } else {
    console.warn('⚠ No EmOrcamentacao proposal found — budgeting screenshots skipped')
  }

  await browser.close()
  console.log('\nAll screenshots saved to docs/screenshots/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
