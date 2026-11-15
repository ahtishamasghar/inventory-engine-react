import { useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import Dialog from './Dialog.jsx'
import { MAX_INTEGER, productPayload, validateProduct } from '../domain.js'

const fields = [
  ['id', 'Product ID', 'number', 'e.g. 1001'],
  ['name', 'Product Name', 'text', 'e.g. Ceramic pour-over'],
  ['category', 'Category', 'text', 'e.g. Kitchen essentials'],
  ['price', 'Price', 'number', '0.00'],
  ['quantity', 'Quantity', 'number', '0'],
  ['minStock', 'Minimum Stock', 'number', '0'],
]

export default function ProductForm({ product, onClose, onSave }) {
  const editing = Boolean(product)
  const [values, setValues] = useState(
    product || {
      id: '',
      name: '',
      category: '',
      price: '',
      quantity: '',
      minStock: '',
    },
  )
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    const validation = validateProduct(values)
    setErrors(validation)
    if (Object.keys(validation).length) {
      document.getElementById(`field-${Object.keys(validation)[0]}`)?.focus()
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave(productPayload(values), editing)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return (
    <Dialog
      title={editing ? 'Edit Product' : 'Add Product'}
      eyebrow={
        editing ? `Inventory / #${product.id}` : 'Make room for something new'
      }
      onClose={onClose}
      busy={busy}
    >
      <p className="dialog-description">
        {editing
          ? 'Keep your product details and stock levels up to date.'
          : 'Add the details below to bring a product into your inventory.'}{' '}
        All fields are required. Product IDs must be unique.
      </p>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          {fields.map(([key, label, type, placeholder]) => (
            <div
              className={`field ${key === 'name' || key === 'category' ? 'wide' : ''}`}
              key={key}
            >
              <label htmlFor={`field-${key}`}>
                {label}
                {key === 'id' && editing && <span> · fixed</span>}
              </label>
              <input
                id={`field-${key}`}
                type={type}
                required
                step={
                  key === 'price' ? 'any' : type === 'number' ? '1' : undefined
                }
                min={type === 'number' ? 0 : undefined}
                max={
                  ['id', 'quantity', 'minStock'].includes(key)
                    ? MAX_INTEGER
                    : undefined
                }
                value={values[key]}
                placeholder={placeholder}
                autoFocus={key === (editing ? 'name' : 'id')}
                disabled={busy || (editing && key === 'id')}
                aria-invalid={!!errors[key]}
                aria-describedby={
                  errors[key]
                    ? `error-${key}`
                    : key === 'minStock'
                      ? 'minStock-hint'
                      : undefined
                }
                onChange={(e) => {
                  setValues({ ...values, [key]: e.target.value })
                  setErrors({ ...errors, [key]: '' })
                }}
              />
              {errors[key] && (
                <small className="field-error" id={`error-${key}`}>
                  {errors[key]}
                </small>
              )}
              {key === 'minStock' && (
                <small id="minStock-hint">
                  Flag stock at or below this quantity.
                </small>
              )}
            </div>
          ))}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
            {busy ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
