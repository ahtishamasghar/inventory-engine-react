import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateProduct,
  productPayload,
  summarize,
  isLow,
  MAX_INTEGER,
  price,
} from '../src/domain.js'
const product = {
  id: '0',
  name: ' Ceramic cup ',
  category: ' Home ',
  price: '0',
  quantity: '0',
  minStock: '0',
}

test('price display retains sub-cent and stored decimal precision', () => {
  assert.equal(price(0), '0.00')
  assert.equal(price(12.5), '12.50')
  assert.equal(price(0.00001), '0.00001')
  assert.equal(price(12.3456789), '12.3456789')
})

test('accepts zero values and trims the product payload', () => {
  assert.deepEqual(validateProduct(product), {})
  assert.deepEqual(productPayload(product), {
    id: 0,
    name: 'Ceramic cup',
    category: 'Home',
    price: 0,
    quantity: 0,
    minStock: 0,
  })
})
test('enforces C++ integer bounds, required text and finite nonnegative prices', () => {
  for (const value of ['', '-1', '1.5', String(MAX_INTEGER + 1), 'Infinity']) {
    for (const field of ['id', 'quantity', 'minStock'])
      assert.ok(validateProduct({ ...product, [field]: value })[field])
  }
  for (const value of ['', '-0.1', 'Infinity', 'NaN'])
    assert.ok(validateProduct({ ...product, price: value }).price)
  assert.ok(validateProduct({ ...product, name: '  ' }).name)
  assert.ok(validateProduct({ ...product, category: '' }).category)
})
test('summaries use actual quantities and the inclusive minimum stock boundary', () => {
  const rows = [
    { quantity: 3, minStock: 4, category: 'Home' },
    { quantity: 4, minStock: 4, category: 'Home' },
    { quantity: 0, minStock: 0, category: 'Office' },
  ]
  assert.equal(isLow(rows[1]), true)
  assert.equal(isLow(rows[2]), true)
  assert.equal(isLow({ quantity: 5, minStock: 4 }), false)
  assert.deepEqual(summarize(rows), {
    products: 3,
    stock: 7,
    low: 3,
    categories: 2,
  })
  assert.deepEqual(summarize([]), {
    products: 0,
    stock: 0,
    low: 0,
    categories: 0,
  })
})
