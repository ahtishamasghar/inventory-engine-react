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
        json: { products: [...products].sort((a, b) => a.id - b.id) },
      })
    if (path.endsWith('/sorted-by-price'))
      return route.fulfill({
        json: { products: [...products].sort((a, b) => a.price - b.price) },
      })
    if (path.endsWith('/lowest-stock'))
      return route.fulfill({ json: products[1] })
    if (path.endsWith('/search')) {
      const name = new URL(req.url()).searchParams.get('name').toLowerCase()
      return route.fulfill({
        json: {
          products: products.filter((p) => p.name.toLowerCase().includes(name)),
        },
      })
    }
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
  await expect(page.getByTestId('showing-count')).toHaveText('3 items')
  await expect(page.getByTestId('low-stock')).toHaveText('2')
  await page.getByRole('button', { name: 'Sort by ID', exact: true }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Ceramic cup')
  await page.getByRole('button', { name: 'Sort by Price', exact: true }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Desk tray')
  await page.getByRole('button', { name: 'Lowest Stock', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Ceramic cup')
  await expect(page.getByTestId('showing-count')).toHaveText('1 item')
  await page.getByLabel('Product ID to search').fill('11')
  await page.getByRole('button', { name: 'Search by ID' }).click()
  await expect(page.locator('tbody')).toContainText('Field notebook')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await page.getByLabel('Product ID to search').fill('999')
  await page.getByRole('button', { name: 'Search by ID' }).click()
  await expect(
    page.getByRole('heading', { name: 'No matching products' }),
  ).toBeVisible()
  await expect(page.getByTestId('showing-count')).toHaveText('0 items')
  await page
    .getByRole('button', { name: 'Dashboard', exact: true })
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
  await expect(page.getByTestId('low-stock')).toHaveText('3')
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
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
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
  await expect(page.getByTestId('showing-count')).toHaveText('Updating…')
  release()
  await expect(page.getByTestId('total-products')).toHaveText('0')
  await expect(page.getByTestId('showing-count')).toHaveText('0 items')
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

test('live name and ID search reset cleanly and preserve full inventory totals', async ({
  page,
}) => {
  const calls = await fixture(page)
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await page.getByLabel('Search mode').selectOption('name')
  await page.getByLabel('Product name to search').fill('CERAM')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Ceramic cup')
  await expect(
    page.getByRole('status').filter({ hasText: 'Name search results' }),
  ).toContainText('CERAM')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await expect(page.getByTestId('low-stock')).toHaveText('2')
  expect(calls).toContain('GET /api/products/search')
  await page.getByLabel('Product name to search').fill('missing product')
  await expect(
    page.getByRole('heading', { name: 'No matching products' }),
  ).toBeVisible()
  await page.getByLabel('Product name to search').fill('')
  await expect(page.locator('tbody tr')).toHaveCount(3)
  await page.getByLabel('Search mode').selectOption('id')
  await page.getByLabel('Product ID to search').fill('8')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Desk tray')
  await expect(page.locator('tbody')).toContainText('Low stock')
  await page.getByLabel('Product ID to search').fill('1.5')
  await expect(page.getByRole('alert')).toContainText('Enter a product ID')
  expect(calls).not.toContain('GET /api/products/1.5')
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(3)
  await expect(page.getByLabel('Product ID to search')).toHaveValue('')
})

test('a superseded name search cannot overwrite a newer search or reset', async ({
  page,
}) => {
  await fixture(page)
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/api/products/search?name=old', async (route) => {
    await gate
    await route.fulfill({ json: { products: [initial[0]] } }).catch(() => {})
  })
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await page.getByLabel('Search mode').selectOption('name')
  const oldRequest = page.waitForRequest('**/api/products/search?name=old')
  await page.getByLabel('Product name to search').fill('old')
  await oldRequest
  await page.getByLabel('Product name to search').fill('cup')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Ceramic cup')
  release()
  await expect(
    page.getByRole('status').filter({ hasText: 'Name search results' }),
  ).toContainText('cup')
  await page.getByLabel('Product name to search').fill('notebook')
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(3)
  // Beyond the debounce interval, the reset must still be the active view.
  await page.waitForTimeout(450)
  await expect(
    page.getByRole('status').filter({ hasText: 'Showing 3 of 3 products' }),
  ).toContainText('Showing 3 of 3 products')
})

test('project credits, source links, documentation and mobile table guidance', async ({
  page,
}, testInfo) => {
  await fixture(page)
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  for (const text of [
    'Ahtisham Asghar',
    'Abubakar Siddique',
    'BSCY51F25S075',
    'BSCY51F25S058',
  ])
    await expect(page.getByText(text, { exact: true })).toBeVisible()
  const header = page.getByRole('banner')
  await expect(page.getByText('CONTRIBUTORS', { exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Show All Products', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('.view-bar')).toHaveCount(0)
  const currentHeading = page.getByRole('heading', {
    name: 'Currently Showing',
    exact: true,
  })
  await expect(currentHeading).toBeVisible()
  await expect(page.locator('.count-chip')).toHaveCount(0)
  const headingBox = await page.locator('.inventory-title').boundingBox()
  const addBox = await page
    .locator('.inventory-heading')
    .getByRole('button', { name: 'Add Product', exact: true })
    .boundingBox()
  expect(
    Math.abs(
      headingBox.y + headingBox.height / 2 - addBox.y - addBox.height / 2,
    ),
  ).toBeLessThanOrEqual(1)
  await expect(page.locator('.sidebar-brand').getByRole('button')).toHaveCount(
    0,
  )
  await expect(
    header.getByRole('heading', {
      name: 'Dynamic Inventory Optimization Engine',
    }),
  ).toBeVisible()
  await expect(
    header.getByText('Ahtisham Asghar', { exact: true }),
  ).toBeVisible()
  await expect(
    header.getByText('Abubakar Siddique', { exact: true }),
  ).toBeVisible()
  await expect(
    header.getByRole('button', { name: 'Explore the project' }),
  ).toBeVisible()
  await expect(
    page
      .locator('.inventory-heading')
      .getByRole('button', { name: 'Add Product', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Refresh', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Search by ID', exact: true }),
  ).toBeVisible()
  for (const text of [
    'A CLEAR VIEW OF WHAT’S IN STORE',
    'Everything in its place. Every product accounted for.',
    'Your API is the source of truth',
    'Built for better inventory decisions.',
    'Your operations, organized',
    'Less guesswork.',
    'Results update as you type. Name search matches any part of a name.',
    'A quick pulse on your inventory.',
  ])
    await expect(page.getByText(text, { exact: false })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Connection', exact: true }),
  ).toHaveCount(0)
  const team = header.getByLabel('Group 12 contributors')
  await expect(team.getByText('GROUP 12', { exact: true })).toBeVisible()
  const groupBox = await team
    .getByText('GROUP 12', { exact: true })
    .boundingBox()
  const nameBox = await team
    .getByText('Ahtisham Asghar', { exact: true })
    .boundingBox()
  expect(groupBox.y + groupBox.height).toBeLessThanOrEqual(nameBox.y)
  const resourceBox = await page
    .getByRole('navigation', { name: 'Project resources' })
    .boundingBox()
  if (testInfo.project.name === 'mobile') {
    const mainBox = await page.getByRole('main').boundingBox()
    expect(resourceBox.y).toBeGreaterThanOrEqual(mainBox.y + mainBox.height)
  } else {
    expect(resourceBox.y + resourceBox.height).toBeGreaterThan(950)
  }
  const resources = page.getByRole('navigation', { name: 'Project resources' })
  await expect(resources.getByRole('link')).toHaveCount(3)
  await expect(resources.getByRole('button')).toHaveCount(0)
  for (const [label, href] of [
    ['Frontend', 'https://github.com/ahtishamasghar/inventory-engine-react'],
    [
      'C++ backend',
      'https://github.com/ahtishamasghar/inventory-optimization-engine',
    ],
    [
      'Setup README',
      'https://github.com/ahtishamasghar/inventory-engine-react#readme',
    ],
  ]) {
    const link = resources.getByRole('link', {
      name: `${label} (opens in a new tab)`,
      exact: true,
    })
    await expect(link).toHaveAttribute('href', href)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
  if (testInfo.project.name === 'mobile')
    await expect(
      page.getByText(
        'Scroll horizontally to see all columns and product actions.',
      ),
    ).toBeVisible()
  await page
    .getByRole('button', { name: 'Explore the project', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Workspace documentation' })
  await expect(
    dialog.getByRole('heading', { name: 'Inside the engine' }),
  ).toBeVisible()
  for (const text of [
    'Hash Table',
    'Binary Search Tree',
    'Merge Sort',
    'Min Heap',
  ])
    await expect(dialog.getByText(text, { exact: true })).toBeVisible()
  await expect(
    dialog.getByRole('link', { name: /React frontend/ }),
  ).toHaveAttribute(
    'href',
    'https://github.com/ahtishamasghar/inventory-engine-react',
  )
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Explore the project', exact: true }),
  ).toBeFocused()
})

test('zero stock, precise prices and sort announcements survive stock-watch edits', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await page.getByRole('button', { name: 'Stock watch', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByTestId('showing-count')).toHaveText('2 items')
  await page.getByRole('button', { name: 'Edit Product: Ceramic cup' }).click()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.getByLabel('Quantity', { exact: true }).fill('0')
  await page.getByLabel('Minimum Stock', { exact: true }).fill('0')
  await page.getByLabel('Price', { exact: true }).fill('0.00001')
  await page.getByRole('button', { name: 'Save Product' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  await expect(
    page.getByRole('status').filter({ hasText: 'Low stock products' }),
  ).toContainText('2 results')
  const cup = page.getByRole('row').filter({ hasText: 'Ceramic cup' })
  await expect(cup).toContainText('Out of stock')
  await expect(cup).toContainText('0.00001')
  await expect(page.getByTestId('low-stock')).toHaveText('2')
  await expect(page.getByTestId('total-stock')).toHaveText('34')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
  await page.getByRole('button', { name: 'Sort by ID', exact: true }).click()
  await expect(
    page.getByRole('columnheader', { name: 'Product', exact: true }),
  ).toHaveAttribute('aria-sort', 'ascending')
  await page.getByRole('button', { name: 'Sort by Price', exact: true }).click()
  await expect(
    page.getByRole('columnheader', { name: 'Price', exact: true }),
  ).toHaveAttribute('aria-sort', 'ascending')
  await expect(
    page.getByRole('columnheader', { name: 'Product', exact: true }),
  ).not.toHaveAttribute('aria-sort')
})

test('save and delete retain name search; selecting another view clears the input', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await page.getByLabel('Search mode').selectOption('name')
  await page.getByLabel('Product name to search').fill('cup')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Edit Product: Ceramic cup' }).click()
  await page.getByLabel('Quantity', { exact: true }).fill('12')
  await page.getByRole('button', { name: 'Save Product' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Name search results' }),
  ).toContainText('“cup” · 1 result')
  await expect(page.getByLabel('Product name to search')).toHaveValue('cup')
  await expect(page.getByTestId('total-stock')).toHaveText('46')
  await page
    .getByRole('button', { name: 'Delete Product: Ceramic cup' })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete Product', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'No matching products' }),
  ).toBeVisible()
  await expect(
    page.getByRole('status').filter({ hasText: 'Name search results' }),
  ).toContainText('“cup” · 0 results')
  await expect(page.getByTestId('total-products')).toHaveText('2')
  await page.getByRole('button', { name: 'Sort by Price', exact: true }).click()
  await expect(page.getByLabel('Product name to search')).toHaveValue('')
  await expect(page.locator('tbody tr')).toHaveCount(2)
})

test('retry repeats a failed sort or name query while labeling the previous snapshot', async ({
  page,
}) => {
  await fixture(page)
  let failSort = true
  await page.route('**/api/products/sorted-by-price', (route) =>
    failSort
      ? route.fulfill({ status: 503, body: 'Sort temporarily unavailable' })
      : route.fallback(),
  )
  await page.goto('./')
  await expect(page.getByTestId('total-products')).toHaveText('3')
  await page.getByRole('button', { name: 'Sort by Price', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Couldn’t load sorted by price',
  )
  await expect(
    page.getByRole('status').filter({ hasText: 'Last successful view' }),
  ).toContainText('Showing 3 of 3 products')
  failSort = false
  const retriedSort = page.waitForResponse('**/api/products/sorted-by-price')
  await page
    .getByRole('button', { name: 'Retry connection', exact: true })
    .click()
  await retriedSort
  await expect(page.locator('tbody tr').first()).toContainText('Desk tray')
  await expect(page.getByRole('alert')).toHaveCount(0)
  let failSearch = true
  await page.route('**/api/products/search?name=cup', (route) =>
    failSearch
      ? route.fulfill({ status: 503, body: 'Search temporarily unavailable' })
      : route.fallback(),
  )
  await page.getByLabel('Search mode').selectOption('name')
  await page.getByLabel('Product name to search').fill('cup')
  await expect(page.getByRole('alert')).toContainText('for “cup”')
  await expect(
    page.getByRole('status').filter({ hasText: 'Last successful view' }),
  ).toContainText('Sorted by price')
  failSearch = false
  await page
    .getByRole('button', { name: 'Retry connection', exact: true })
    .click()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody')).toContainText('Ceramic cup')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
