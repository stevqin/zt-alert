import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'

const hasSystemEdge = process.platform === 'darwin' && existsSync('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')
const browser = await chromium.launch(hasSystemEdge ? { channel: 'msedge' } : {})

async function capture(viewport, actions, output, fullPage = false) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4179/demo/')
  for (const name of actions) await page.getByRole('button', { name, exact: true }).click()
  await page.waitForTimeout(420)
  await page.screenshot({ path: output, fullPage })
  await context.close()
}

await capture(
  { width: 1440, height: 900 },
  ['成功消息', '库存提醒'],
  '/private/tmp/zt-alert-desktop.png',
  true
)
await capture(
  { width: 1440, height: 900 },
  ['打开 Dialog'],
  '/private/tmp/zt-alert-dialog.png'
)
await capture(
  { width: 390, height: 844 },
  ['打开 Drawer'],
  '/private/tmp/zt-alert-mobile-drawer.png'
)

await browser.close()
