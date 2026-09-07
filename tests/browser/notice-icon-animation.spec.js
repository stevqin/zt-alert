import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

for (const service of ['ZtMessage', 'ZtNotification']) {
  for (const width of [1280, 360]) {
    test(`${service} keeps its icon at the top left as content grows at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      for (const title of [undefined, '数据更新']) {
        for (const content of ['同步完成', '销售、库存和商品档案正在同步，请确认品牌、季节、渠道及统计日期，待所有数据源校验完成后再发布报表。'.repeat(3)]) {
          await page.evaluate(({ service, title, content }) => {
            window.api[service].info({ id: 'alignment', title, content, duration: 0 })
          }, { service, title, content })
          const notice = page.locator('[data-zt-id="alignment"]')
          await expect(notice).toHaveClass(/zt-notice--visible/)
          const layout = await notice.evaluate(element => {
            const style = getComputedStyle(element)
            const bounds = element.getBoundingClientRect()
            const icon = element.querySelector('.zt-notice__icon').getBoundingClientRect()
            const body = element.querySelector('.zt-notice__body').getBoundingClientRect()
            return {
              topGap: icon.top - bounds.top - parseFloat(style.borderTopWidth) - parseFloat(style.paddingTop),
              leftGap: icon.left - bounds.left - parseFloat(style.borderLeftWidth) - parseFloat(style.paddingLeft),
              iconHeight: icon.height,
              bodyHeight: body.height,
              centerGap: icon.top + icon.height / 2 - body.top - body.height / 2
            }
          })
          expect(Math.abs(layout.topGap)).toBeLessThan(0.5)
          expect(Math.abs(layout.leftGap)).toBeLessThan(0.5)
          if (content.length > 20) expect(layout.bodyHeight).toBeGreaterThan(layout.iconHeight * 2)
          if (service === 'ZtMessage' && !title && content.length < 20) {
            expect(Math.abs(layout.centerGap)).toBeLessThan(0.5)
          }
        }
      }
    })
  }

  test(`${service} draws all status icons without the side stripe`, async ({ page }) => {
    for (const status of ['success', 'warning', 'error', 'info']) {
      await page.evaluate(({ service, status }) => {
        window.api[service].open({ id: 'icon', status, content: '状态图标', duration: 0 })
      }, { service, status })
      const notice = page.locator('[data-zt-id="icon"]')
      await expect(notice).toHaveClass(/zt-notice--visible/)
      await expect(notice.locator('.zt-notice__signal')).toHaveCount(0)
      if (status === 'warning' || status === 'info') {
        const glyph = notice.locator('.zt-notice__icon svg')
        await expect(glyph.locator('path, circle')).toHaveCount(2)
        expect(await glyph.evaluate(svg => svg.getBBox().width)).toBeLessThan(1)
      }
      const samples = await notice.evaluate(async element => {
        const strokes = [...element.querySelectorAll('.zt-notice__icon svg path, .zt-notice__icon svg circle')]
        const animations = strokes.map(stroke => stroke.getAnimations()[0])
        if (!animations.every(Boolean)) throw new Error('Every status stroke must draw')
        await Promise.all(animations.map(animation => animation.ready))
        const { delay, duration } = animations[0].effect.getTiming()
        const sample = time => {
          for (const animation of animations) { animation.pause(); animation.currentTime = time }
          return strokes.map(stroke => ({
            offset: parseFloat(getComputedStyle(stroke).strokeDashoffset),
            opacity: parseFloat(getComputedStyle(stroke).opacity)
          }))
        }
        const samples = { initial: sample(0), middle: sample(delay + duration / 2), final: sample(delay + duration) }
        for (const animation of animations) animation.finish()
        return samples
      })
      samples.initial.forEach((stroke, index) => {
        expect(stroke.opacity).toBe(0)
        expect(stroke.offset).toBeGreaterThan(0)
        expect(samples.middle[index].offset).toBeGreaterThan(0)
        expect(samples.middle[index].offset).toBeLessThan(stroke.offset)
        expect(samples.final[index]).toEqual({ offset: 0, opacity: 1 })
      })
    }
  })

  test(`${service} preserves the icon on text updates and draws a new status in place`, async ({ page }) => {
    await page.evaluate(service => {
      window.api[service].info({ id: 'job', content: '同步中', duration: 0 })
    }, service)
    const notice = page.locator('[data-zt-id="job"]')
    await expect(notice).toHaveClass(/zt-notice--visible/)
    const update = await page.evaluate(service => {
      const element = document.querySelector('[data-zt-id="job"]')
      const original = element.querySelector('.zt-notice__icon svg')
      window.api[service].info({ id: 'job', content: '已同步 50%', duration: 0 })
      const preserved = element.querySelector('.zt-notice__icon svg') === original
      window.api[service].success({ id: 'job', content: '同步完成', duration: 0 })
      return {
        preserved,
        replaced: element.querySelector('.zt-notice__icon svg') !== original,
        sameNotice: document.querySelector('[data-zt-id="job"]') === element,
        drawing: element.querySelector('.zt-notice__icon path').getAnimations().length > 0,
        visible: element.classList.contains('zt-notice--visible')
      }
    }, service)
    expect(update).toEqual({ preserved: true, replaced: true, sameNotice: true, drawing: true, visible: true })
  })

  test(`${service} displays complete icons immediately with reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.evaluate(service => {
      window.api[service].warning({ id: 'static', content: '静态提示', duration: 0 })
    }, service)
    const notice = page.locator('[data-zt-id="static"]')
    await expect(notice).toHaveClass(/zt-notice--visible/)
    const strokes = await notice.evaluate(element => [...element.querySelectorAll('.zt-notice__icon svg path')].map(stroke => ({
      animations: stroke.getAnimations().length,
      offset: parseFloat(getComputedStyle(stroke).strokeDashoffset),
      opacity: getComputedStyle(stroke).opacity
    })))
    for (const stroke of strokes) expect(stroke).toEqual({ animations: 0, offset: 0, opacity: '1' })
  })
}
