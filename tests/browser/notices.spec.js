import { expect, test } from '@playwright/test'

async function ready(page) {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
}

test.beforeEach(async ({ page }) => {
  await ready(page)
})

test('message shortcuts create a top-centered status notice', async ({ page }) => {
  const id = await page.evaluate(() => window.api.ZtMessage.success('保存成功'))

  expect(id).toBeTruthy()
  const notice = page.locator('.zt-message-stack .zt-notice')
  await expect(notice).toHaveCount(1)
  await expect(notice).toHaveClass(/zt-notice--success/)
  await expect(notice).toContainText('保存成功')
})

test('reusing a message id updates the same DOM item', async ({ page }) => {
  await page.evaluate(() => {
    window.api.ZtMessage.success({ id: 'save', content: '保存中', duration: 0 })
    window.api.ZtMessage.success({ id: 'save', content: '保存成功', duration: 0 })
  })

  const notices = page.locator('.zt-message-stack .zt-notice')
  await expect(notices).toHaveCount(1)
  await expect(notices).toContainText('保存成功')
  await expect(notices).not.toContainText('保存中')
})

test('message duration removes the notice and duration zero keeps it open', async ({ page }) => {
  await page.evaluate(() => {
    window.api.ZtMessage.info({ id: 'timed', content: '即将关闭', duration: 80 })
    window.api.ZtMessage.info({ id: 'held', content: '保持显示', duration: 0 })
  })

  await expect(page.locator('[data-zt-id="timed"]')).toHaveCount(0, { timeout: 1000 })
  await expect(page.locator('[data-zt-id="held"]')).toHaveCount(1)
})

test('message and notification close and clear independently', async ({ page }) => {
  await page.evaluate(() => {
    window.api.ZtMessage.warning({ id: 'message-a', content: '消息 A', duration: 0 })
    window.api.ZtMessage.error({ id: 'message-b', content: '消息 B', duration: 0 })
    window.api.ZtNotification.warning({ id: 'notice-a', title: '库存提醒', content: '通知 A', duration: 0 })
    window.api.ZtMessage.close('message-a')
  })

  await expect(page.locator('.zt-message-stack .zt-notice')).toHaveCount(1)
  await expect(page.locator('.zt-notification-stack .zt-notice')).toHaveCount(1)

  await page.evaluate(() => window.api.ZtMessage.clear())
  await expect(page.locator('.zt-message-stack .zt-notice')).toHaveCount(0)
  await expect(page.locator('.zt-notification-stack .zt-notice')).toContainText('库存提醒')

  await page.evaluate(() => window.api.ZtNotification.clear())
  await expect(page.locator('.zt-notification-stack .zt-notice')).toHaveCount(0)
})

test('notification stays 330px wide and fits narrower screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => {
    window.api.ZtNotification.warning({
      title: '库存提醒',
      content: '部分商品已进入长尾库存范围，请检查库存明细并确认后续处理计划。',
      duration: 0
    })
  })
  const notice = page.locator('.zt-notification-stack .zt-notice')
  for (const [viewportWidth, noticeWidth] of [[1280, 330], [390, 330], [320, 296]]) {
    await page.setViewportSize({ width: viewportWidth, height: 844 })
    await expect(notice).toHaveCSS('width', `${noticeWidth}px`)
    const bounds = await notice.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(12)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewportWidth - 12)
    expect(await notice.locator('.zt-notice__content').evaluate(content => content.scrollWidth <= content.clientWidth)).toBe(true)
  }
})
