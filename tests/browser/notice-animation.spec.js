import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

for (const [service, variant] of [['ZtMessage', 'message'], ['ZtNotification', 'notification']]) {
  test(`${variant} enters smoothly and waits for its full exit before moving the stack`, async ({ page }) => {
    await page.evaluate(service => {
      window.api[service].success({ id: 'first', content: '第一条提示', duration: 0 })
      window.api[service].info({ id: 'second', content: '第二条提示', duration: 0 })
    }, service)
    const first = page.locator('[data-zt-id="first"]')
    const second = page.locator('[data-zt-id="second"]')
    await expect(first).toHaveClass(/zt-notice--visible/)
    const entrance = await first.evaluate(async element => {
      const animations = element.getAnimations()
      const movement = animations.find(animation => animation.transitionProperty === 'transform')
      if (!movement) throw new Error('Entrance must animate from a rendered starting position')
      await Promise.all(animations.map(animation => animation.ready))
      const duration = movement.effect.getTiming().duration
      const sample = time => {
        for (const animation of animations) { animation.pause(); animation.currentTime = time }
        const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
        return { x: matrix.m41, y: matrix.m42, opacity: parseFloat(getComputedStyle(element).opacity) }
      }
      const result = { initial: sample(0), middle: sample(duration / 2), final: sample(duration) }
      for (const animation of animations) animation.finish()
      return result
    })
    expect(entrance.initial.opacity).toBe(0)
    expect(entrance.middle.opacity).toBeGreaterThan(0)
    expect(entrance.final.opacity).toBe(1)
    const axis = variant === 'message' ? 'y' : 'x'
    expect(Math.abs(entrance.initial[axis])).toBeGreaterThan(Math.abs(entrance.middle[axis]))
    expect(entrance.final[axis]).toBe(0)
    await expect(second).toHaveCSS('opacity', '1')

    const positions = await page.evaluate(service => {
      const first = document.querySelector('[data-zt-id="first"]')
      const second = document.querySelector('[data-zt-id="second"]')
      const positions = { first: first.getBoundingClientRect().top, second: second.getBoundingClientRect().top }
      window.api[service].close('first')
      first.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
      return { ...positions, stillPresent: first.isConnected }
    }, service)
    expect(positions.stillPresent).toBe(true)
    await expect(first).toHaveCount(0)
    const movement = await second.evaluate(async element => {
      const slot = element.parentElement
      const animation = slot.getAnimations().find(animation => animation.transitionProperty === 'transform')
      if (!animation) throw new Error('Remaining notices must slide into the vacated space')
      await animation.ready
      animation.pause()
      animation.currentTime = 0
      const start = element.getBoundingClientRect().top
      animation.currentTime = animation.effect.getTiming().duration / 2
      const middle = element.getBoundingClientRect().top
      animation.finish()
      return { start, middle, final: element.getBoundingClientRect().top }
    })
    expect(movement.start).toBeCloseTo(positions.second, 0)
    expect(movement.middle).toBeLessThan(movement.start)
    expect(movement.middle).toBeGreaterThan(movement.final)
    expect(movement.final).toBeCloseTo(positions.first, 0)
  })

  test(`${variant} updates in place and can be revived during exit without a stale removal`, async ({ page }) => {
    await page.evaluate(service => { window.api[service].info({ id: 'job', content: '处理中', duration: 0 }) }, service)
    const notice = page.locator('[data-zt-id="job"]')
    await expect(notice).toHaveCSS('opacity', '1')
    const state = await page.evaluate(service => {
      const original = document.querySelector('[data-zt-id="job"]')
      window.api[service].success({ id: 'job', content: '处理完成', duration: 0 })
      return { sameNode: original === document.querySelector('[data-zt-id="job"]'), visible: original.classList.contains('zt-notice--visible') }
    }, service)
    expect(state).toEqual({ sameNode: true, visible: true })
    await page.evaluate(service => {
      window.api[service].close('job')
      window.api[service].warning({ id: 'job', content: '重新处理', duration: 0 })
      const element = document.querySelector('[data-zt-id="job"]')
      element.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform', bubbles: true }))
    }, service)
    await expect(notice).toHaveClass(/zt-notice--visible/)
    await expect(notice).not.toHaveClass(/zt-notice--leaving/)
    await expect(notice).toHaveCSS('opacity', '1')
    await page.waitForTimeout(400)
    await expect(notice).toContainText('重新处理')
    await page.evaluate(service => { window.api[service].clear() }, service)
    await expect(page.locator(`.zt-${variant}-stack`)).toHaveCount(0)
  })

  test(`${variant} respects reduced motion and handles closing before the entrance frame`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.evaluate(service => { window.api[service].info({ id: 'static', content: '静态提示', duration: 0 }) }, service)
    const notice = page.locator('[data-zt-id="static"]')
    await expect(notice).toHaveCSS('opacity', '1')
    expect(await notice.evaluate(element => element.getAnimations().length)).toBe(0)
    const result = await page.evaluate(service => {
      window.api[service].close('static')
      const removed = !document.querySelector('[data-zt-id="static"]')
      window.api[service].info({ id: 'immediate', content: '立即清理', duration: 0 })
      window.api[service].clear()
      return { removed, slots: document.querySelectorAll('.zt-notice-slot').length }
    }, service)
    expect(result).toEqual({ removed: true, slots: 0 })
    await expect(page.locator('.zt-notice')).toHaveCount(0)
    await expect(page.locator(`.zt-${variant}-stack`)).toHaveCount(0)
  })
}
