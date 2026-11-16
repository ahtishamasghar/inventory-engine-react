export const MAX_INTEGER = 2147483647
export const isLow = (product) => product.quantity <= product.minStock
export const number = (value) =>
  new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)
export const price = (value) =>
  new Intl.NumberFormat('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 20,
  }).format(value)

export function validateProduct(values) {
  const errors = {}
  for (const field of ['id', 'quantity', 'minStock']) {
    const n = Number(values[field])
    if (
      String(values[field]).trim() === '' ||
      !Number.isInteger(n) ||
      n < 0 ||
      n > MAX_INTEGER
    )
      errors[field] =
        `Enter a whole number from 0 to ${MAX_INTEGER.toLocaleString('en')}.`
  }
  if (!values.name.trim()) errors.name = 'Enter a product name.'
  if (!values.category.trim()) errors.category = 'Enter a category.'
  if (
    String(values.price).trim() === '' ||
    !Number.isFinite(Number(values.price)) ||
    Number(values.price) < 0
  )
    errors.price = 'Enter a price of 0 or greater.'
  return errors
}

export function productPayload(values) {
  return {
    id: Number(values.id),
    name: values.name.trim(),
    category: values.category.trim(),
    price: Number(values.price),
    quantity: Number(values.quantity),
    minStock: Number(values.minStock),
  }
}

export function summarize(products) {
  return {
    products: products.length,
    stock: products.reduce((n, p) => n + p.quantity, 0),
    low: products.filter(isLow).length,
    categories: new Set(products.map((p) => p.category)).size,
  }
}
