import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownNarrowWide,
  ArrowUpDown,
  ArrowUpRight,
  Box,
  ChartNoAxesCombined,
  Check,
  LayoutDashboard,
  LoaderCircle,
  Package,
  Plus,
  Search,
  TriangleAlert,
  WifiOff,
  X,
} from 'lucide-react'
import { createApi, resolveBase } from './api.js'
import { isLow, MAX_INTEGER, number } from './domain.js'
import Dashboard from './components/Dashboard.jsx'
import ProductTable from './components/ProductTable.jsx'
import ProductForm from './components/ProductForm.jsx'
import Dialog from './components/Dialog.jsx'
import Documentation from './components/Documentation.jsx'
import ProjectDetails from './components/ProjectDetails.jsx'
import ProjectResources from './components/ProjectResources.jsx'

const base = resolveBase(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV)
const api = createApi(base)
const viewLabels = {
  all: 'All products',
  id: 'Sorted by ID',
  price: 'Sorted by price',
  lowest: 'Lowest stock',
  search: 'Search results',
  name: 'Name search results',
  low: 'Low stock products',
}

export default function App() {
  const [all, setAll] = useState(null)
  const [rows, setRows] = useState([])
  const [view, setView] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState('id')
  const [activeSearch, setActiveSearch] = useState('')
  const [searchError, setSearchError] = useState('')
  const [updated, setUpdated] = useState(null)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [notice, setNotice] = useState('')
  const [help, setHelp] = useState(false)
  const [documentation, setDocumentation] = useState(false)
  const requestRef = useRef(null)
  const searchTimer = useRef(null)
  // Keep request intent separate from the last successful snapshot shown below.
  const requestedView = useRef({ view: 'all', query: '' })

  const load = useCallback(async (nextView = 'all', id = '') => {
    requestedView.current = { view: nextView, query: id }
    clearTimeout(searchTimer.current)
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError('')
    setSearchError('')
    try {
      const products = await api.all(controller.signal)
      let result = products
      if (nextView === 'id' || nextView === 'price')
        result = await api.sorted(nextView, controller.signal)
      if (nextView === 'low') result = products.filter(isLow)
      if (nextView === 'name')
        result = await api.searchByName(id, controller.signal)
      if (nextView === 'lowest' || nextView === 'search') {
        try {
          result = [
            await (nextView === 'lowest'
              ? api.lowest(controller.signal)
              : api.search(id, controller.signal)),
          ]
        } catch (err) {
          if (err.status === 404) result = []
          else throw err
        }
      }
      if (controller.signal.aborted) return
      setAll(products)
      setRows(result)
      setView(nextView)
      if (nextView === 'search' || nextView === 'name') setActiveSearch(id)
      setUpdated(new Date())
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          `Couldn’t load ${viewLabels[nextView].toLowerCase()}${id !== '' ? ` for “${id}”` : ''}. ${err.message}`,
        )
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return () => {
      requestRef.current?.abort()
      clearTimeout(searchTimer.current)
    }
  }, [load])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice])
  const lowCount = all?.filter(isLow).length
  const healthyCount = all ? all.length - lowCount : 0
  const healthPercent = all?.length
    ? Math.round((healthyCount / all.length) * 100)
    : 0

  async function save(product, editing) {
    await api.save(product, editing)
    setEditor(null)
    setNotice(`${product.name} ${editing ? 'updated' : 'added'} successfully.`)
    await refreshView()
  }
  async function remove() {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await api.remove(deleting.id)
      setNotice(`${deleting.name} deleted successfully.`)
      setDeleting(null)
      await refreshView()
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleteBusy(false)
    }
  }
  function runSearch(value, mode) {
    if (!value.trim()) return load('all')
    if (
      mode === 'id' &&
      (!/^\d+$/.test(value.trim()) || Number(value) > MAX_INTEGER)
    ) {
      requestRef.current?.abort()
      setSearchError(
        `Enter a product ID from 0 to ${MAX_INTEGER.toLocaleString('en')}.`,
      )
      setLoading(false)
      return
    }
    load(
      mode === 'name' ? 'name' : 'search',
      mode === 'name' ? value.trim() : Number(value),
    )
  }
  function queueSearch(value, mode = searchMode) {
    setSearch(value)
    setSearchMode(mode)
    setSearchError('')
    clearTimeout(searchTimer.current)
    requestRef.current?.abort()
    setLoading(true)
    // Cancel superseded reads immediately; wait briefly before issuing the next query.
    searchTimer.current = setTimeout(() => runSearch(value, mode), 350)
  }
  function submitSearch(e) {
    e.preventDefault()
    clearTimeout(searchTimer.current)
    runSearch(search, searchMode)
  }
  function showAll() {
    setSearchMode('id')
    selectView('all')
  }
  function selectView(nextView) {
    setSearch('')
    return load(nextView)
  }
  function refreshView() {
    const { view: nextView, query } = requestedView.current
    return load(nextView, query)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to inventory
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <a className="brand" href="#main" aria-label="StockRoom home">
            <span className="brand-symbol">
              <Box size={25} strokeWidth={1.7} />
            </span>
            <span>StockRoom</span>
          </a>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          <button
            aria-label="Dashboard"
            aria-current={view !== 'low' ? 'page' : undefined}
            className={view !== 'low' ? 'nav-item active' : 'nav-item'}
            onClick={showAll}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
            <span className="nav-dot" />
          </button>
          <button
            aria-label="Stock watch"
            aria-current={view === 'low' ? 'page' : undefined}
            className={view === 'low' ? 'nav-item active' : 'nav-item'}
            onClick={() => selectView('low')}
          >
            <TriangleAlert size={18} />
            <span>Stock watch</span>
            {lowCount != null && <span className="nav-count">{lowCount}</span>}
          </button>
        </nav>
        <ProjectResources className="sidebar-resources" />
      </aside>
      <div className="main-shell">
        <header className="project-header">
          <ProjectDetails onDocumentation={() => setDocumentation(true)} />
        </header>
        <main id="main">
          {error && (
            <div className="connection-alert" role="alert">
              <WifiOff size={21} />
              <div>
                <strong>
                  {base
                    ? 'We couldn’t refresh your inventory'
                    : 'Inventory API not connected'}
                </strong>
                <p>
                  {base ? error : 'Connect the API to load your inventory.'}
                  {all !== null
                    ? ' Displaying the last successful snapshot; values may be outdated.'
                    : ''}
                </p>
              </div>
              <button
                className="button small secondary"
                onClick={() => (base ? refreshView() : setHelp(true))}
                disabled={loading}
              >
                {base ? 'Retry connection' : 'Setup details'}
                <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <h1>Dashboard</h1>
          </div>
          <Dashboard
            products={all}
            stale={Boolean(error)}
            onLowStock={() => selectView('low')}
          />
          <section
            className="inventory-card"
            aria-labelledby="inventory-heading"
            aria-busy={loading}
          >
            <div className="inventory-heading">
              <div className="section-title inventory-title">
                <h2 id="inventory-heading">Currently Showing</h2>
                <p className="showing-summary" data-testid="showing-count">
                  {loading
                    ? 'Updating…'
                    : all === null
                      ? '— items'
                      : `${number(rows.length)} ${rows.length === 1 ? 'item' : 'items'}`}
                </p>
              </div>
              <button
                className="button primary add-product"
                onClick={() => setEditor({})}
              >
                <Plus size={17} />
                Add Product
              </button>
            </div>
            <div className="inventory-toolbar">
              <form
                className="search-form"
                role="search"
                onSubmit={submitSearch}
              >
                <select
                  aria-label="Search mode"
                  value={searchMode}
                  onChange={(e) => queueSearch(search, e.target.value)}
                >
                  <option value="id">By ID</option>
                  <option value="name">By name</option>
                </select>
                <div className="search-input">
                  <Search size={17} />
                  <input
                    aria-label={
                      searchMode === 'id'
                        ? 'Product ID to search'
                        : 'Product name to search'
                    }
                    aria-invalid={!!searchError}
                    aria-describedby={searchError ? 'search-error' : undefined}
                    inputMode={searchMode === 'id' ? 'numeric' : 'text'}
                    placeholder={
                      searchMode === 'id' ? 'Enter an ID…' : 'Enter a name…'
                    }
                    value={search}
                    onChange={(e) => queueSearch(e.target.value)}
                  />
                </div>
                <button
                  className="button search-button"
                  disabled={!search.trim()}
                >
                  Search by {searchMode === 'id' ? 'ID' : 'Name'}
                </button>
              </form>
              <div className="sort-controls">
                <button
                  className={`button tool ${view === 'id' ? 'selected' : ''}`}
                  aria-pressed={view === 'id'}
                  onClick={() => selectView('id')}
                  disabled={loading}
                >
                  <ArrowDownNarrowWide size={16} />
                  Sort by ID
                </button>
                <button
                  className={`button tool ${view === 'price' ? 'selected' : ''}`}
                  aria-pressed={view === 'price'}
                  onClick={() => selectView('price')}
                  disabled={loading}
                >
                  <ArrowUpDown size={16} />
                  Sort by Price
                </button>
                <button
                  className={`button tool ${view === 'lowest' ? 'selected' : ''}`}
                  aria-pressed={view === 'lowest'}
                  onClick={() => selectView('lowest')}
                  disabled={loading}
                >
                  <ChartNoAxesCombined size={16} />
                  Lowest Stock
                </button>
              </div>
            </div>
            {searchError && (
              <p id="search-error" className="search-error" role="alert">
                {searchError}
              </p>
            )}
            <ProductTable
              products={rows}
              loading={loading}
              loaded={all !== null}
              failed={!!error}
              onEdit={(p) => setEditor({ product: p })}
              onDelete={(p) => {
                setDeleting(p)
                setDeleteError('')
              }}
              onAdd={() => setEditor({})}
              onReset={showAll}
              view={view}
            />
            <div className="table-footer">
              <span role="status" aria-live="polite" aria-atomic="true">
                {loading ? (
                  'Updating inventory…'
                ) : all === null ? (
                  'Waiting for inventory data'
                ) : (
                  <>
                    {error ? 'Last successful view: ' : ''}
                    {view === 'all' ? (
                      `Showing ${number(rows.length)} of ${number(all.length)} products`
                    ) : (
                      <>
                        {viewLabels[view]}
                        {view === 'search' ? ` · #${activeSearch}` : ''}
                        {view === 'name' ? ` · “${activeSearch}”` : ''}
                        {` · ${number(rows.length)} ${rows.length === 1 ? 'result' : 'results'}`}
                      </>
                    )}
                  </>
                )}
              </span>
              <span>
                {error && all !== null
                  ? 'Last successful snapshot'
                  : updated
                    ? `Updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
              </span>
            </div>
          </section>
          <section className="insights-grid" aria-label="Inventory insights">
            <article className="health-card">
              <div className="section-title">
                <span className="health-symbol">
                  <Package size={20} />
                </span>
                <div>
                  <h2>Stock health</h2>
                </div>
              </div>
              <div className="health-summary">
                <strong>{all?.length ? `${healthPercent}%` : '—'}</strong>
                <span>
                  {all?.length
                    ? 'above minimum stock'
                    : all
                      ? 'Add products to see stock health'
                      : 'Connect to see stock health'}
                </span>
              </div>
              <div
                className={`health-track${all?.length ? '' : ' empty'}`}
                role="img"
                aria-label={
                  all?.length
                    ? `${healthyCount} products above minimum stock, ${lowCount} at or below minimum stock`
                    : 'No stock data available'
                }
              >
                <span style={{ width: `${healthPercent}%` }} />
              </div>
              <div className="health-legend">
                <span>
                  <i />
                  {all ? number(healthyCount) : '—'} above minimum
                </span>
                <span>
                  <i />
                  {all ? number(lowCount) : '—'} need attention
                </span>
              </div>
            </article>
            <article className="attention-card">
              <div className="section-title">
                <span className="health-symbol">
                  <ChartNoAxesCombined size={20} />
                </span>
                <h2>Stock review</h2>
              </div>
              <p>
                Find the product with the fewest units to review its stock
                level.
              </p>
              <button
                className="text-button"
                onClick={() => selectView('lowest')}
                disabled={loading}
              >
                Check Lowest Stock
                <ArrowUpRight size={17} />
              </button>
            </article>
          </section>
        </main>
      </div>
      <footer className="mobile-project-resources">
        <ProjectResources />
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {editor && (
        <ProductForm
          product={editor.product}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      {deleting && (
        <Dialog
          title="Delete Product"
          eyebrow="Inventory / Remove product"
          onClose={() => setDeleting(null)}
          busy={deleteBusy}
          className="delete-dialog"
        >
          <div className="delete-icon">
            <TriangleAlert size={26} />
          </div>
          <p className="dialog-description">
            Delete <strong>{deleting.name}</strong> (#{deleting.id}) from your
            inventory? This permanently removes the product and its stock
            record.
          </p>
          {deleteError && (
            <p className="inline-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="dialog-footer">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancel
            </button>
            <button
              className="button danger"
              onClick={remove}
              disabled={deleteBusy}
            >
              {deleteBusy && <LoaderCircle size={16} className="spin" />}
              {deleteBusy ? 'Deleting…' : 'Delete Product'}
            </button>
          </div>
        </Dialog>
      )}
      {help && (
        <Dialog
          title="Your workspace, connected"
          eyebrow="StockRoom / Connection guide"
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <p>
              StockRoom reads and saves products directly through your Inventory
              Optimization Engine. No sample inventory is used.
            </p>
            <div className="connection-detail">
              <span>API base URL</span>
              <code>{base || 'Not configured'}</code>
            </div>
            <h3>Local development</h3>
            <p>
              Start the Crow server on port 8080, then run{' '}
              <code>npm run dev</code>. Vite forwards local API requests to the
              server.
            </p>
            <h3>Public website</h3>
            <p>
              Set the GitHub repository variable <code>VITE_API_BASE_URL</code>{' '}
              to your public HTTPS backend URL, including <code>/api</code>,
              then rerun the deployment. The backend must allow this website’s
              origin through CORS.
            </p>
            <h3>Reading your stock</h3>
            <p>
              Low stock means quantity is at or below minimum stock. Dashboard
              totals always reflect the full inventory, even when viewing search
              or sorted results. Prices use your inventory’s currency; the API
              does not specify one.
            </p>
          </div>
          <div className="dialog-footer">
            <button className="button primary" onClick={() => setHelp(false)}>
              Got it
              <Check size={16} />
            </button>
          </div>
        </Dialog>
      )}
      {documentation && (
        <Documentation onClose={() => setDocumentation(false)} />
      )}
    </div>
  )
}
