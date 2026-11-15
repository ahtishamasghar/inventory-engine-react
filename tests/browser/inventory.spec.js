import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Explicit browser-test fixtures; these are never bundled into the application.
const initial = [
  {
    id: 11,
    name: 'Field notebook',
    category: 'Stationery',
    price: 12.5,
    quantity: 24,
    minStock: 8,
  },
  {
    id: 4,
    name: 'Ceramic cup',
    category: 'Home',
    price: 18,
    quantity: 2,
    minStock: 5,
  },
  {
    id: 8,
    name: 'Desk tray',
    category: 'Office',
    price: 9,
    quantity: 10,
    minStock: 10,
  },
]

async function fixture(page) {
  let products = structuredClone(initial)
  const requests = []
  await page.route('**/api/products**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const method = req.method()
    requests.push(`${method} ${path}`)
    if (method === 'POST') {
      products.push(req.postDataJSON())
      return route.fulfill({ status: 201, body: 'Product added successfully' })
    }
    if (method === 'PUT') {
      products = products.map((p) =>
        p.id === Number(path.split('/').pop()) ? req.postDataJSON() : p,
      )
      return route.fulfill({ body: 'Product updated successfully' })
    }
    if (method === 'DELETE') {
      products = products.filter((p) => p.id !== Number(path.split('/').pop()))
      return route.fulfill({ body: 'Product deleted successfully' })
    }
    if (path.endsWith('/sorted-by-id'))
      return route.fulfill({
        json: { products: [products[1], products[2], products[0]] },
      })
    if (path.endsWith('/sorted-by-price'))
      return route.fulfill({
        json: { products: [products[2], products[0], products[1]] },
      })
    if (path.endsWith('/lowest-stock'))
      return route.fulfill({ json: products[1] })
    if (/\/\d+$/.test(path)) {
      const product = products.find(
        (p) => p.id === Number(path.split('/').pop()),
      )
      return product
        ? route.fulfill({ json: product })
        : route.fulfill({ status: 404, body: 'Product not found' })
    }
    return route.fulfill({ json: { products } })
  })
  return requests
}

test('dashboard, DSA operations, search and full-list totals', async ({
  page,
}) => {
  const calls = await fixture(page)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await expect(page.getByTestId('total-stock')).toHaveText('36')
  await expect(page.getByTestId('low-stock')).toHaveText('1')
  await page.getByRole('button', { name: 'Sort by ID', exact: true }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Ceramic cup')
  await page.getByRole('button', { name: 'Sort by Price', exact: true }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Desk tray')
  await page.getByRole('button', { name: 'Lowest Stock', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Ceramic cup')
  await page.getByLabel('Product ID to search').fill('11')
  await page.getByRole('button', { name: 'Search by ID' }).click()
  await expect(page.locator('tbody')).toContainText('Field notebook')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await page.getByLabel('Product ID to search').fill('999')
  await page.getByRole('button', { name: 'Search by ID' }).click()
  await expect(
    page.getByRole('heading', { name: 'No matching products' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Show All Products', exact: true })
    .first()
    .click()
  await expect(page.locator('tbody tr')).toHaveCount(3)
  expect(calls).toEqual(
    expect.arrayContaining([
      'GET /api/products/sorted-by-id',
      'GET /api/products/sorted-by-price',
      'GET /api/products/lowest-stock',
      'GET /api/products/11',
    ]),
  )
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true)
})

test('create, validate, cancel, edit and confirm deletion', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await page.getByRole('button', { name: 'Add Product', exact: true }).click()
  await page.getByRole('button', { name: 'Save Product' }).click()
  await expect(page.getByText('Enter a product name.')).toBeVisible()
  for (const [label, value] of Object.entries({
    'Product ID': '20',
    'Product Name': 'Test basket',
    Category: 'Storage',
    Price: '29.50',
    Quantity: '6',
    'Minimum Stock': '7',
  }))
    await page
      .getByRole('textbox', { name: label, exact: true })
      .or(page.getByRole('spinbutton', { name: label, exact: true }))
      .fill(value)
  await page.getByRole('button', { name: 'Save Product' }).click()
  await expect(page.getByTestId('total-products')).toHaveText('4')
  await expect(page.getByTestId('low-stock')).toHaveText('2')
  await page.getByRole('button', { name: 'Edit Product: Test basket' }).click()
  await expect(page.locator('#field-id')).toBeDisabled()
  await page.getByLabel('Quantity', { exact: true }).fill('12')
  await page.getByRole('button', { name: 'Save Product' }).click()
  await expect(page.getByTestId('total-stock')).toHaveText('48')
  await page
    .getByRole('button', { name: 'Delete Product: Test basket' })
    .click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('tbody')).toContainText('Test basket')
  await page
    .getByRole('button', { name: 'Delete Product: Test basket' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete Product', exact: true })
    .click()
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await expect(page.locator('tbody')).not.toContainText('Test basket')
  await page.getByRole('button', { name: 'Add Product', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Add Product', exact: true }),
  ).toBeFocused()
})

test('network and failed writes never display invented success', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('./')
  await expect(page.getByTestId('total-stock')).toHaveText('36')
  await page.route('**/api/products/4', (route) =>
    route.fulfill({ status: 500, body: 'Failed to save inventory' }),
  )
  await page
    .getByRole('button', { name: 'Delete Product: Ceramic cup' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete Product', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Failed to save inventory',
  )
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.route('**/api/products', (route) => route.abort())
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'last successful snapshot',
  )
  await expect(page.getByTestId('total-stock')).toHaveText('36')
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Cannot reach')
  await expect(page.getByTestId('total-stock')).toHaveText('—')
})

test('empty inventory and pending API request have distinct honest states', async ({
  page,
}) => {
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/api/products', async (route) => {
    await gate
    await route.fulfill({ json: { products: [] } })
  })
  await page.goto('./')
  await expect(page.getByText('Getting your inventory ready')).toBeVisible()
  await expect(page.getByTestId('total-products')).toHaveText('—')
  release()
  await expect(page.getByTestId('total-products')).toHaveText('0')
  await expect(
    page.getByRole('heading', { name: 'A fresh start for your inventory' }),
  ).toBeVisible()
})

test('dashboard and product editor pass accessibility checks', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  for (const editor of [false, true]) {
    if (editor)
      await page
        .getByRole('button', { name: 'Add Product', exact: true })
        .click()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  }
})
