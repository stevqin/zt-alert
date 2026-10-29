import { expect, test } from '@playwright/test'

for (const kind of ['dialog', 'drawer', 'fullscreen', 'loading']) {
  test(`${kind} preserves its entrance after a busy startup frame`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(`/tests/fixtures/overlay-startup.html?kind=${kind}`)
    await page.waitForFunction(() => window.entranceTime !== undefined)
    expect(await page.evaluate(() => window.firstFrame)).toEqual({ visible: false, opacity: 0 })
    const time = await page.evaluate(() => window.entranceTime)
    expect(time).not.toBeNull()
    expect(time).toBeLessThan(50)
    await expect(page.locator('.zt-overlay, .zt-loading-layer')).toHaveClass(/--visible/)
  })

  test(`${kind} can close between its initial frame and entrance`, async ({ page }) => {
    await page.goto('/tests/fixtures/test-page.html')
    await page.waitForFunction(() => Boolean(window.api))
    const state = await page.evaluate(async kind => {
      let shown = 0
      const instance = kind === 'loading'
        ? window.api.ZtLoading.open('提前关闭')
        : window.api[kind === 'drawer' ? 'ZtDrawer' : 'ZtDialog'].open({
          title: '提前关闭', fullscreen: kind === 'fullscreen', onShow: () => { shown++ }
        })
      const layer = document.querySelector('.zt-overlay, .zt-loading-layer')
      await new Promise(requestAnimationFrame)
      await instance.close()
      await instance.closed
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      return { connected: layer.isConnected, visible: layer.className.includes('--visible'), shown }
    }, kind)
    expect(state).toEqual({ connected: false, visible: false, shown: 0 })
  })
}
