import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'parallel' })

for (const variant of ['message', 'notification']) {
  for (const width of [1280, 360]) {
    test(`${variant} demo covers titles and persistent long content at ${width}px`, async ({ page }) => {
      test.setTimeout(30_000)
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/demo/')
      const section = page.locator(`[aria-labelledby="${variant}-heading"]`)
      const cases = [
        { label: '无标题短内容', title: false, long: false },
        { label: '有标题短内容', title: true, long: false },
        { label: '无标题长内容', title: false, long: true },
        { label: '有标题长内容', title: true, long: true }
      ]

      for (const example of cases) {
        const button = section.getByRole('button', { name: example.label, exact: true })
        await expect(button).toBeVisible({ timeout: 1000 })
        await button.click()
        const notice = page.locator(`.zt-${variant}-stack .zt-notice`)
        await expect(notice).toHaveCount(1)
        await expect(notice.locator('.zt-notice__title')).toHaveCount(example.title ? 1 : 0)
        await expect(notice.locator('.zt-notice__content')).not.toBeEmpty()
        if (example.long) {
          const layout = await notice.locator('.zt-notice__content').evaluate(element => ({
            height: element.getBoundingClientRect().height,
            lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
            fits: element.scrollWidth <= element.clientWidth
          }))
          expect(layout.height).toBeGreaterThan(layout.lineHeight * 2)
          expect(layout.fits).toBe(true)
          // Both services' normal auto-dismiss deadlines have elapsed.
          await page.waitForTimeout(5600)
          await expect(notice).toBeVisible()
        }
        await notice.getByRole('button', { name: '关闭', exact: true }).click()
        await expect(notice).toHaveCount(0)
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }
}
