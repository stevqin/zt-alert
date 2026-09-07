import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
})

test('content is text by default while html is explicitly rendered', async ({ page }) => {
  await page.evaluate(() => {
    window.overlay = window.api.ZtDialog.open({
      title: '安全内容',
      content: '<strong>普通文本</strong>'
    })
  })

  await expect(page.locator('.zt-dialog__body')).toHaveText('<strong>普通文本</strong>')
  await expect(page.locator('.zt-dialog__body strong')).toHaveCount(0)
  await page.evaluate(() => window.overlay.close())
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.evaluate(() => {
    window.overlay = window.api.ZtDialog.open({
      title: '可信内容',
      html: '<strong>强调内容</strong>'
    })
  })
  await expect(page.locator('.zt-dialog__body strong')).toHaveText('强调内容')
})

test('a supplied DOM node returns to its original position after close', async ({ page }) => {
  await page.evaluate(() => {
    const fixture = document.querySelector('#fixture')
    fixture.innerHTML = '<span id="before">前</span><button id="movable">内容节点</button><span id="after">后</span>'
    window.overlay = window.api.ZtDrawer.open({
      title: '移动节点',
      content: document.querySelector('#movable')
    })
  })

  await expect(page.locator('.zt-drawer__body #movable')).toHaveCount(1)
  await page.evaluate(() => window.overlay.close())
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.locator('#fixture').evaluate(element => [...element.children].map(child => child.id))).toEqual([
    'before', 'movable', 'after'
  ])
})

test('dialog updates presentation and toggles fullscreen without remounting content', async ({ page }) => {
  await page.evaluate(() => {
    window.renderCount = 0
    window.overlay = window.api.ZtDialog.open({
      title: '初始标题',
      width: 500,
      fullscreenBelow: 0,
      showZoom: true,
      render(container) {
        window.renderCount += 1
        container.innerHTML = '<input value="保留内容">'
      }
    })
    window.overlay.update({ title: '更新标题', width: 680, showFooter: true })
  })

  await expect(page.getByRole('dialog')).toContainText('更新标题')
  await expect(page.locator('.zt-dialog__panel')).toHaveCSS('width', '680px')
  await expect(page.locator('.zt-overlay__footer')).toBeVisible()
  expect(await page.evaluate(() => window.renderCount)).toBe(1)

  await page.evaluate(() => window.overlay.toggleFullscreen(true))
  await expect(page.locator('.zt-dialog')).toHaveClass(/zt-dialog--fullscreen/)
  await page.evaluate(() => window.overlay.toggleFullscreen(false))
  await expect(page.locator('.zt-dialog')).not.toHaveClass(/zt-dialog--fullscreen/)
})

test('dialog and drawer become fullscreen-width below their configured breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    window.dialog = window.api.ZtDialog.open({ title: '移动弹窗', width: 720 })
  })
  await expect(page.locator('.zt-dialog')).toHaveClass(/zt-dialog--fullscreen/)
  await page.evaluate(() => window.dialog.close())
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.evaluate(() => {
    window.drawer = window.api.ZtDrawer.open({ title: '移动抽屉', width: 640 })
  })
  await expect(page.locator('.zt-drawer')).toHaveClass(/zt-drawer--narrow/)
  await expect(page.locator('.zt-drawer__panel')).toHaveCSS('width', '390px')
})

test('mask close requires an eligible mask-origin click', async ({ page }) => {
  await page.evaluate(() => {
    window.overlay = window.api.ZtDialog.open({ title: '点击遮罩', maskClosable: true })
  })
  await page.locator('.zt-dialog').click({ position: { x: 4, y: 4 } })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('close guard errors are reported and leave the overlay open', async ({ page }) => {
  await page.evaluate(() => {
    window.closeError = ''
    window.overlay = window.api.ZtDrawer.open({
      title: '关闭保护',
      beforeClose() { throw new Error('需要先保存') },
      onCloseError(error) { window.closeError = error.message }
    })
  })

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.evaluate(() => window.closeError)).toBe('需要先保存')
})

test('focus trap wraps from the last control to the first control', async ({ page }) => {
  await page.evaluate(() => {
    window.overlay = window.api.ZtDialog.open({
      title: '焦点循环',
      showClose: false,
      render(container) {
        const first = document.createElement('button')
        first.textContent = '第一项'
        first.autofocus = true
        const last = document.createElement('button')
        last.textContent = '最后一项'
        container.append(first, last)
      }
    })
  })

  await expect(page.getByRole('button', { name: '第一项' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '最后一项' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '第一项' })).toBeFocused()
})

test('updating content mode cleans the old renderer and mounts the new text', async ({ page }) => {
  await page.evaluate(() => {
    window.cleanupCount = 0
    window.overlay = window.api.ZtDialog.open({
      title: '内容切换',
      render(container) {
        container.textContent = '旧内容'
        return () => { window.cleanupCount += 1 }
      }
    })
    window.overlay.update({ content: '新内容' })
  })

  await expect(page.locator('.zt-dialog__body')).toHaveText('新内容')
  expect(await page.evaluate(() => window.cleanupCount)).toBe(1)
})
