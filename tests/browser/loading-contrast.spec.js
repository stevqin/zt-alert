import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/test-page.html')
  await page.waitForFunction(() => Boolean(window.api))
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

for (const { name, mask, background, color } of [
  { name: 'dark mask', mask: '#141820', background: '#fff', color: 'rgb(248, 250, 252)' },
  { name: 'light mask', mask: '#f1f5f9', background: '#111', color: 'rgb(51, 65, 85)' },
  { name: 'translucent dark mask on white', mask: 'rgba(20, 24, 32, 0.2)', background: '#fff', color: 'rgb(51, 65, 85)' },
  { name: 'translucent dark mask on dark', mask: 'rgba(20, 24, 32, 0.2)', background: '#121212', color: 'rgb(248, 250, 252)' },
  { name: 'transparent mask on dark', mask: 'transparent', background: '#121212', color: 'rgb(248, 250, 252)' },
  { name: 'HSL mask', mask: 'hsl(210, 50%, 92%)', background: '#fff', color: 'rgb(51, 65, 85)' }
]) {
  test(`Loading chooses readable text for ${name}`, async ({ page }) => {
    await page.evaluate(({ mask, background }) => {
      document.body.style.backgroundColor = background
      window.loading = window.api.ZtLoading.open({ text: '正在加载', maskColor: mask })
    }, { mask, background })
    await expect(page.getByRole('status')).toHaveCSS('color', color)
  })
}

test('mask updates and repeated opens adapt text without replacing the icon', async ({ page }) => {
  await page.evaluate(() => {
    window.loading = window.api.ZtLoading.open({ text: '正在加载', maskColor: '#141820' })
    window.spinner = document.querySelector('.zt-loading__spinner')
  })
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(248, 250, 252)')
  await page.evaluate(() => window.loading.update({ maskColor: '#f1f5f9' }))
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(51, 65, 85)')
  const preserved = await page.evaluate(() => {
    const sameInstance = window.api.ZtLoading.open({ maskColor: '#141820' }) === window.loading
    return sameInstance && window.spinner === document.querySelector('.zt-loading__spinner')
  })
  expect(preserved).toBe(true)
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(248, 250, 252)')
  await page.evaluate(() => window.loading.update({ maskColor: null }))
  await expect(page.locator('.zt-loading-layer')).toHaveCSS('background-color', 'rgba(20, 24, 32, 0.2)')
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(51, 65, 85)')
})

test('CSS mask and page theme changes adapt an already open Loading', async ({ page }) => {
  await page.addStyleTag({ content: ':root.dark-page { background: #121212; }' })
  await page.evaluate(() => { window.loading = window.api.ZtLoading.open('正在加载') })
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(51, 65, 85)')
  await page.evaluate(() => document.documentElement.classList.add('dark-page'))
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(248, 250, 252)')
  await page.evaluate(() => document.documentElement.style.setProperty('--zt-loading-mask', '#f1f5f9'))
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(51, 65, 85)')
  await page.evaluate(() => { document.querySelector('.zt-loading-layer').style.backgroundColor = '#141820' })
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(248, 250, 252)')
  await page.evaluate(() => window.loading.close())
  await expect(page.locator('.zt-loading-layer')).toHaveCount(0)
  await page.evaluate(() => document.documentElement.classList.remove('dark-page'))
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
})

test('transparent page backgrounds respect the system dark canvas', async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.style.colorScheme = 'dark'
    window.loading = window.api.ZtLoading.open('正在加载')
  })
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(248, 250, 252)')
  await page.evaluate(() => { document.documentElement.style.colorScheme = 'light' })
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(51, 65, 85)')
})

test('text keeps adapting while page background colors transition', async ({ page }) => {
  await page.evaluate(() => {
    document.body.style.backgroundColor = '#fff'
    document.body.style.transition = 'background-color 1s linear'
    window.loading = window.api.ZtLoading.open({ text: '正在加载', maskColor: 'transparent' })
  })
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(51, 65, 85)')
  await page.evaluate(() => { document.body.style.backgroundColor = '#121212' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)')
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(248, 250, 252)')
  await page.evaluate(() => { document.body.style.backgroundColor = '#fff' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(51, 65, 85)')
})

test('currentColor masks do not change when adaptive text colors change', async ({ page }) => {
  const masks = await page.evaluate(async () => {
    window.loading = window.api.ZtLoading.open({ text: '正在加载', maskColor: 'currentColor' })
    const layer = document.querySelector('.zt-loading-layer')
    const samples = []
    for (let index = 0; index < 8; index++) {
      await new Promise(resolve => requestAnimationFrame(resolve))
      samples.push(getComputedStyle(layer).backgroundColor)
    }
    return samples
  })
  expect(new Set(masks).size).toBe(1)
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(248, 250, 252)')
})
