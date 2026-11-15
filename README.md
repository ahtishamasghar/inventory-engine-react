# Stockroom · Inventory Optimization Engine

A React + Vite inventory workspace for the existing C++17 Crow Inventory Optimization Engine. Designed around clear stock visibility, fast product maintenance, and explicit connection feedback.

**Website:** https://ahtishamasghar.github.io/inventory-engine-react/  
**Deployment runs:** https://github.com/ahtishamasghar/inventory-engine-react/actions

## Features

- Add, edit, and delete products, with validation and a destructive-action confirmation.
- Show all products, search by exact ID, sort by ID, sort by price, and find lowest stock through the real backend endpoints.
- Dashboard totals for products, stock units, low-stock products, and categories, plus a stock-health visualization.
- Low-stock watch view, refresh, loading and empty states, server-error messages, and last-successful-snapshot labeling when a refresh fails.
- Responsive layout, keyboard-operable native dialogs, focus restoration, screen-reader labels, reduced-motion support, and self-hosted SVG assets.
- No runtime fixtures, simulated inventory, offline writes, client-side replacements for backend sorting/search algorithms, or fabricated statistics.

## Requirements and local development

Use Node.js **22.12 or later** (Node **24** is used in CI) and npm. Versions are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

Open the development server's `/inventory-engine-react/` path. The default local API base is `/api`. Vite proxies those requests to the existing Crow server at `http://127.0.0.1:8080`, so local browser CORS is not an obstacle. Run the backend separately using its own build instructions. This repository contains no backend modifications.

To use a different API, create an ignored `.env.local`:

```dotenv
VITE_API_BASE_URL=https://your-api.example.com/api
```

The base URL **includes `/api`** and has no trailing endpoint such as `/products`. Restart Vite after changing environment variables. `VITE_` values are public, embedded at build time, and must never contain secrets. The frontend does not assume a currency because the backend model does not provide one; prices are displayed as numbers with two decimal places.

## Backend contract

Validated against `ahtishamasghar/inventory-optimization-engine`, commit `0e00949203b7df43f0b7fa14490ac8cff245cafd`, specifically `backend/main.cpp`, `inventory_engine.hpp`, and `models/product.hpp`. The current reference checkout does not contain the requested `frontend_vanila` directory.

| Action            | Method and path                     | Response / implementation                                            |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Show All Products | `GET /api/products`                 | `{ "products": [...] }`, hash table inventory                        |
| Search by ID      | `GET /api/products/{id}`            | Product object; hash table lookup; 404 if absent                     |
| Sort by ID        | `GET /api/products/sorted-by-id`    | Product list; BST in-order traversal                                 |
| Sort by Price     | `GET /api/products/sorted-by-price` | Product list; merge sort                                             |
| Lowest Stock      | `GET /api/products/lowest-stock`    | Product object; min heap; 404 when empty                             |
| Add Product       | `POST /api/products`                | All six fields; 201 plain text on success                            |
| Edit Product      | `PUT /api/products/{id}`            | Product fields; 200 plain text on success; ID is immutable in the UI |
| Delete Product    | `DELETE /api/products/{id}`         | 200 plain text on success                                            |
| Backend health    | `GET /api/health`                   | `{ "status": "ok", "service": "Inventory Optimization Engine" }`     |

The API also exposes name search, which is not required by this frontend. A product uses:

```json
{
  "id": 1001,
  "name": "Product name",
  "category": "Category",
  "price": 12.5,
  "quantity": 20,
  "minStock": 5
}
```

ID, quantity, and minimum stock must be integers between 0 and 2,147,483,647. Price must be finite and nonnegative. The form requires nonblank name and category. Errors from Crow's plain-text responses are surfaced directly; failed writes never report success. Requests time out after 15 seconds, and superseded read requests are cancelled.

Low stock means **`quantity < minStock`**. A quantity equal to its minimum is within threshold. Zero quantity with zero minimum is labeled “No stock” but is not below minimum. Dashboard totals are calculated from the complete `/products` response, independently of the active view. Read operations can span separate API requests; concurrent external writes may change inventory between those responses. Failed refreshes retain and explicitly label the last successful snapshot.

## Production API configuration

The frontend builds and deploys successfully without a backend URL. In that case, the public page shows an API setup message and unknown statistics (`—`), not zeros or fictional inventory.

For live inventory:

1. Host the existing Crow API behind a publicly reachable **HTTPS** endpoint.
2. Configure its gateway or backend CORS policy for the exact website origin **`https://ahtishamasghar.github.io`** (no repository path). Allow `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, and the `Content-Type` header. A gateway must handle preflight and avoid duplicate/conflicting CORS headers.
3. In the frontend repository, open **Settings → Secrets and variables → Actions → Variables**, and set **`VITE_API_BASE_URL`** to the public URL ending in `/api`.
4. Run **Deploy Stockroom to GitHub Pages** again from Actions, or push to `main`.

The inspected backend currently binds to `127.0.0.1:8080` and allows only `http://127.0.0.1:5500` via CORS. A reverse proxy on the backend host can expose the unchanged loopback service and supply the required HTTPS/CORS behavior. Those hosting changes are outside this frontend repository. The inspected API has no authentication; choose an access policy at the hosting gateway before exposing inventory writes publicly. The frontend does not invent an authentication contract.

Production rejects missing, insecure HTTP, credential-bearing, and common loopback API URLs. Root-relative API paths are supported for a deployment with a same-origin API, but GitHub Pages itself does not host `/api`. The local Vite proxy is development-only and is not deployed to Pages.

## Build and deployment

```sh
npm run build
npm run preview
```

Vite's base is `/inventory-engine-react/`. JavaScript, CSS, and the SVG favicon are emitted with the repository prefix. System fonts and Lucide SVG icons avoid external font/image services. There are no nested client routes requiring a Pages fallback.

`.github/workflows/deploy.yml` runs on pushes to `main`, pull requests to `main`, and manual dispatch. It checks out the repository, sets up Node 24, runs `npm ci`, unit/contract tests, and desktop/mobile browser checks, then builds and uploads `dist/`. A separate least-privilege deployment job publishes through `actions/deploy-pages`. Pull requests validate the build without publishing.

GitHub Pages must use **GitHub Actions** as its source. The deployment job uses the `github-pages` environment with `pages: write` and `id-token: write`. Production API configuration comes from the Actions repository variable; `.env.local` is never committed.

## Tests

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

- Node tests cover validation boundaries, statistics, exact API routes/methods, response validation, cancellation, and request failures.
- Playwright tests exercise all required actions on desktop and mobile, check layout overflow, modal focus, pending and empty states, failed requests/writes, and automated WCAG A/AA checks on the dashboard and editor.
- Browser tests use explicit intercepted fixtures only under `tests/`; production code never imports them.
- If using an existing system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.

An optional live integration test exercises the **actual Crow server** via the running Vite proxy. Use a disposable backend with a copied storage file outside the backend checkout. The test creates one randomly named product, verifies create/update/search/sort/lowest/delete through the UI and API, and cleans up its product even on failure. Never point it at production:

```sh
REAL_API_BASE_URL=http://127.0.0.1:8080/api \
ALLOW_DISPOSABLE_API_WRITES=1 \
node tests/real-backend.mjs
```

During implementation, the unchanged reference `main.cpp` was compiled with C++17, Crow v1.2.1, and standalone Asio 1.30.2 in temporary directories; its storage file was copied into a disposable working directory. No backend tracked or untracked files were changed.

## Code map

- `src/App.jsx`: workspace state, cancellable reads, views, and mutations.
- `src/api.js`: URL validation, fetch transport, error handling, and response contracts.
- `src/domain.js`: form validation, payload conversion, number display, and statistics.
- `src/components/`: dashboard, product table, native dialog, and product editor.
- `src/styles.css`: responsive visual system with reduced-motion support.
- `tests/`: unit, browser, accessibility, and opt-in live integration checks.

Runtime dependencies: React, React DOM, Lucide React. Development dependencies: Vite, its React plugin, Playwright, axe-core's Playwright integration, and Prettier. No external database or service is required to build the static frontend.
