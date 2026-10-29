import { expect, test } from '@playwright/test'

test('startup work finishes before the MessageBox entrance timeline starts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/tests/fixtures/message-box-startup.html')
  await page.waitForFunction(() => window.entranceTime !== undefined)
  const time = await page.evaluate(() => window.entranceTime)
  expect(time).not.toBeNull()
  expect(time).toBeLessThan(50)
  expect(await page.evaluate(() => window.firstFrame)).toEqual({ visible: false, opacity: 0 })
  await expect(page.locator('.zt-box-layer')).toHaveClass(/--visible/)
})

test('the fading mask does not hide the launch of the box', async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  const opacity = await page.evaluate(async () => {
    window.api.ZtMessageBox({ title: '完整出场', icon: 'success' })
    const layer = document.querySelector('.zt-box-layer')
    while (!layer.classList.contains('zt-box-layer--visible')) {
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
    const box = layer.querySelector('.zt-box')
    const animations = [...layer.getAnimations(), ...box.getAnimations()]
    await Promise.all(animations.map(animation => animation.ready))
    for (const animation of animations) {
      animation.pause()
      animation.currentTime = 56
    }
    return Number(getComputedStyle(layer).opacity) * Number(getComputedStyle(box).opacity)
  })
  expect(opacity).toBeGreaterThan(0.65)
})

test('closing before the first paint cancels the pending entrance', async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  const result = await page.evaluate(async () => {
    const closed = window.api.ZtMessageBox({ title: '提前关闭' })
    const layer = document.querySelector('.zt-box-layer')
    window.api.ZtMessageBox.close()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const visible = layer.classList.contains('zt-box-layer--visible')
    return { visible, value: await closed, connected: layer.isConnected }
  })
  expect(result).toEqual({ visible: false, value: null, connected: false })
})
