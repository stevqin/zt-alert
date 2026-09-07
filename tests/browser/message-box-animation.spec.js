import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
})

for (const icon of ['success', 'error', 'warning', 'info']) {
  test(`${icon} starts drawing when the box begins shrinking after its first peak`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.evaluate(icon => { window.api.ZtMessageBox({ title: '动画预览', icon }) }, icon)
    await expect.poll(() => page.locator('.zt-box').evaluate(box => (
      box.getAnimations().some(animation => animation.animationName === 'zt-box-enter')
    ))).toBe(true)
    await expect(page.locator('.zt-box__icon-frame path')).toHaveCount(1)
    if (icon === 'warning' || icon === 'info') {
      const glyph = page.locator('.zt-box__icon svg:not(.zt-box__icon-frame)')
      await expect(glyph.locator('path, circle')).toHaveCount(2)
      expect(await glyph.evaluate(svg => svg.getBBox().width)).toBeLessThan(1)
    }

    const samples = await page.locator('.zt-box').evaluate(async box => {
      const entrance = box.getAnimations().find(animation => animation.animationName === 'zt-box-enter')
      const frame = box.querySelector('.zt-box__icon-frame')
      const softening = frame.getAnimations()[0]
      if (!softening) throw new Error('The border must soften after drawing completes')
      const strokes = [...box.querySelectorAll('svg path, svg circle')]
      const drawings = strokes.map(stroke => stroke.getAnimations()[0])
      if (!drawings.every(Boolean)) throw new Error('Every built-in icon stroke must animate')
      await Promise.all([entrance, ...drawings, softening].map(animation => animation.ready))
      const duration = entrance.effect.getTiming().duration
      const peakTime = duration * 0.45
      const drawingEnd = drawings[0].effect.getTiming().delay + drawings[0].effect.getTiming().duration
      const softenTiming = softening.effect.getTiming()
      const starts = drawings.map(animation => ({
        difference: animation.startTime - entrance.startTime,
        delay: animation.effect.getTiming().delay
      }))
      const sample = time => {
        for (const animation of [entrance, ...drawings, softening]) {
          animation.pause()
          animation.currentTime = time
        }
        return {
          scale: new DOMMatrixReadOnly(getComputedStyle(box).transform).a,
          frameOpacity: parseFloat(getComputedStyle(frame).opacity),
          strokes: strokes.map(stroke => ({
            offset: parseFloat(getComputedStyle(stroke).strokeDashoffset),
            opacity: parseFloat(getComputedStyle(stroke).opacity)
          }))
        }
      }
      return {
        duration,
        glyphWidth: getComputedStyle(box.querySelector('.zt-box__icon svg:not(.zt-box__icon-frame)')).width,
        drawingEnd,
        softenDelay: softenTiming.delay,
        softenStartDifference: softening.startTime - entrance.startTime,
        iconShadow: getComputedStyle(box.querySelector('.zt-box__icon')).boxShadow,
        starts,
        peakTime,
        initial: sample(0),
        beforePeak: sample(peakTime - 1),
        peak: sample(peakTime),
        drawing: sample(peakTime + 70),
        trough: sample(duration * 0.75),
        drawn: sample(drawingEnd),
        softening: sample(drawingEnd + softenTiming.duration / 2),
        complete: sample(softenTiming.delay + softenTiming.duration + 1)
      }
    })

    expect(samples.duration).toBe(280)
    expect(samples.glyphWidth).toBe('44px')
    expect(samples.softenDelay).toBeCloseTo(samples.drawingEnd, 3)
    expect(samples.softenStartDifference).toBeCloseTo(0, 1)
    expect(samples.drawing.frameOpacity).toBe(1)
    expect(samples.drawn.frameOpacity).toBe(1)
    expect(samples.drawn.strokes.every(stroke => stroke.offset === 0)).toBe(true)
    expect(samples.softening.frameOpacity).toBeLessThan(1)
    expect(samples.softening.frameOpacity).toBeGreaterThan(0.35)
    expect(samples.complete.frameOpacity).toBeCloseTo(0.35, 3)
    expect(samples.iconShadow).not.toContain('inset')
    expect(samples.initial.scale).toBeLessThan(1)
    expect(samples.peak.scale).toBeGreaterThan(1)
    expect(samples.drawing.scale).toBeLessThan(samples.peak.scale)
    expect(samples.trough.scale).toBeLessThan(1)
    expect(samples.complete.scale).toBeCloseTo(1, 3)
    for (const start of samples.starts) {
      expect(start.difference).toBeCloseTo(0, 1)
      expect(start.delay).toBeCloseTo(samples.peakTime, 1)
    }
    samples.beforePeak.strokes.forEach((stroke, index) => {
      expect(stroke.opacity).toBe(0)
      expect(stroke.offset).toBeGreaterThan(0)
      expect(samples.drawing.strokes[index].offset).toBeLessThan(stroke.offset)
      expect(samples.drawing.strokes[index].offset).toBeGreaterThan(0)
      expect(samples.complete.strokes[index].offset).toBe(0)
      expect(samples.complete.strokes[index].opacity).toBe(1)
    })
  })
}

test('reduced motion displays the final box and complete icon immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => { window.api.ZtMessageBox({ title: '静态提示', icon: 'success' }) })
  await expect(page.locator('.zt-box-layer')).toHaveClass(/zt-box-layer--visible/)
  const state = await page.locator('.zt-box').evaluate(box => ({
    transform: getComputedStyle(box).transform,
    animation: getComputedStyle(box).animationName,
    frameAnimation: getComputedStyle(box.querySelector('.zt-box__icon-frame')).animationName,
    frameOpacity: getComputedStyle(box.querySelector('.zt-box__icon-frame')).opacity,
    strokes: [...box.querySelectorAll('svg path')].map(stroke => ({
      animation: getComputedStyle(stroke).animationName,
      offset: parseFloat(getComputedStyle(stroke).strokeDashoffset),
      opacity: getComputedStyle(stroke).opacity
    }))
  }))
  expect(state.transform).toBe('none')
  expect(state.animation).toBe('none')
  expect(state.frameAnimation).toBe('none')
  expect(state.frameOpacity).toBe('0.35')
  for (const stroke of state.strokes) expect(stroke).toEqual({ animation: 'none', offset: 0, opacity: '1' })
})

test('shake false keeps the box steady and starts drawing without a delay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => { window.api.ZtMessageBox({ title: '关闭回弹', icon: 'success', shake: false }) })
  await expect(page.locator('.zt-box-layer')).toHaveClass(/zt-box-layer--visible/)
  const state = await page.locator('.zt-box').evaluate(box => ({
    animation: getComputedStyle(box).animationName,
    delay: box.querySelector('svg path').getAnimations()[0].effect.getTiming().delay,
    softenDelay: box.querySelector('.zt-box__icon-frame').getAnimations()[0].effect.getTiming().delay
  }))
  expect(state).toEqual({ animation: 'none', delay: 0, softenDelay: 320 })
})

test('closing during entrance cancels the bounce and resolves normally', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => { window.boxPromise = window.api.ZtMessageBox({ title: '提前关闭', icon: 'success' }) })
  await expect.poll(() => page.locator('.zt-box').evaluate(box => box.getAnimations().some(animation => animation.animationName === 'zt-box-enter'))).toBe(true)
  const animationName = await page.evaluate(() => {
    window.api.ZtMessageBox.close()
    return getComputedStyle(document.querySelector('.zt-box')).animationName
  })
  expect(animationName).toBe('none')
  expect(await page.evaluate(() => window.boxPromise)).toBeNull()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
