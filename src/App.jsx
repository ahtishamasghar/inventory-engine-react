import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownNarrowWide,
  ArrowUpDown,
  ArrowUpRight,
  Box,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  CircleHelp,
  CodeXml,
  LayoutDashboard,
  LoaderCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings2,
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

  const load = useCallback(async (nextView = 'all', id = '') => {
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
      if (!controller.signal.aborted) setError(err.message)
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
    await load('all')
  }
  async function remove() {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await api.remove(deleting.id)
      setNotice(`${deleting.name} deleted successfully.`)
      setDeleting(null)
      await load('all')
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
    setSearch('')
    setSearchMode('id')
    load('all')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to inventory
      </a>
      <aside className="sidebar">
        <a className="brand" href="#main" aria-label="Stockroom home">
          <span className="brand-symbol">
            <Box size={25} strokeWidth={1.7} />
          </span>
          <span>
            stockroom<span className="brand-period">.</span>
            <small>INVENTORY ENGINE</small>
          </span>
        </a>
        <div className="workspace-badge">
          <span>IE</span>
          <div>
            Inventory workspace<small>Your operations, organized</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          <button
            aria-label="Overview"
            className={view !== 'low' ? 'nav-item active' : 'nav-item'}
            onClick={showAll}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
            <span className="nav-dot" />
          </button>
          <button
            aria-label="Stock watch"
            className={view === 'low' ? 'nav-item active' : 'nav-item'}
            onClick={() => load('low')}
          >
            <TriangleAlert size={18} />
            <span>Stock watch</span>
            {lowCount != null && <span className="nav-count">{lowCount}</span>}
          </button>
          <button
            aria-label="Connection"
            className="nav-item"
            onClick={() => setHelp(true)}
          >
            <Settings2 size={18} />
            <span>Connection</span>
            <ArrowUpRight size={15} />
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <ChartNoAxesCombined size={24} />
          </span>
          <h3>
            Less guesswork.
            <br />
            Better stock flow.
          </h3>
          <p>
            A little visibility goes a long way. Keep your inventory in balance.
          </p>
          <span className="note-rule" />
        </div>
        <button className="sidebar-help" onClick={() => setDocumentation(true)}>
          <CircleHelp size={18} />
          Workspace guide
          <ArrowUpRight size={15} />
        </button>
        <div className="sidebar-footer">
          <span className="user-avatar">IO</span>
          <div>
            Inventory operations<small>Dynamic optimization engine</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Overview</strong>
          </div>
          <nav className="project-resources" aria-label="Project resources">
            <a
              href="https://github.com/ahtishamasghar/inventory-optimization-engine"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Backend source code (opens in a new tab)"
            >
              <CodeXml size={15} />
              <span>Source code</span>
            </a>
            <button
              onClick={() => setDocumentation(true)}
              aria-haspopup="dialog"
            >
              <BookOpen size={15} />
              <span>Documentation</span>
            </button>
          </nav>
          <div
            className={`connection-pill ${error || !base ? 'offline' : loading ? 'connecting' : 'online'}`}
          >
            <i />
            {loading
              ? 'Connecting'
              : !base
                ? 'API not configured'
                : error
                  ? 'Connection needs attention'
                  : all === null
                    ? 'Waiting for inventory'
                    : 'API connected'}
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">A CLEAR VIEW OF WHAT’S IN STORE</div>
              <h1>
                Inventory overview<span>.</span>
              </h1>
              <p>Everything in its place. Every product accounted for.</p>
            </div>
            <button
              className="button primary add-product"
              onClick={() => setEditor({})}
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
          {error && (
            <div className="connection-alert" role="alert">
              <WifiOff size={21} />
              <div>
                <strong>
                  {base
                    ? 'We couldn’t refresh your inventory'
                    : 'Connect your inventory API'}
                </strong>
                <p>
                  {error}
                  {all !== null
                    ? ' Displaying the last successful snapshot; values may be outdated.'
                    : ''}
                </p>
              </div>
              <button
                className="button small secondary"
                onClick={() =>
                  base ? load(view, activeSearch) : setHelp(true)
                }
                disabled={loading}
              >
                {base ? 'Retry connection' : 'Setup details'}
                <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          <Dashboard
            products={all}
            stale={Boolean(error)}
            onLowStock={() => load('low')}
          />
          <section
            className="inventory-card"
            aria-labelledby="inventory-heading"
            aria-busy={loading}
          >
            <div className="inventory-heading">
              <div className="section-title">
                <h2 id="inventory-heading">Your inventory</h2>
                <span className="count-chip">
                  {all === null ? '—' : number(all.length)} products
                </span>
              </div>
              <button
                className="text-button"
                onClick={() => load(view, activeSearch)}
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} />
                {loading ? 'Refreshing…' : 'Refresh'}
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
                    aria-describedby={
                      searchError ? 'search-error search-hint' : 'search-hint'
                    }
                    inputMode={searchMode === 'id' ? 'numeric' : 'text'}
                    placeholder={
                      searchMode === 'id'
                        ? 'Find a product by ID…'
                        : 'Search all or part of a name…'
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
                  onClick={() => load('id')}
                  disabled={loading}
                >
                  <ArrowDownNarrowWide size={16} />
                  Sort by ID
                </button>
                <button
                  className={`button tool ${view === 'price' ? 'selected' : ''}`}
                  aria-pressed={view === 'price'}
                  onClick={() => load('price')}
                  disabled={loading}
                >
                  <ArrowUpDown size={16} />
                  Sort by Price
                </button>
                <button
                  className={`button tool ${view === 'lowest' ? 'selected' : ''}`}
                  aria-pressed={view === 'lowest'}
                  onClick={() => load('lowest')}
                  disabled={loading}
                >
                  <ChartNoAxesCombined size={16} />
                  Lowest Stock
                </button>
              </div>
            </div>
            <p id="search-hint" className="search-hint">
              Results update as you type. Name search matches any part of a
              name.
            </p>
            {searchError && (
              <p id="search-error" className="search-error" role="alert">
                {searchError}
              </p>
            )}
            <div className="view-bar">
              <span role="status" aria-live="polite" aria-atomic="true">
                <span className="view-dot" />
                {viewLabels[view]}
                {view === 'search' ? ` · #${activeSearch}` : ''}
                {view === 'name' ? ` · “${activeSearch}”` : ''}
                {all !== null && !loading
                  ? ` · ${number(rows.length)} ${rows.length === 1 ? 'result' : 'results'}`
                  : ''}
              </span>
              <button className="text-button" onClick={showAll}>
                Show All Products{view !== 'all' && <X size={13} />}
              </button>
            </div>
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
              <span>
                {all === null
                  ? 'Waiting for inventory data'
                  : `Showing ${number(rows.length)} of ${number(all.length)} products`}
              </span>
              <span>
                {error && all !== null
                  ? 'Last successful snapshot'
                  : updated
                    ? `Updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Your API is the source of truth'}
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
                  <p>A quick pulse on your inventory.</p>
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
                className="health-track"
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
              <div>
                <span className="eyebrow">
                  A SMALL CHECK. A BIG DIFFERENCE.
                </span>
                <h2>
                  Stay one step ahead
                  <br />
                  of your next stockout.
                </h2>
                <p>Find your lowest-stock product and plan your next move.</p>
                <button
                  className="text-button"
                  onClick={() => load('lowest')}
                  disabled={loading}
                >
                  Check Lowest Stock
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="box-art" aria-hidden="true">
                <Box size={94} strokeWidth={0.8} />
                <span className="art-ring" />
              </div>
            </article>
          </section>
          <ProjectDetails onDocumentation={() => setDocumentation(true)} />
          <footer className="page-footer">
            <span>
              STOCKROOM <i /> Built for better inventory decisions.
            </span>
            <span>DSA Finals Project · Group 12</span>
          </footer>
        </main>
      </div>
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
          eyebrow="Stockroom / Connection guide"
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <p>
              Stockroom reads and saves products directly through your Inventory
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
