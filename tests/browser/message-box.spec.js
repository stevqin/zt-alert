import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
})

test('SweetAlert overload renders title, text, and status icon', async ({ page }) => {
  await page.evaluate(() => {
    window.boxPromise = window.api.ZtMessageBox('操作失败', '请稍后重试', 'error')
  })

  await expect(page.getByRole('dialog')).toContainText('操作失败')
  await expect(page.getByRole('dialog')).toContainText('请稍后重试')
  await expect(page.locator('.zt-box__icon--error')).toHaveCount(1)
})

test('opening locks body scroll and closing restores focus', async ({ page }) => {
  await page.locator('#origin').focus()
  await page.evaluate(() => {
    window.boxPromise = window.api.ZtMessageBox.alert('完成')
  })

  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await expect(page.getByRole('button', { name: '确定' })).toBeFocused()
  await page.getByRole('button', { name: '确定' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#origin')).toBeFocused()
  expect(await page.locator('body').evaluate(element => element.style.overflow)).toBe('')
})

test('confirm resolves true for confirm and false for cancel', async ({ page }) => {
  const confirmed = page.evaluate(() => window.api.ZtMessageBox.confirm('确认发布？'))
  await page.getByRole('button', { name: '确定' }).click()
  expect(await confirmed).toBe(true)

  const cancelled = page.evaluate(() => window.api.ZtMessageBox.confirm('再次确认？'))
  await page.getByRole('button', { name: '取消' }).click()
  expect(await cancelled).toBe(false)
})

test('prompt returns the entered string and null when cancelled', async ({ page }) => {
  const entered = page.evaluate(() => window.api.ZtMessageBox.prompt({
    title: '请输入名称',
    content: { element: 'input', attributes: { placeholder: '名称', maxlength: 30 } }
  }))
  await page.getByPlaceholder('名称').fill('月度报表')
  await page.getByRole('button', { name: '确定' }).click()
  expect(await entered).toBe('月度报表')

  const cancelled = page.evaluate(() => window.api.ZtMessageBox.prompt('输入编码'))
  await page.getByRole('button', { name: '取消' }).click()
  expect(await cancelled).toBeNull()
})

test('closeModal false resolves and leaves the box loading until explicitly closed', async ({ page }) => {
  const result = page.evaluate(() => window.api.ZtMessageBox({
    title: '开始查询？',
    buttons: {
      cancel: true,
      confirm: { text: '查询', value: 'query', closeModal: false }
    }
  }))
  await page.getByRole('button', { name: '查询' }).click()

  expect(await result).toBe('query')
  await expect(page.locator('.zt-box')).toHaveAttribute('aria-busy', 'true')
  expect(await page.evaluate(() => window.api.ZtMessageBox.getState().isOpen)).toBe(true)

  await page.evaluate(() => {
    window.api.ZtMessageBox.stopLoading()
    window.api.ZtMessageBox.close()
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('timer dismisses with a null value', async ({ page }) => {
  const result = await page.evaluate(() => window.api.ZtMessageBox({
    title: '自动关闭',
    timer: 60,
    button: false
  }))

  expect(result).toBeNull()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('button object shorthand creates one confirm action with its configured value', async ({ page }) => {
  const result = page.evaluate(() => window.api.ZtMessageBox({
    title: '操作完成',
    button: { text: '知道了', value: 'acknowledged' }
  }))

  await page.getByRole('button', { name: '知道了' }).click()
  expect(await result).toBe('acknowledged')
})

test('opening a new box immediately replaces and resolves the previous box', async ({ page }) => {
  await page.evaluate(() => {
    window.firstBox = window.api.ZtMessageBox({ title: '旧提示', button: '旧按钮' })
    window.secondBox = window.api.ZtMessageBox({ title: '新提示', button: '新按钮' })
  })

  await expect(page.locator('.zt-box')).toHaveCount(1)
  await expect(page.getByRole('dialog')).toContainText('新提示')
  expect(await page.evaluate(() => window.firstBox)).toBeNull()

  await page.getByRole('button', { name: '新按钮' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('MessageBox temporarily hides an underlying Dialog from the accessibility tree', async ({ page }) => {
  await page.evaluate(() => {
    window.dialog = window.api.ZtDialog.open({ title: '底层弹窗' })
    window.box = window.api.ZtMessageBox({ title: '顶层提示' })
  })

  await expect(page.locator('.zt-dialog')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.getByRole('dialog')).toContainText('顶层提示')

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toContainText('底层弹窗')
  await expect(page.locator('.zt-dialog')).toHaveAttribute('aria-hidden', 'false')
})
