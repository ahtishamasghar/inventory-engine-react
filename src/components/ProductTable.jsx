import { useEffect, useRef, useState } from 'react'
import {
  MoveHorizontal,
  Pencil,
  Trash2,
  Package,
  SearchX,
  LoaderCircle,
  Plus,
  PlugZap,
} from 'lucide-react'
import { isLow, number, price } from '../domain.js'

export default function ProductTable({
  products,
  loading,
  loaded,
  failed,
  onEdit,
  onDelete,
  onAdd,
  onReset,
  view,
}) {
  const scrollRef = useRef(null)
  const [overflows, setOverflows] = useState(false)
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const update = () =>
      setOverflows(element.scrollWidth > element.clientWidth + 1)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    observer.observe(element.querySelector('table'))
    update()
    return () => observer.disconnect()
  }, [loaded, products])
  if (loading && !loaded)
    return (
      <div className="empty-state" role="status">
        <LoaderCircle size={30} className="spin" />
        <h3>Getting your inventory ready</h3>
        <p>Fetching the latest products from your API.</p>
      </div>
    )
  if (!loaded)
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <PlugZap size={30} />
        </span>
        <h3>Your inventory starts with a connection</h3>
        <p>
          Connect your inventory API to see products, stock levels, and what
          needs attention.
        </p>
        <span className="empty-caption">
          No inventory data has been loaded.
        </span>
      </div>
    )
  if (!products.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">
          {view === 'all' ? <Package size={30} /> : <SearchX size={30} />}
        </span>
        <h3>
          {view === 'all'
            ? 'A fresh start for your inventory'
            : view === 'low'
              ? 'All products are above minimum stock'
              : 'No matching products'}
        </h3>
        <p>
          {view === 'all'
            ? 'Add your first product. We’ll help you keep track of the rest.'
            : 'Try a different view or return to your full inventory.'}
        </p>
        <button
          className="button secondary"
          onClick={view === 'all' ? onAdd : onReset}
        >
          {view === 'all' ? (
            <>
              <Plus size={16} />
              Add Product
            </>
          ) : (
            'Show All Products'
          )}
        </button>
      </div>
    )
  return (
    <>
      <div
        ref={scrollRef}
        className={`table-scroll ${loading ? 'updating' : ''}`}
        tabIndex={0}
        role="region"
        aria-label="Scrollable product table"
        aria-describedby={overflows ? 'table-scroll-hint' : undefined}
      >
        <table>
          <caption className="sr-only">
            Inventory products. {failed ? 'Last successfully loaded data.' : ''}{' '}
            Prices use the currency defined by your inventory.
          </caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Category</th>
              <th scope="col" className="numeric">
                Price
              </th>
              <th scope="col" className="numeric">
                Quantity
              </th>
              <th scope="col" className="numeric">
                Min. stock
              </th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="product-cell">
                    <span
                      className={`product-avatar tone-${p.id % 4}`}
                      aria-hidden="true"
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{p.name}</strong>
                      <span>#{p.id}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="category-label">
                    {p.category || 'Uncategorized'}
                  </span>
                </td>
                <td className="numeric price">{price(p.price)}</td>
                <td className="numeric">
                  <span className={isLow(p) ? 'stock-alert' : ''}>
                    {number(p.quantity)}
                  </span>
                </td>
                <td className="numeric muted">{number(p.minStock)}</td>
                <td>
                  <span className={`badge ${isLow(p) ? 'warning' : 'healthy'}`}>
                    <i />
                    {isLow(p) ? 'Low stock' : 'In stock'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      title="Edit Product"
                      aria-label={`Edit Product: ${p.name}`}
                      onClick={() => onEdit(p)}
                      disabled={loading}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button delete-button"
                      title="Delete Product"
                      aria-label={`Delete Product: ${p.name}`}
                      onClick={() => onDelete(p)}
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {overflows && (
        <p className="table-scroll-hint" id="table-scroll-hint">
          <MoveHorizontal size={15} aria-hidden="true" />
          Scroll horizontally to see all columns and product actions.
        </p>
      )}
    </>
  )
}
