import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('production without a backend explains setup and remains usable at narrow widths', async ({
  page,
}) => {
  const errors = []
  const apiRequests = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api'))
      apiRequests.push(request.url())
  })
  await page.goto('./')
  await expect(
    page.getByText('API not configured', { exact: true }),
  ).toBeVisible()
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Connect the API to load your inventory.')
  await expect(alert).not.toContainText('VITE_API_BASE_URL')
  await expect(alert).not.toContainText('Couldn’t load')
  await expect(
    page.getByRole('button', { name: 'Connection', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'StockRoom home' }),
  ).toContainText('StockRoom')
  const headerBox = await page.getByRole('banner').boundingBox()
  const alertBox = await alert.boundingBox()
  const dashboardBox = await page
    .getByRole('heading', { name: 'Dashboard', exact: true })
    .boundingBox()
  expect(alertBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)
  expect(alertBox.y + alertBox.height).toBeLessThanOrEqual(dashboardBox.y)
  await expect(page.getByTestId('total-products')).toHaveText('—')
  await expect(page.getByTestId('total-stock')).toHaveText('—')
  await expect(page.getByTestId('low-stock')).toHaveText('—')
  await expect(page.getByTestId('showing-count')).toHaveText('— items')
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(
      page.getByRole('button', { name: 'Setup details' }),
    ).toBeInViewport()
  }
  await page.getByRole('button', { name: 'Setup details' }).click()
  const dialog = page.getByRole('dialog', { name: 'Your workspace, connected' })
  await expect(dialog).toContainText('Not configured')
  await expect(dialog).toContainText('public HTTPS backend URL')
  await page.setViewportSize({ width: 320, height: 640 })
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(apiRequests).toEqual([])
  expect(errors).toEqual([])
})
