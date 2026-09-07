import { expect, test } from '@playwright/test'

test('demo exposes all six APIs as working controls without console errors', async ({ page }) => {
  const errors = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/demo/')
  await expect(page.getByRole('heading', { name: 'ZT Alert 交互台' })).toBeVisible()

  await page.getByRole('button', { name: '成功消息' }).click()
  await expect(page.locator('.zt-message-stack')).toContainText('报表保存成功')

  await page.getByRole('button', { name: '打开 Dialog' }).click()
  await expect(page.getByRole('dialog')).toContainText('编辑报表')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: '打开 Drawer' }).click()
  await expect(page.getByRole('dialog')).toContainText('筛选条件')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: '默认加载', exact: true }).click()
  await expect(page.locator('.zt-loading').getByRole('status')).toHaveText('正在读取报表…')
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)

  expect(errors).toEqual([])
})

test('Loading demo shows custom icons and live text updates', async ({ page }) => {
  await page.goto('/demo/')
  await page.getByRole('button', { name: '图标与文字', exact: true }).click()
  await expect(page.locator('.zt-loading__icon img')).toHaveAttribute('src', '/demo/assets/zt-mark.svg')
  await expect(page.locator('.zt-loading').getByRole('status')).toHaveText('正在同步库存数据…')
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
  await page.getByRole('button', { name: '更新加载内容', exact: true }).click()
  await expect(page.locator('.zt-loading').getByRole('status')).toHaveText('正在读取数据…')
  await expect(page.locator('.zt-loading').getByRole('status')).toHaveText('正在生成报表…')
  await expect(page.locator('.zt-loading__icon img')).toHaveCount(1)
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
})

test('Loading demo previews light, dark and changing mask contrast', async ({ page }) => {
  await page.goto('/demo/')
  await page.getByRole('button', { name: '深色遮罩', exact: true }).click()
  await expect(page.locator('.zt-loading__text')).toHaveCSS('color', 'rgb(248, 250, 252)')
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
  await page.getByRole('button', { name: '浅色遮罩', exact: true }).click()
  await expect(page.locator('.zt-loading__text')).toHaveCSS('color', 'rgb(51, 65, 85)')
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
  await page.getByRole('button', { name: '切换遮罩', exact: true }).click()
  await expect(page.locator('.zt-loading__text')).toHaveCSS('color', 'rgb(51, 65, 85)')
  await expect(page.locator('.zt-loading__text')).toHaveCSS('color', 'rgb(248, 250, 252)')
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
})
