import { ArrowUpRight, BookOpen, Check, CodeXml } from 'lucide-react'
import Dialog from './Dialog.jsx'

const operations = [
  [
    'Find an ID',
    'Hash Table',
    'Retrieves the product with the exact ID you enter.',
  ],
  [
    'Find a name',
    'Name search',
    'Searches product names on the server using case-insensitive partial matching.',
  ],
  [
    'Sort by ID',
    'Binary Search Tree',
    'Returns products in ascending ID order through an in-order traversal.',
  ],
  ['Sort by Price', 'Merge Sort', 'Returns products in ascending price order.'],
  [
    'Lowest Stock',
    'Min Heap',
    'Returns one product with the smallest quantity, even if it is above its minimum stock.',
  ],
]

export default function Documentation({ onClose }) {
  return (
    <Dialog
      title="Workspace documentation"
      eyebrow="Stockroom / Project guide"
      onClose={onClose}
      className="documentation-dialog"
    >
      <div className="help-content documentation-content">
        <p>
          Stockroom is the React workspace for the{' '}
          <strong>Dynamic Inventory Optimization Engine</strong>, a C++17 Crow
          project built by Group 12. All product operations use the existing
          inventory API.
        </p>
        <section aria-labelledby="guide-workflow">
          <h3 id="guide-workflow">Make the most of your workspace</h3>
          <ol className="guide-steps">
            <li>
              <strong>Build your catalog.</strong> Choose Add Product and enter
              a unique ID, name, category, price, quantity, and minimum stock.
              Save Product sends the record to the API; Cancel leaves it
              untouched.
            </li>
            <li>
              <strong>Find what you need.</strong> Choose By ID or By name.
              Results update after a brief pause in typing, or use the search
              button to search immediately. Clear the input or select Show All
              Products to reset the view.
            </li>
            <li>
              <strong>Keep records current.</strong> Use the pencil to edit a
              product or the trash icon to delete it. IDs stay fixed during
              edits, and deletion always asks for confirmation.
            </li>
            <li>
              <strong>Review stock.</strong> Stock watch shows every product at
              or below its minimum. Lowest Stock selects the product with the
              fewest units. These views answer different questions.
            </li>
          </ol>
        </section>
        <section aria-labelledby="guide-stock">
          <h3 id="guide-stock">Understand the numbers</h3>
          <p>
            Total Products counts records; Total Stock adds their quantities.
            Low Stock Products counts quantities <strong>at or below</strong>{' '}
            their minimum, including zero quantity with a zero minimum. Stock
            health measures the share strictly above minimum. Dashboard totals
            always describe the full inventory, even while a search is active.
          </p>
          <p>
            Prices use your inventory’s currency; the API does not define one.
            If a connection fails, a visible warning marks any retained data as
            a previous snapshot.
          </p>
        </section>
        <section aria-labelledby="guide-engine">
          <h3 id="guide-engine">Inside the engine</h3>
          <p>
            Search, sorting, and lowest-stock selection run in the C++ backend.
          </p>
          <dl className="algorithm-list">
            {operations.map(([action, algorithm, description]) => (
              <div key={action}>
                <dt>
                  <strong>{action}</strong>
                  <span>{algorithm}</span>
                </dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="guide-resources">
          <h3 id="guide-resources">Source code & technical setup</h3>
          <p>
            Review the source or use the README for local setup, API
            configuration, testing, and GitHub Pages deployment.
          </p>
          <div className="resource-links">
            <a
              href="https://github.com/ahtishamasghar/inventory-engine-react"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CodeXml size={16} />
              React frontend
              <span className="sr-only"> (opens in a new tab)</span>
              <ArrowUpRight size={14} />
            </a>
            <a
              href="https://github.com/ahtishamasghar/inventory-optimization-engine"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CodeXml size={16} />
              C++ backend<span className="sr-only"> (opens in a new tab)</span>
              <ArrowUpRight size={14} />
            </a>
            <a
              href="https://github.com/ahtishamasghar/inventory-engine-react#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen size={16} />
              Setup README<span className="sr-only"> (opens in a new tab)</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        </section>
      </div>
      <div className="dialog-footer">
        <button className="button primary" onClick={onClose}>
          Got it
          <Check size={16} />
        </button>
      </div>
    </Dialog>
  )
}
