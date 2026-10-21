import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

for (const [kind, width] of [['dialog', 1280], ['dialog', 320], ['drawer', 1280], ['drawer', 320]]) {
  test(`${kind} keeps unified header and footer without overlaps at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.evaluate(kind => {
      window.overlay = window.api[kind === 'dialog' ? 'ZtDialog' : 'ZtDrawer'].open({
        title: '报表名称和说明都很长时也不能挤占操作按钮的位置'.repeat(3),
        subtitle: '修改只对当前报表生效'.repeat(5),
        width: 680,
        height: 440,
        showZoom: true,
        showFooter: true,
        confirmText: '保存并同步当前报表到所有相关的工作区',
        cancelText: '取消本次修改并返回原来的报表',
        content: '报表内容'
      })
    }, kind)
    await expect(page.locator('.zt-overlay__header')).toHaveCSS('height', '66px')
    await expect(page.locator('.zt-overlay__footer')).toHaveCSS('height', '54px')
    await expect(page.locator('.zt-overlay__panel')).toHaveCSS('transform', 'none')
    const layout = await page.locator('.zt-overlay__panel').evaluate(panel => {
      const header = panel.querySelector('header').getBoundingClientRect()
      const footer = panel.querySelector('footer').getBoundingClientRect()
      const heading = panel.querySelector('.zt-overlay__heading').getBoundingClientRect()
      const tools = panel.querySelector('.zt-overlay__tools').getBoundingClientRect()
      const buttons = [...panel.querySelectorAll('footer button')].map(button => button.getBoundingClientRect())
      return {
        headingFits: heading.top >= header.top && heading.bottom <= header.bottom && heading.right <= tools.left,
        buttonsFit: buttons.every(button => button.top >= footer.top && button.bottom <= footer.bottom && button.left >= footer.left && button.right <= footer.right),
        buttonsSeparate: buttons[0].right < buttons[1].left,
        bodyHeight: panel.querySelector('.zt-overlay__body').clientHeight,
        noHorizontalScroll: panel.scrollWidth === panel.clientWidth
      }
    })
    expect(layout).toMatchObject({ headingFits: true, buttonsFit: true, buttonsSeparate: true, noHorizontalScroll: true })
    expect(layout.bodyHeight).toBeGreaterThan(200)
    await page.evaluate(() => window.overlay.setConfirmLoading(true))
    await expect(page.getByRole('button', { name: '正在处理' })).toBeDisabled()
    await expect(page.locator('.zt-overlay__footer')).toHaveCSS('height', '54px')
  })
}

test('dialog rebounds visibly and settles over 560ms', async ({ page }) => {
  const motion = await page.evaluate(async () => {
    window.overlay = window.api.ZtDialog.open({ title: '展开动画', content: '内容', autoFocus: false })
    await new Promise(resolve => requestAnimationFrame(resolve))
    const panel = document.querySelector('.zt-dialog__panel')
    const animation = panel.getAnimations().find(animation => animation.animationName === 'zt-panel-enter')
    if (!animation) return { animated: false }
    await animation.ready
    animation.pause()
    const duration = animation.effect.getTiming().duration
    const sample = time => {
      animation.currentTime = time
      const matrix = new DOMMatrixReadOnly(getComputedStyle(panel).transform)
      return { x: matrix.a, y: matrix.d }
    }
    const result = { animated: true, duration, start: sample(0), middle: sample(duration / 2), end: sample(duration) }
    animation.finish()
    return result
  })
  expect(motion.animated).toBe(true)
  expect(motion.duration).toBe(560)
  expect(motion.start.x).toBeLessThanOrEqual(0.95)
  expect(motion.start.y).toBeLessThanOrEqual(0.9)
  expect(motion.middle.y).toBeGreaterThan(motion.start.y)
  expect(motion.middle.y).toBeLessThan(1)
  expect(motion.end).toEqual({ x: 1, y: 1 })
})

test('header icons draw on entry and fullscreen icons transition without replacement', async ({ page }) => {
  await page.evaluate(() => {
    window.overlay = window.api.ZtDialog.open({ title: '图标动画', showZoom: true })
  })
  await expect(page.locator('.zt-dialog')).toHaveClass(/zt-overlay--visible/)
  const drawing = await page.locator('.zt-dialog__header').evaluate(header => {
    return [...header.querySelectorAll('.zt-icon path')].map(path => {
      const animation = path.getAnimations()[0]
      if (!animation) return false
      animation.pause()
      animation.currentTime = 0
      const start = parseFloat(getComputedStyle(path).strokeDashoffset)
      animation.finish()
      return start > 0 && parseFloat(getComputedStyle(path).strokeDashoffset) === 0
    })
  })
  expect(drawing.length).toBe(3)
  expect(drawing.every(Boolean)).toBe(true)
  await expect(page.locator('.zt-dialog__panel')).toHaveCSS('transform', 'none')
  await page.evaluate(() => { window.originalZoomIcons = [...document.querySelectorAll('.zt-overlay__zoom svg')] })
  await page.getByRole('button', { name: '全屏弹窗', exact: true }).click()
  const restore = page.getByRole('button', { name: '还原弹窗', exact: true })
  await expect(restore).toHaveAttribute('title', '还原弹窗')
  await expect(restore.locator('.zt-icon--maximize')).toHaveCSS('opacity', '0')
  await expect(restore.locator('.zt-icon--minimize')).toHaveCSS('opacity', '1')
  expect(await restore.locator('svg').first().evaluate(svg => getComputedStyle(svg).transitionProperty)).toContain('opacity')
  await restore.click()
  await expect(page.locator('.zt-overlay__zoom .zt-icon--maximize')).toHaveCSS('opacity', '1')
  expect(await page.evaluate(() => window.originalZoomIcons.every(icon => icon.isConnected))).toBe(true)
})

test('close icon rotates on hover and the tool responds to a press', async ({ page }) => {
  await page.evaluate(() => {
    window.overlay = window.api.ZtDialog.open({ title: '按钮动效', beforeClose: () => false })
  })
  const close = page.getByRole('button', { name: '关闭按钮动效', exact: true })
  await expect(close).toHaveAttribute('title', '关闭按钮动效')
  await close.hover()
  await expect.poll(() => close.locator('svg').evaluate(svg => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(svg).transform)
    return matrix.b
  })).toBeGreaterThan(1)
  await page.mouse.down()
  await expect.poll(() => close.evaluate(button => new DOMMatrixReadOnly(getComputedStyle(button).transform).a)).toBeLessThan(0.95)
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toBeVisible()
})

for (const service of ['ZtDialog', 'ZtDrawer']) {
  test(`${service} close icons turn red on hover and restore on mouseout`, async ({ page }) => {
    await page.evaluate(service => {
      window.overlay = window.api[service].open({ title: '关闭图标颜色' })
    }, service)
    const close = page.getByRole('button', { name: '关闭关闭图标颜色', exact: true })
    const original = await close.evaluate(button => getComputedStyle(button).color)
    await close.hover()
    await expect(close.locator('svg')).toHaveCSS('stroke', 'rgb(189, 63, 59)')
    await page.mouse.move(0, 0)
    await expect(close).toHaveCSS('color', original)
    await page.evaluate(() => window.overlay.setConfirmLoading(true))
    await close.hover()
    await expect(close).toBeDisabled()
    await expect(close).toHaveCSS('color', original)
  })
}

test('child icon transitions cannot prematurely remove a closing dialog', async ({ page }) => {
  await page.evaluate(() => {
    window.overlay = window.api.ZtDialog.open({ title: '关闭时序', showZoom: true })
  })
  await expect(page.locator('.zt-dialog__panel')).toHaveCSS('transform', 'none')
  const connected = await page.evaluate(async () => {
    const layer = document.querySelector('.zt-dialog')
    await window.overlay.close()
    layer.querySelector('.zt-icon').dispatchEvent(new TransitionEvent('transitionend', { bubbles: true, propertyName: 'transform' }))
    return layer.isConnected
  })
  expect(connected).toBe(true)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('reduced motion disables expansion, icon drawing and tool transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => { window.overlay = window.api.ZtDialog.open({ title: '静态弹窗', showZoom: true }) })
  await expect(page.locator('.zt-dialog')).toHaveClass(/zt-overlay--visible/)
  await expect(page.locator('.zt-dialog__panel')).toHaveCSS('transform', 'none')
  await page.getByRole('button', { name: '关闭静态弹窗' }).hover()
  await expect(page.locator('.zt-overlay__close svg')).toHaveCSS('transform', 'none')
  await page.getByRole('button', { name: '全屏弹窗', exact: true }).click()
  await expect(page.locator('.zt-overlay__zoom .zt-icon--minimize')).toHaveCSS('opacity', '1')
  expect(await page.locator('.zt-dialog__header').evaluate(header => [...header.querySelectorAll('.zt-icon, .zt-icon path')].every(element => element.getAnimations().length === 0))).toBe(true)
})

test('hidden dialog bars take no space and drawer bars use the shared heights', async ({ page }) => {
  await page.evaluate(() => {
    window.overlay = window.api.ZtDialog.open({ title: '无标题栏', showHeader: false, showFooter: false, height: 300 })
  })
  await expect(page.locator('.zt-dialog__header')).toBeHidden()
  await expect(page.locator('.zt-dialog__footer')).toBeHidden()
  expect(await page.locator('.zt-dialog__body').evaluate(body => body.clientHeight)).toBe(298)
  await page.evaluate(async () => { await window.overlay.close(); await window.overlay.closed })
  await page.evaluate(() => { window.api.ZtDrawer.open({ title: '抽屉', showFooter: true }) })
  await expect(page.locator('.zt-drawer__header')).toHaveCSS('height', '66px')
  await expect(page.locator('.zt-drawer__footer')).toHaveCSS('height', '54px')
})
