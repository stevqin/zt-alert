import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    window.renderCount = 0
    window.overlay = window.api.ZtDialog.open({
      title: '报表编辑', width: 640, height: 420, showZoom: true, showFooter: true,
      render(body) {
        window.renderCount += 1
        body.innerHTML = '<input autofocus value="未保存的报表"><div style="height:1200px">报表明细</div>'
      }
    })
    window.panel = document.querySelector('.zt-dialog__panel')
    window.input = window.panel.querySelector('input')
    window.readBounds = () => {
      const bounds = window.panel.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    }
    window.resizeAnimations = () => window.panel.getAnimations().filter(animation => ['width', 'height', 'left', 'top', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius'].includes(animation.transitionProperty))
  })
  await expect(page.locator('.zt-dialog__panel')).toHaveCSS('transform', 'none')
})

function expectBounds(actual, expected) {
  for (const key of ['x', 'y', 'width', 'height']) expect(actual[key]).toBeCloseTo(expected[key], 0)
}

async function settled(page) {
  await expect(page.locator('.zt-dialog__panel')).not.toHaveClass(/zt-dialog__panel--resizing/)
}

test('fullscreen and restore animate the actual window bounds without stretching its bars', async ({ page }) => {
  const original = await page.evaluate(() => window.readBounds())
  for (const fullscreen of [true, false]) {
    const samples = await page.evaluate(async () => {
      const before = window.readBounds()
      window.panel.querySelector('.zt-overlay__zoom').click()
      const animations = window.resizeAnimations()
      if (!animations.length) return { animated: false }
      await Promise.all(animations.map(animation => animation.ready))
      for (const animation of animations) animation.pause()
      const sample = time => {
        for (const animation of animations) animation.currentTime = time
        return {
          bounds: window.readBounds(),
          header: window.panel.querySelector('header').getBoundingClientRect().height,
          footer: window.panel.querySelector('footer').getBoundingClientRect().height
        }
      }
      const duration = animations[0].effect.getTiming().duration
      const result = { animated: true, before, duration, start: sample(0), middle: sample(duration / 2), end: sample(duration) }
      for (const animation of animations) animation.finish()
      return result
    })
    expect(samples.animated).toBe(true)
    expect(samples.duration).toBe(280)
    expectBounds(samples.start.bounds, samples.before)
    const target = fullscreen ? { x: 0, y: 0, width: 1280, height: 800 } : original
    expectBounds(samples.end.bounds, target)
    expect(samples.middle.bounds.width).toBeGreaterThan(640)
    expect(samples.middle.bounds.width).toBeLessThan(1280)
    for (const frame of [samples.start, samples.middle, samples.end]) {
      expect(frame.header).toBe(66)
      expect(frame.footer).toBe(54)
    }
    await settled(page)
  }
  expect(await page.evaluate(() => ({ renders: window.renderCount, sameInput: window.panel.querySelector('input') === window.input, focused: document.activeElement === window.input, value: window.input.value }))).toEqual({ renders: 1, sameInput: true, focused: true, value: '未保存的报表' })
  await expect(page.locator('.zt-dialog__panel')).toHaveCSS('position', 'relative')
})

test('rapid reversal continues from the currently displayed rectangle', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const original = window.readBounds()
    window.overlay.toggleFullscreen(true)
    const animations = window.resizeAnimations()
    if (!animations.length) return { animated: false }
    await Promise.all(animations.map(animation => animation.ready))
    for (const animation of animations) { animation.pause(); animation.currentTime = 70 }
    const middle = window.readBounds()
    window.overlay.toggleFullscreen(false)
    const reversed = window.resizeAnimations()
    for (const animation of reversed) { animation.pause(); animation.currentTime = 0 }
    const restarted = window.readBounds()
    for (const animation of reversed) animation.finish()
    return { animated: reversed.length > 0, original, middle, restarted }
  })
  expect(result.animated).toBe(true)
  expect(result.middle.width).toBeGreaterThan(result.original.width)
  expectBounds(result.restarted, result.middle)
  await settled(page)
  expectBounds(await page.evaluate(() => window.readBounds()), result.original)
})

test('updates preserve motion and restore auto height, percentage width and top offset', async ({ page }) => {
  await page.evaluate(() => window.overlay.update({ width: '60%', height: undefined, maxHeight: '75%', top: 72 }))
  const original = await page.evaluate(() => window.readBounds())
  await page.evaluate(() => window.overlay.update({ fullscreen: true }))
  await expect(page.locator('.zt-dialog__panel')).toHaveClass(/zt-dialog__panel--resizing/)
  await page.evaluate(() => window.overlay.update({ title: '更新后的报表' }))
  await settled(page)
  await page.evaluate(() => window.overlay.update({ fullscreen: false }))
  await expect(page.locator('.zt-dialog__panel')).toHaveClass(/zt-dialog__panel--resizing/)
  await settled(page)
  expectBounds(await page.evaluate(() => window.readBounds()), original)
  expect(await page.evaluate(() => ({ width: window.panel.style.width, height: window.panel.style.height, top: window.panel.style.top, renders: window.renderCount }))).toEqual({ width: '60%', height: '', top: '', renders: 1 })
})

test('resizing the viewport during fullscreen motion releases temporary geometry', async ({ page }) => {
  await page.evaluate(() => window.overlay.toggleFullscreen(true))
  await expect(page.locator('.zt-dialog__panel')).toHaveClass(/zt-dialog__panel--resizing/)
  await page.setViewportSize({ width: 1000, height: 700 })
  await settled(page)
  expectBounds(await page.evaluate(() => window.readBounds()), { x: 0, y: 0, width: 1000, height: 700 })
  await page.evaluate(() => window.overlay.toggleFullscreen(false))
  await settled(page)
  expectBounds(await page.evaluate(() => window.readBounds()), { x: 180, y: 140, width: 640, height: 420 })
})

test('closing mid-transition fades from its current size and cleans up the motion', async ({ page }) => {
  const result = await page.evaluate(async () => {
    window.overlay.toggleFullscreen(true)
    const animations = window.resizeAnimations()
    if (!animations.length) return { animated: false }
    await Promise.all(animations.map(animation => animation.ready))
    for (const animation of animations) { animation.pause(); animation.currentTime = 70 }
    const before = window.readBounds()
    await window.overlay.close()
    return { animated: true, before, after: window.readBounds() }
  })
  expect(result.animated).toBe(true)
  expectBounds(result.after, result.before)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => window.panel.classList.contains('zt-dialog__panel--resizing'))).toBe(false)
})

test('reduced motion switches directly and retains responsive fullscreen behavior', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => window.overlay.toggleFullscreen(true))
  await settled(page)
  expect(await page.evaluate(() => window.resizeAnimations().length)).toBe(0)
  expectBounds(await page.evaluate(() => window.readBounds()), { x: 0, y: 0, width: 1280, height: 800 })
  await page.evaluate(() => window.overlay.toggleFullscreen(false))
  await settled(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.zt-dialog')).toHaveClass(/zt-dialog--fullscreen/)
  expectBounds(await page.evaluate(() => window.readBounds()), { x: 0, y: 0, width: 390, height: 844 })
})
