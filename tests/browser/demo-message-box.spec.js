import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/')
})

test('MessageBox demo exposes every built-in status, no icon, and a custom image', async ({ page }) => {
  for (const [action, status] of [['box-alert', 'success'], ['box-warning', 'warning'], ['box-error', 'error'], ['box-info', 'info'], ['box-no-icon', null], ['box-custom-icon', 'custom']]) {
    await page.locator(`[data-action="${action}"]`).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    if (status) await expect(page.locator(`.zt-box__icon--${status}`)).toHaveCount(1)
    else await expect(page.locator('.zt-box__icon')).toHaveCount(0)
    if (status === 'custom') {
      await expect.poll(() => page.locator('.zt-box__icon img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0)
    }
    await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('#box-result')).toHaveText('true')
  }
})

test('MessageBox demo applies its animation and dismissal switches', async ({ page }) => {
  await page.getByLabel('回弹动画').uncheck()
  await page.getByLabel('点击遮罩关闭').uncheck()
  await page.getByLabel('Esc 关闭').uncheck()
  await page.locator('[data-action="box-info"]').click()
  await expect(page.locator('.zt-box')).not.toHaveClass(/zt-box--shake/)
  await page.keyboard.press('Escape')
  await page.locator('.zt-box-layer').click({ position: { x: 5, y: 5 } })
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByLabel('回弹动画').check()
  await page.getByLabel('Esc 关闭').check()
  await page.locator('[data-action="box-alert"]').click()
  await expect(page.locator('.zt-box')).toHaveClass(/zt-box--shake/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#box-result')).toHaveText('null')
})

test('MessageBox demo shows confirm, input, custom content, and button results', async ({ page }) => {
  await page.locator('[data-action="box-normal-confirm"]').click()
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.locator('#box-result')).toHaveText('false')

  await page.locator('[data-action="box-prompt"]').click()
  await page.getByPlaceholder('数据集名称').fill('库存日报')
  await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click()
  await expect(page.locator('#box-result')).toHaveText('"库存日报"')

  await page.locator('[data-action="box-content"]').click()
  await expect(page.getByRole('dialog')).toContainText('销售数据集')
  await expect(page.getByRole('dialog').locator('dl')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click()

  await page.locator('[data-action="box-buttons"]').click()
  await expect(page.getByRole('dialog').getByRole('button')).toHaveCount(3)
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  await expect(page.locator('#box-result')).toHaveText('"draft"')

  await page.locator('[data-action="box-custom-button"]').click()
  await page.getByRole('button', { name: '查看报表', exact: true }).click()
  await expect(page.locator('#box-result')).toHaveText('"open-report"')

  await page.locator('[data-action="box-long-text"]').click()
  await expect(page.getByRole('dialog')).toContainText('权限范围')
  await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('MessageBox demo completes loading and timed examples', async ({ page }) => {
  await page.locator('[data-action="box-async"]').click()
  await page.getByRole('dialog').getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.locator('.zt-box')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('dialog').getByRole('button', { name: '刷新', exact: true })).toBeDisabled()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#box-result')).toContainText('refreshed')

  await page.locator('[data-action="box-timer"]').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#box-result')).toHaveText('null')

  await page.locator('[data-action="box-no-buttons"]').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('MessageBox demo can walk through all status animations or stop early', async ({ page }) => {
  await page.locator('[data-action="box-sequence"]').click()
  for (const status of ['success', 'warning', 'error', 'info']) {
    await expect(page.locator(`.zt-box__icon--${status}`)).toHaveCount(1)
    await page.getByRole('dialog').getByRole('button', { name: status === 'info' ? '完成' : '下一个', exact: true }).click()
  }
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#box-result')).toContainText('已查看全部状态图标')

  await page.locator('[data-action="box-sequence"]').click()
  await page.getByRole('button', { name: '结束预览', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#box-result')).toHaveText('null')
})
