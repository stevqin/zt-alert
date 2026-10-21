import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

for (const [service, variant] of [['ZtMessage', 'message'], ['ZtNotification', 'notification']]) {
  test(`${variant} enters with a light directional jelly rebound without replaying on update`, async ({ page }) => {
    await page.evaluate(service => { window.api[service].info({ id: 'motion', content: '加载中', duration: 0 }) }, service)
    const notice = page.locator('[data-zt-id="motion"]')
    await expect(notice).toHaveClass(/--visible/)
    const samples = await notice.evaluate(async (element, service) => {
      const entry = element.getAnimations().find(animation => animation.animationName === 'zt-notice-enter')
      if (!entry) return null
      await entry.ready
      entry.pause()
      const sample = time => {
        entry.currentTime = time
        const style = getComputedStyle(element)
        const matrix = new DOMMatrixReadOnly(style.transform)
        return { x: matrix.m41, y: matrix.m42, sx: matrix.a, sy: matrix.d, opacity: Number(style.opacity) }
      }
      const result = { duration: entry.effect.getTiming().duration, start: sample(0), rebound: sample(120), end: sample(440) }
      entry.currentTime = 120
      window.api[service].success({ id: 'motion', content: '已完成', duration: 0 })
      result.sameEntry = element.getAnimations().includes(entry) && entry.currentTime === 120
      entry.finish()
      return result
    }, service)
    expect(samples).not.toBeNull()
    expect(samples.duration).toBe(440)
    expect(samples.start.opacity).toBe(0)
    if (variant === 'message') {
      expect(samples.start.y).toBeLessThan(-20)
      expect(samples.rebound.y).toBeGreaterThan(3)
    } else {
      expect(samples.start.x).toBeGreaterThan(40)
      expect(samples.rebound.x).toBeLessThan(-6)
    }
    expect(Math.abs(samples.rebound.sx - 1)).toBeLessThan(0.06)
    expect(samples.sameEntry).toBe(true)
    expect(samples.end).toEqual({ x: 0, y: 0, sx: 1, sy: 1, opacity: 1 })
  })

  test(`${variant} shrinks before leaving and keeps the stack stationary until the full exit`, async ({ page }) => {
    await page.evaluate(service => {
      window.api[service].info({ id: 'first', content: '第一条', duration: 0 })
      window.api[service].success({ id: 'second', content: '第二条', duration: 0 })
    }, service)
    await expect(page.locator('[data-zt-id="first"]')).toHaveClass(/--visible/)
    const motion = await page.evaluate(async service => {
      const first = document.querySelector('[data-zt-id="first"]')
      const second = document.querySelector('[data-zt-id="second"]')
      for (const notice of [first, second]) for (const animation of notice.getAnimations()) animation.finish()
      const initialTop = second.getBoundingClientRect().top
      window.api[service].close('first')
      const exit = first.getAnimations().find(animation => animation.animationName === 'zt-notice-exit')
      if (!exit) return null
      await exit.ready
      exit.pause()
      const sample = time => {
        exit.currentTime = time
        const matrix = new DOMMatrixReadOnly(getComputedStyle(first).transform)
        return { x: matrix.m41, y: matrix.m42, scale: matrix.a, opacity: Number(getComputedStyle(first).opacity) }
      }
      const result = { duration: exit.effect.getTiming().duration, initialTop, shrink: sample(90), leave: sample(240), end: sample(300), currentTop: second.getBoundingClientRect().top }
      first.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
      first.querySelector('svg path').dispatchEvent(new AnimationEvent('animationend', { animationName: 'zt-notice-icon-draw', bubbles: true }))
      result.connected = first.isConnected
      exit.finish()
      return result
    }, service)
    expect(motion).not.toBeNull()
    expect(motion.duration).toBe(300)
    expect(motion.shrink.scale).toBeCloseTo(0.96, 3)
    expect(motion.shrink.opacity).toBe(1)
    expect(motion.shrink.x).toBe(0)
    expect(motion.shrink.y).toBe(0)
    expect(motion.currentTop).toBe(motion.initialTop)
    expect(motion.connected).toBe(true)
    expect(motion.end.opacity).toBe(0)
    expect(variant === 'message' ? motion.leave.y < -5 : motion.leave.x > 10).toBe(true)
    await expect(page.locator('[data-zt-id="first"]')).toHaveCount(0)
    await expect(page.locator('[data-zt-id="second"]')).toBeVisible()
  })

  test(`${variant} resumes from its current exit pose when the same id is reopened`, async ({ page }) => {
    await page.evaluate(service => { window.api[service].info({ id: 'revive', content: '处理中', duration: 0 }) }, service)
    await expect(page.locator('[data-zt-id="revive"]')).toHaveClass(/--visible/)
    const poses = await page.evaluate(async service => {
      const element = document.querySelector('[data-zt-id="revive"]')
      element.getAnimations().forEach(animation => animation.finish())
      window.api[service].close('revive')
      const exit = element.getAnimations().find(animation => animation.animationName === 'zt-notice-exit')
      if (!exit) return null
      await exit.ready
      exit.pause()
      exit.currentTime = 180
      const before = getComputedStyle(element).transform
      window.api[service].success({ id: 'revive', content: '已恢复', duration: 0 })
      const revive = element.getAnimations().find(animation => animation.animationName === 'zt-notice-revive')
      if (!revive) return null
      revive.pause()
      revive.currentTime = 0
      const after = getComputedStyle(element).transform
      revive.finish()
      return { before, after }
    }, service)
    expect(poses).not.toBeNull()
    expect(poses.after).toBe(poses.before)
    await page.waitForTimeout(400)
    await expect(page.locator('[data-zt-id="revive"]')).toContainText('已恢复')
    await expect(page.locator('[data-zt-id="revive"]')).toHaveCSS('opacity', '1')
  })
}
