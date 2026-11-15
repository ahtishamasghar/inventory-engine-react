import test from 'node:test'
import assert from 'node:assert/strict'
import { createApi, resolveBase } from '../src/api.js'
const product = {
  id: 10,
  name: 'Cup',
  category: 'Home',
  price: 1.25,
  quantity: 2,
  minStock: 3,
}

test('production never falls back to localhost and rejects unsafe API URLs', () => {
  assert.equal(resolveBase('', false), null)
  assert.equal(resolveBase('', true), '/api')
  assert.equal(
    resolveBase('https://inventory.example.com/api/'),
    'https://inventory.example.com/api',
  )
  for (const value of [
    'http://example.com/api',
    'https://localhost/api',
    'https://127.0.0.1/api',
    'https://[::1]/api',
    '//evil.test',
    'javascript:alert(1)',
    'https://u:p@example.com/api',
  ])
    assert.equal(resolveBase(value), null)
})
test('DSA queries use the exact Crow endpoints and retain server ordering', async () => {
  const calls = []
  const api = createApi('/api', async (url) => {
    calls.push(url)
    return new Response(
      JSON.stringify(
        url.endsWith('/10') || url.endsWith('/lowest-stock')
          ? product
          : { products: [product, { ...product, id: 2 }] },
      ),
    )
  })
  assert.deepEqual(
    (await api.all()).map((p) => p.id),
    [10, 2],
  )
  await api.sorted('id')
  await api.sorted('price')
  await api.search(10)
  await api.lowest()
  assert.deepEqual(calls, [
    '/api/products',
    '/api/products/sorted-by-id',
    '/api/products/sorted-by-price',
    '/api/products/10',
    '/api/products/lowest-stock',
  ])
})
test('mutations send JSON and accept plain-text Crow responses', async () => {
  const calls = []
  const api = createApi('/api', async (url, options) => {
    calls.push({ url, ...options })
    return new Response('Product saved successfully', { status: 201 })
  })
  await api.save(product, false)
  await api.save(product, true)
  await api.remove(10)
  assert.deepEqual(
    calls.map((c) => [c.method, c.url]),
    [
      ['POST', '/api/products'],
      ['PUT', '/api/products/10'],
      ['DELETE', '/api/products/10'],
    ],
  )
  assert.deepEqual(JSON.parse(calls[0].body), product)
  assert.equal(calls[0].headers['Content-Type'], 'application/json')
})
test('HTTP, network, misconfiguration and malformed responses remain failures', async () => {
  await assert.rejects(createApi(null).all(), /not configured/)
  await assert.rejects(
    createApi('/api', async () => {
      throw new TypeError('fetch failed')
    }).all(),
    /Cannot reach/,
  )
  await assert.rejects(
    createApi(
      '/api',
      async () => new Response('Product not found', { status: 404 }),
    ).search(1),
    { status: 404 },
  )
  for (const response of [
    '<html>Not an API</html>',
    '{}',
    '{"products":[{}]}',
    JSON.stringify({ products: [product, product] }),
  ]) {
    await assert.rejects(
      createApi('/api', async () => new Response(response)).all(),
    )
  }
})
test('aborted requests do not turn into inventory failures', async () => {
  const controller = new AbortController()
  controller.abort()
  const api = createApi('/api', async (_, options) => {
    options.signal.throwIfAborted()
  })
  await assert.rejects(api.all(controller.signal), { name: 'AbortError' })
})

test('name search encodes special characters and keeps backend result ordering', async () => {
  let requested
  const api = createApi('/api', async (url) => {
    requested = url
    return new Response(
      JSON.stringify({ products: [product, { ...product, id: 2 }] }),
    )
  })
  const results = await api.searchByName('  Cup & café?#  ')
  assert.equal(
    requested,
    '/api/products/search?name=Cup%20%26%20caf%C3%A9%3F%23',
  )
  assert.deepEqual(
    results.map((p) => p.id),
    [10, 2],
  )
})
