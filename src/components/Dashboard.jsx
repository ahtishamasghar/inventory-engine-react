import {
  Boxes,
  Package,
  TriangleAlert,
  Layers3,
  ArrowUpRight,
} from 'lucide-react'
import { summarize, number } from '../domain.js'

export default function Dashboard({ products, stale, onLowStock }) {
  const stats = products === null ? null : summarize(products)
  const cards = [
    {
      label: 'Total Products',
      value: stats?.products,
      description: 'Distinct products in your catalog',
      icon: Package,
      className: 'products',
    },
    {
      label: 'Total Stock',
      value: stats?.stock,
      description: 'Units across your inventory',
      icon: Boxes,
      className: 'stock',
    },
    {
      label: 'Low Stock Products',
      value: stats?.low,
      description: 'Below their minimum stock level',
      icon: TriangleAlert,
      className: 'low',
    },
  ]
  return (
    <section
      className="stats-grid"
      aria-label={`Inventory statistics${stale ? ' — last successful snapshot' : ''}`}
    >
      {cards.map(({ label, value, description, icon: Icon, className }) => (
        <article className={`stat-card ${className}`} key={label}>
          <div className="stat-top">
            <span>{label}</span>
            <span className="stat-icon">
              <Icon size={20} strokeWidth={1.6} />
            </span>
          </div>
          <strong
            data-testid={
              className === 'products'
                ? 'total-products'
                : className === 'stock'
                  ? 'total-stock'
                  : 'low-stock'
            }
          >
            {value == null ? '—' : number(value)}
          </strong>
          <p>{description}</p>
          {className === 'low' && (
            <button
              className="stat-link"
              aria-label="View low stock products"
              onClick={onLowStock}
              disabled={!stats}
            >
              <ArrowUpRight size={18} />
            </button>
          )}
        </article>
      ))}
      <article className="stat-card categories">
        <div className="stat-top">
          <span>Categories</span>
          <Layers3 size={20} strokeWidth={1.6} />
        </div>
        <strong>{stats ? number(stats.categories) : '—'}</strong>
        <p>A place for every product</p>
        <div className="category-decoration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </article>
    </section>
  )
}
