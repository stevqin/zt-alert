import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
})

test('render controls close with a value and run cleanup before closed resolves', async ({ page }) => {
  const result = page.evaluate(async () => {
    window.cleanupRan = false
    const dialog = window.api.ZtDialog.open({
      title: '编辑资料',
      render(container, controls) {
        const button = document.createElement('button')
        button.textContent = '完成'
        button.addEventListener('click', () => controls.close('api', 42))
        container.append(button)
        return () => { window.cleanupRan = true }
      }
    })
    const closed = await dialog.closed
    return { closed, cleanupRan: window.cleanupRan }
  })

  await page.getByRole('button', { name: '完成' }).click()
  expect(await result).toEqual({ closed: { reason: 'api', value: 42 }, cleanupRan: true })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('async beforeClose ignores duplicates and a false result keeps the dialog open', async ({ page }) => {
  await page.evaluate(() => {
    window.guardCalls = 0
    window.guardResolve = null
    window.overlay = window.api.ZtDialog.open({
      title: '保护中的表单',
      beforeClose: () => {
        window.guardCalls += 1
        return new Promise(resolve => { window.guardResolve = resolve })
      }
    })
  })

  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => window.guardCalls)).toBe(1)
  await page.evaluate(() => window.guardResolve(false))
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.evaluate(() => {
    window.overlay.update({ beforeClose: () => true })
    window.overlay.close('api')
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('confirm callback owns persistence and explicitly closes after success', async ({ page }) => {
  const result = page.evaluate(async () => {
    const dialog = window.api.ZtDialog.open({
      title: '保存报表',
      showFooter: true,
      confirmText: '保存',
      async onConfirm(controls) {
        controls.setConfirmLoading(true)
        await new Promise(resolve => { window.finishSave = resolve })
        controls.setConfirmLoading(false)
        controls.close('api', 'saved')
      }
    })
    return dialog.closed
  })

  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('button', { name: /正在处理/ })).toBeDisabled()
  await page.evaluate(() => window.finishSave())
  expect(await result).toEqual({ reason: 'api', value: 'saved' })
})

test('nested overlays assign Escape to the top layer and keep body locked until all close', async ({ page }) => {
  await page.locator('#origin').focus()
  await page.evaluate(() => {
    window.parentOverlay = window.api.ZtDrawer.open({
      title: '筛选条件',
      render(container) {
        const input = document.createElement('input')
        input.placeholder = '父级输入'
        container.append(input)
      }
    })
    window.childOverlay = window.api.ZtDialog.open({ title: '确认筛选' })
  })

  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await expect(page.locator('.zt-overlay__panel')).toHaveCount(2)
  await expect(page.getByRole('dialog')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.getByRole('dialog')).toContainText('筛选条件')
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#origin')).toBeFocused()
  expect(await page.locator('body').evaluate(element => element.style.overflow)).toBe('')
})

test('loading blocks Escape until loading is cleared', async ({ page }) => {
  await page.evaluate(() => {
    window.overlay = window.api.ZtDrawer.open({ title: '正在加载', loading: true })
  })

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.evaluate(() => {
    window.overlay.setLoading(false)
  })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
