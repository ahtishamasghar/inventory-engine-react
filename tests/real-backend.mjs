// Opt-in test against a disposable instance of the actual Crow server.
// Creates one product and removes it in finally. Never point at production.
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

if (
  !process.env.REAL_API_BASE_URL ||
  process.env.ALLOW_DISPOSABLE_API_WRITES !== '1'
)
  throw new Error(
    'Set REAL_API_BASE_URL and ALLOW_DISPOSABLE_API_WRITES=1 for a disposable backend.',
  )
const base = process.env.REAL_API_BASE_URL.replace(/\/$/, '')
const productId = 1900000000 + Math.floor(Math.random() * 100000000)
const name = `Integration ${productId}`
const before = await (await fetch(`${base}/products`)).json()
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
try {
  await page.goto('http://127.0.0.1:5173/inventory-engine-react/')
  await page.getByText('API connected', { exact: true }).waitFor()
  assert.equal(
    await page.getByTestId('total-products').textContent(),
    String(before.products.length),
  )
  await page
    .getByRole('button', { name: 'Add Product', exact: true })
    .first()
    .click()
  for (const [field, value] of Object.entries({
    id: productId,
    name,
    category: 'QA',
    price: '17.25',
    quantity: '7',
    minStock: '9',
  }))
    await page.locator(`#field-${field}`).fill(String(value))
  await page.getByRole('button', { name: 'Save Product' }).click()
  await page.getByRole('button', { name: `Edit Product: ${name}` }).waitFor()
  let product = await (await fetch(`${base}/products/${productId}`)).json()
  assert.equal(product.quantity, 7)
  await page.getByRole('button', { name: `Edit Product: ${name}` }).click()
  await page.getByLabel('Quantity', { exact: true }).fill('15')
  await page.getByRole('button', { name: 'Save Product' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  product = await (await fetch(`${base}/products/${productId}`)).json()
  assert.equal(product.quantity, 15)
  for (const [button, endpoint, field] of [
    ['Sort by ID', 'sorted-by-id', 'id'],
    ['Sort by Price', 'sorted-by-price', 'price'],
  ]) {
    const response = page.waitForResponse((r) => r.url().endsWith(endpoint))
    await page.getByRole('button', { name: button, exact: true }).click()
    const data = await (await response).json()
    assert.ok(
      data.products.every(
        (p, i) => !i || data.products[i - 1][field] <= p[field],
      ),
    )
  }
  await page.getByLabel('Product ID to search').fill(String(productId))
  await page.getByRole('button', { name: 'Search by ID' }).click()
  await page
    .getByText(`Search results · #${productId}`, { exact: true })
    .waitFor()
  assert.equal(await page.locator('tbody tr').count(), 1)
  const lowestResponse = page.waitForResponse((r) =>
    r.url().endsWith('/lowest-stock'),
  )
  await page.getByRole('button', { name: 'Lowest Stock', exact: true }).click()
  const lowest = await (await lowestResponse).json()
  const all = await (await fetch(`${base}/products`)).json()
  assert.equal(
    lowest.quantity,
    Math.min(...all.products.map((p) => p.quantity)),
  )
  await page
    .getByRole('button', { name: 'Show All Products', exact: true })
    .click()
  await page.getByRole('button', { name: `Delete Product: ${name}` }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete Product', exact: true })
    .click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal((await fetch(`${base}/products/${productId}`)).status, 404)
  await page.getByText('API connected', { exact: true }).waitFor()
  await page.screenshot({ path: '/tmp/stockroom-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await page.screenshot({ path: '/tmp/stockroom-mobile.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log(
    'PASS: real Crow API create, edit, ID search, BST ID sort, merge price sort, heap lowest stock, delete, desktop/mobile layouts and browser runtime.',
  )
} finally {
  if ((await fetch(`${base}/products/${productId}`)).ok)
    await fetch(`${base}/products/${productId}`, { method: 'DELETE' })
  await browser.close()
}
