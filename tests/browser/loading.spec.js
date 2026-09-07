import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('Loading exposes its command API', async ({ page }) => {
  expect(await page.evaluate(() => typeof window.api.ZtLoading?.open)).toBe('function')
  expect(await page.evaluate(() => typeof window.api.ZtLoading?.close)).toBe('function')
})

test('Loading displays its icon and text without a background panel', async ({ page }) => {
  await page.evaluate(() => { window.loading = window.api.ZtLoading.open('正在加载') })
  const loading = page.locator('.zt-loading')
  await expect(loading).toBeVisible()
  await expect(loading).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(loading).toHaveCSS('box-shadow', 'none')
  for (const edge of ['top', 'right', 'bottom', 'left']) {
    await expect(loading).toHaveCSS(`border-${edge}-width`, '0px')
  }
  await expect(page.locator('.zt-loading__spinner')).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('正在加载')
})

test('Loading works without the newer replaceChildren DOM API', async ({ page }) => {
  await page.evaluate(() => {
    Element.prototype.replaceChildren = undefined
    window.loading = window.api.ZtLoading.open({ text: '正在加载', icon: '/demo/assets/zt-mark.svg' })
  })
  await expect(page.locator('.zt-loading__icon img')).toHaveCount(1)
  await page.evaluate(() => window.loading.update({ icon: null, text: '正在完成' }))
  await expect(page.locator('.zt-loading__icon img')).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('正在完成')
  await page.evaluate(() => window.loading.close())
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
})

test('default Loading blocks interaction until explicitly closed and restores focus', async ({ page }) => {
  await page.locator('#origin').focus()
  await page.evaluate(() => { window.loading = window.api.ZtLoading.open() })
  const loading = page.locator('.zt-loading')
  await expect(loading).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('正在加载…')
  await expect(page.locator('.zt-loading__spinner')).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await expect(loading).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(loading).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(loading).toBeFocused()
  await page.keyboard.press('Escape')
  await page.locator('.zt-loading-layer').click({ position: { x: 4, y: 4 } })
  await expect(loading).toBeVisible()
  await page.evaluate(() => window.loading.close())
  await expect(loading).toHaveCount(0)
  await expect(page.locator('#origin')).toBeFocused()
  expect(await page.locator('body').evaluate(body => body.style.overflow)).toBe('')
})

test('Loading renders custom image icons and treats text as plain text', async ({ page }) => {
  await page.evaluate(() => {
    window.loading = window.api.ZtLoading.open({ icon: '/demo/assets/zt-mark.svg', text: '<strong>正在读取数据</strong>' })
  })
  await expect(page.getByRole('status')).toHaveText('<strong>正在读取数据</strong>')
  await expect(page.locator('.zt-loading strong')).toHaveCount(0)
  const icon = page.locator('.zt-loading__icon img')
  await expect(icon).toHaveAttribute('src', '/demo/assets/zt-mark.svg')
  await expect.poll(() => icon.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
  await expect(page.locator('.zt-loading__spinner')).toBeVisible()
})

test('updates and repeated open calls reuse the active Loading without restarting its spinner', async ({ page }) => {
  await page.evaluate(() => { window.loading = window.api.ZtLoading.open('开始同步') })
  await expect(page.locator('.zt-loading-layer')).toHaveClass(/zt-loading-layer--visible/)
  const result = await page.evaluate(() => {
    const layer = document.querySelector('.zt-loading-layer')
    const spinner = document.querySelector('.zt-loading__spinner')
    window.loading.update({ text: '正在读取数据', icon: '/demo/assets/zt-mark.svg' })
    const sameInstance = window.api.ZtLoading.open({ text: '正在生成报表' }) === window.loading
    return { sameInstance, sameLayer: document.querySelector('.zt-loading-layer') === layer, sameSpinner: document.querySelector('.zt-loading__spinner') === spinner }
  })
  expect(result).toEqual({ sameInstance: true, sameLayer: true, sameSpinner: true })
  await expect(page.locator('.zt-loading-layer')).toHaveCount(1)
  await expect(page.getByRole('status')).toHaveText('正在生成报表')
  await expect(page.locator('.zt-loading__icon img')).toHaveCount(1)
  await page.evaluate(() => window.loading.update({ icon: null }))
  await expect(page.locator('.zt-loading__icon img')).toHaveCount(0)
  await page.evaluate(() => window.api.ZtLoading.close())
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
})

test('custom DOM icons are cloned and never moved out of their original parent', async ({ page }) => {
  const preserved = await page.evaluate(() => {
    const icon = document.createElement('img')
    icon.src = '/demo/assets/zt-mark.svg'
    document.querySelector('#fixture').append(icon)
    window.originalIcon = icon
    window.loading = window.api.ZtLoading.open({ text: '加载图标', icon })
    return icon.parentElement.id === 'fixture' && document.querySelector('.zt-loading__icon img') !== icon
  })
  expect(preserved).toBe(true)
  await page.evaluate(() => window.loading.close())
  expect(await page.evaluate(() => window.originalIcon.parentElement.id)).toBe('fixture')
})

test('Loading over a Dialog owns Escape and keeps the parent scroll lock after closing', async ({ page }) => {
  await page.evaluate(() => {
    window.dialog = window.api.ZtDialog.open({ title: '编辑报表', html: '<input autofocus value="未保存内容">' })
  })
  await expect(page.locator('.zt-dialog input')).toBeFocused()
  await page.evaluate(() => { window.loading = window.api.ZtLoading.open('正在保存报表') })
  await expect(page.locator('.zt-dialog')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('.zt-loading')).toBeVisible()
  await expect(page.locator('.zt-dialog')).toHaveCount(1)
  await page.evaluate(() => window.loading.close())
  await expect(page.locator('.zt-dialog')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('.zt-dialog input')).toBeFocused()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await page.evaluate(async () => { await window.dialog.close(); await window.dialog.closed })
  expect(await page.locator('body').evaluate(body => body.style.overflow)).toBe('')
})

test('a newer MessageBox can appear above Loading and return control to it', async ({ page }) => {
  await page.evaluate(() => {
    window.loading = window.api.ZtLoading.open('正在同步')
    window.api.ZtMessageBox.alert('同步提示')
  })
  await expect(page.locator('.zt-loading-layer')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await expect(page.locator('.zt-box-layer')).toHaveCount(0)
  await expect(page.locator('.zt-loading-layer')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('.zt-loading')).toBeFocused()
  await page.evaluate(() => window.api.ZtLoading.close())
})

test('closing before entry and reopening during exit cannot remove the next Loading', async ({ page }) => {
  await page.evaluate(async () => {
    const first = window.api.ZtLoading.open('立即关闭')
    await first.close()
    await first.closed
  })
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
  await page.locator('#origin').focus()
  await page.evaluate(() => { window.oldLoading = window.api.ZtLoading.open('旧任务') })
  await expect(page.locator('.zt-loading-layer')).toHaveCSS('opacity', '1')
  await expect(page.locator('.zt-loading')).toBeFocused()
  await page.evaluate(async () => {
    const close = window.oldLoading.close()
    window.loading = window.api.ZtLoading.open('新任务')
    window.oldLoading.update({ text: '过期更新' })
    await close
    await window.oldLoading.close()
  })
  await expect(page.locator('.zt-loading-layer')).toHaveCount(1)
  await expect(page.getByRole('status')).toHaveText('新任务')
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await page.evaluate(() => window.api.ZtLoading.close())
  expect(await page.locator('body').evaluate(body => body.style.overflow)).toBe('')
  await expect(page.locator('#origin')).toBeFocused()
})

test('reduced motion shows a static indicator and closes without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => { window.loading = window.api.ZtLoading.open('正在加载') })
  await expect(page.locator('.zt-loading-layer')).toHaveCSS('opacity', '1')
  await expect(page.locator('.zt-loading')).toHaveCSS('transform', 'none')
  await expect(page.locator('.zt-loading__spinner')).toHaveCSS('animation-name', 'none')
  await page.evaluate(() => window.loading.close())
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
})

test('long Loading text fits a narrow viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.evaluate(() => { window.loading = window.api.ZtLoading.open({ text: '正在同步全部报表数据，请稍候。'.repeat(15) }) })
  await expect(page.locator('.zt-loading')).toHaveCSS('transform', 'none')
  const layout = await page.locator('.zt-loading').evaluate(panel => {
    const bounds = panel.getBoundingClientRect()
    return { width: bounds.width, left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, overflow: panel.scrollWidth > panel.clientWidth }
  })
  expect(layout.width).toBeLessThanOrEqual(280)
  expect(layout.left).toBeGreaterThanOrEqual(20)
  expect(layout.right).toBeLessThanOrEqual(300)
  expect(layout.top).toBeGreaterThanOrEqual(20)
  expect(layout.bottom).toBeLessThanOrEqual(620)
  expect(layout.overflow).toBe(false)
})
