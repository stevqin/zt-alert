import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

for (const kind of ['box', 'dialog']) {
  const selector = kind === 'box' ? '.zt-box' : '.zt-dialog__panel'
  const layer = kind === 'box' ? '.zt-box-layer' : '.zt-dialog'
  const open = async page => {
    await page.evaluate(async kind => {
      window.finished = false
      if (kind === 'box') {
        window.api.ZtMessageBox({ title: '果冻弹跳', icon: 'success' }).then(() => { window.finished = true })
        window.closeOverlay = () => window.api.ZtMessageBox.close()
      } else {
        window.overlay = window.api.ZtDialog.open({ title: '果冻弹跳', content: '内容' })
        window.overlay.closed.then(() => { window.finished = true })
        window.closeOverlay = () => window.overlay.close()
      }
      const root = document.querySelector(kind === 'box' ? '.zt-box-layer' : '.zt-dialog')
      while (!root.className.includes('--visible')) {
        await new Promise(resolve => requestAnimationFrame(resolve))
      }
      // Sample the entrance in the browser frame, before driver latency can
      // consume the entire animation on a busy machine.
      root.querySelector(kind === 'box' ? '.zt-box' : '.zt-dialog__panel')
        .getAnimations().forEach(animation => animation.pause())
    }, kind)
    await expect(page.locator(layer)).toHaveClass(/--visible/)
  }

  test(`${kind} stretches, rebounds above its resting position and settles smoothly`, async ({ page }) => {
    await open(page)
    const samples = await page.locator(selector).evaluate(async panel => {
      const animation = panel.getAnimations().find(animation => animation.animationName === 'zt-panel-enter')
      if (!animation) return null
      await animation.ready
      animation.pause()
      const sample = time => {
        animation.currentTime = time
        const matrix = new DOMMatrixReadOnly(getComputedStyle(panel).transform)
        return { x: matrix.a, y: matrix.d, top: matrix.m42 }
      }
      return { duration: animation.effect.getTiming().duration, start: sample(0), launch: sample(56), rebound: sample(140), settle: sample(420), end: sample(560) }
    })
    expect(samples).not.toBeNull()
    expect(samples.duration).toBe(560)
    expect(samples.start.top).toBeGreaterThan(45)
    expect(samples.launch.x).toBeLessThan(0.9)
    expect(samples.launch.y).toBeGreaterThan(1.05)
    expect(samples.rebound.top).toBeLessThan(-12)
    expect(Math.abs(samples.settle.top)).toBeLessThan(3)
    expect(samples.end).toEqual({ x: 1, y: 1, top: 0 })
  })

  test(`${kind} responds immediately, shrinks for 150ms and completes its fall before removal`, async ({ page }) => {
    await open(page)
    await page.locator(selector).evaluate(panel => panel.getAnimations().forEach(animation => animation.finish()))
    const motion = await page.evaluate(async ({ selector, layer }) => {
      await window.closeOverlay()
      const panel = document.querySelector(selector)
      const root = document.querySelector(layer)
      const exit = panel.getAnimations().find(animation => animation.animationName === 'zt-panel-exit')
      if (!exit) return null
      await exit.ready
      exit.pause()
      const sample = time => {
        exit.currentTime = time
        const style = getComputedStyle(panel)
        const matrix = new DOMMatrixReadOnly(style.transform)
        return { scale: matrix.a, top: matrix.m42, opacity: Number(style.opacity), layerOpacity: Number(getComputedStyle(root).opacity) }
      }
      const result = { duration: exit.effect.getTiming().duration, response: sample(30), shrink: sample(150), fall: sample(280), end: sample(350) }
      root.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
      panel.querySelector('button')?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'color', bubbles: true }))
      result.connected = root.isConnected
      result.finished = window.finished
      exit.finish()
      return result
    }, { selector, layer })
    expect(motion).not.toBeNull()
    expect(motion.duration).toBe(350)
    expect(motion.response.scale).toBeLessThan(1)
    expect(motion.shrink).toMatchObject({ opacity: 1, layerOpacity: 1 })
    expect(motion.shrink.top).toBeCloseTo(0, 5)
    expect(motion.shrink.scale).toBeCloseTo(0.9, 3)
    expect(motion.fall.top).toBeGreaterThan(25)
    expect(motion.end.top).toBe(120)
    expect(motion.end.opacity).toBe(0)
    expect(motion.connected).toBe(true)
    expect(motion.finished).toBe(false)
    await expect.poll(() => page.evaluate(() => window.finished)).toBe(true)
    await expect(page.locator(layer)).toHaveCount(0)
  })

  test(`${kind} reduced motion closes without an animation delay`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    expect(await page.evaluate(async layer => {
      await window.closeOverlay()
      return document.querySelector(layer) === null
    }, layer)).toBe(true)
    await expect.poll(() => page.evaluate(() => window.finished)).toBe(true)
    await expect(page.locator(layer)).toHaveCount(0)
  })
}

test('drawer has a lighter sideways rebound and keeps its full slide-out', async ({ page }) => {
  await page.evaluate(() => { window.overlay = window.api.ZtDrawer.open({ title: '轻弹性抽屉', width: 640 }) })
  await expect(page.locator('.zt-drawer')).toHaveClass(/--visible/)
  const motion = await page.locator('.zt-drawer__panel').evaluate(async panel => {
    const animation = panel.getAnimations().find(animation => animation.animationName === 'zt-drawer-enter')
    await animation.ready
    animation.pause()
    const sample = time => {
      animation.currentTime = time
      const matrix = new DOMMatrixReadOnly(getComputedStyle(panel).transform)
      return { left: matrix.m41, x: matrix.a, y: matrix.d }
    }
    const result = { duration: animation.effect.getTiming().duration, start: sample(0), peak: sample(288), end: sample(480) }
    animation.finish()
    return result
  })
  expect(motion.duration).toBe(480)
  expect(motion.start.left).toBeGreaterThan(600)
  expect(motion.peak.left).toBeLessThan(-10)
  expect(motion.peak.left).toBeGreaterThan(-20)
  expect(Math.abs(motion.peak.x - 1)).toBeLessThan(0.01)
  expect(motion.end).toEqual({ left: 0, x: 1, y: 1 })
  const exit = await page.evaluate(async () => {
    await window.overlay.close()
    const panel = document.querySelector('.zt-drawer__panel')
    const animation = panel.getAnimations().find(animation => animation.animationName === 'zt-drawer-exit')
    const duration = animation.effect.getTiming().duration
    animation.pause()
    animation.currentTime = 200
    const result = { duration, x: new DOMMatrixReadOnly(getComputedStyle(panel).transform).m41, opacity: getComputedStyle(panel.parentElement).opacity }
    animation.finish()
    return result
  })
  expect(exit.duration).toBe(330)
  expect(exit.x).toBeGreaterThan(100)
  expect(exit.opacity).toBe('1')
  await expect(page.locator('.zt-drawer')).toHaveCount(0)
})

test('closing mid-bounce continues from the current panel pose', async ({ page }) => {
  await page.evaluate(() => { window.api.ZtMessageBox({ title: '提前关闭' }) })
  await expect(page.locator('.zt-box-layer')).toHaveClass(/--visible/)
  const pose = await page.locator('.zt-box').evaluate(async panel => {
    const entry = panel.getAnimations().find(animation => animation.animationName === 'zt-panel-enter')
    await entry.ready
    entry.pause()
    entry.currentTime = 70
    const before = getComputedStyle(panel).transform
    window.api.ZtMessageBox.close()
    const exit = panel.getAnimations().find(animation => animation.animationName === 'zt-panel-exit')
    exit.pause()
    exit.currentTime = 0
    const after = getComputedStyle(panel).transform
    exit.finish()
    return { before, after }
  })
  expect(pose.after).toBe(pose.before)
  await expect(page.locator('.zt-box-layer')).toHaveCount(0)
})
