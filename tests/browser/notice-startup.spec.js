import { expect, test } from '@playwright/test'

test('startup notices paint their hidden pose before beginning their entrance and countdown', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/tests/fixtures/notice-startup.html')
  await page.waitForFunction(() => window.entrances !== undefined)
  expect(await page.evaluate(() => window.firstFrame)).toEqual([
    { visible: false, opacity: 0 },
    { visible: false, opacity: 0 }
  ])
  for (const state of await page.evaluate(() => window.entrances)) {
    expect(state.connected).toBe(true)
    expect(state.closing).toBe(false)
    expect(state.time).not.toBeNull()
    expect(state.time).toBeLessThan(50)
  }
  await expect(page.locator('.zt-notice')).toHaveCount(0)
})

for (const service of ['ZtMessage', 'ZtNotification']) {
  test(`${service} can be cleared between the initial paint and entrance`, async ({ page }) => {
    await page.goto('/tests/fixtures/test-page.html')
    await page.waitForFunction(() => Boolean(window.api))
    const state = await page.evaluate(async service => {
      window.api[service].info({ id: 'cancel-startup', content: '提前清理', duration: 0 })
      const element = document.querySelector('[data-zt-id="cancel-startup"]')
      await new Promise(resolve => requestAnimationFrame(resolve))
      window.api[service].clear()
      await new Promise(resolve => requestAnimationFrame(resolve))
      return { connected: element.isConnected, visible: element.classList.contains('zt-notice--visible') }
    }, service)
    expect(state).toEqual({ connected: false, visible: false })
  })
}
