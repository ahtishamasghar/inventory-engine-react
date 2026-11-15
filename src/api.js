import { MAX_INTEGER } from './domain.js'

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function resolveBase(configured, development = false) {
  const value = configured?.trim().replace(/\/+$/, '')
  if (!value) return development ? '/api' : null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null
    if (
      !development &&
      (url.protocol !== 'https:' ||
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
      return null
    return value
  } catch {
    return null
  }
}

export function assertProduct(product) {
  if (
    !product ||
    typeof product.name !== 'string' ||
    typeof product.category !== 'string' ||
    typeof product.price !== 'number' ||
    !Number.isFinite(product.price) ||
    product.price < 0 ||
    ['id', 'quantity', 'minStock'].some(
      (k) =>
        !Number.isInteger(product[k]) ||
        product[k] < 0 ||
        product[k] > MAX_INTEGER,
    )
  ) {
    throw new ApiError(
      'The API returned an invalid product. Check the backend response format.',
    )
  }
  return product
}

export function createApi(base, fetcher = globalThis.fetch) {
  async function request(path, { method = 'GET', body, signal } = {}) {
    if (!base)
      throw new ApiError(
        'The inventory API is not configured. Set VITE_API_BASE_URL to your public HTTPS API URL, including /api, and rebuild the frontend.',
      )
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(abort, 15000)
    try {
      const response = await fetcher(`${base}${path}`, {
        method,
        signal: controller.signal,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await response.text()
      if (!response.ok) {
        const detail =
          text && !text.trim().startsWith('<')
            ? text.slice(0, 220)
            : response.statusText
        throw new ApiError(
          `${detail || 'Request failed'} (HTTP ${response.status}).`,
          response.status,
        )
      }
      if (method !== 'GET') return text
      try {
        return JSON.parse(text)
      } catch {
        throw new ApiError(
          'The API did not return JSON. Verify that the API base URL includes /api.',
        )
      }
    } catch (error) {
      if (signal?.aborted)
        throw new DOMException('Request cancelled', 'AbortError')
      if (error instanceof ApiError) throw error
      if (controller.signal.aborted)
        throw new ApiError(
          'The API took too long to respond. Check the connection and retry.',
        )
      throw new ApiError(
        'Cannot reach the inventory API. Check that the server is running and its HTTPS and CORS settings allow this website.',
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }
  async function list(path = '', signal) {
    const data = await request(`/products${path}`, { signal })
    if (!Array.isArray(data.products))
      throw new ApiError('The API returned an invalid product list.')
    const products = data.products.map(assertProduct)
    if (new Set(products.map((p) => p.id)).size !== products.length)
      throw new ApiError('The API returned duplicate product IDs.')
    return products
  }
  return {
    all: (signal) => list('', signal),
    sorted: (kind, signal) => list(`/sorted-by-${kind}`, signal),
    search: async (id, signal) =>
      assertProduct(await request(`/products/${id}`, { signal })),
    lowest: async (signal) =>
      assertProduct(await request('/products/lowest-stock', { signal })),
    save: (product, editing) =>
      request(`/products${editing ? `/${product.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        body: product,
      }),
    remove: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  }
}
