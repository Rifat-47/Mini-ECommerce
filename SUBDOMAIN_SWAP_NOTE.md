# Production: Swap to Subdomain-Based Store Detection

## Current (development): URL path `/s/:storeSlug`

Visiting `http://localhost:5173/s/tuhura-fashion` saves the slug to localStorage and
activates that store's frontend. All API calls then include `X-Store-Slug: tuhura-fashion`.

## Target (production): Subdomain detection

Each store gets its own subdomain: `tuhura-fashion.yourplatform.com`

### Step 1 — Replace `src/utils/storeSlug.js`

```js
export function getStoreSlug() {
  const host = window.location.hostname        // e.g. tuhura-fashion.yourplatform.com
  const parts = host.split('.')
  const isApexOrWww = parts.length < 3 || parts[0] === 'www'
  if (isApexOrWww) return import.meta.env.VITE_STORE_SLUG || null
  return parts[0]                              // subdomain = store slug
}

export function isPlatformMode() {
  return !getStoreSlug()
}

// setStoreSlug / clearStoreSlug no longer needed — remove usages
export function setStoreSlug() {}
export function clearStoreSlug() {}
```

### Step 2 — Remove the `/s/:storeSlug` route from `router/index.jsx`

Delete the `StoreRedirect` component and the `{ path: '/s/:storeSlug', element: <StoreRedirect /> }` entry.

### Step 3 — Django: update ALLOWED_HOSTS and CORS

In `ecommerce_backend/settings.py`, allow wildcard subdomains:

```python
ALLOWED_HOSTS = ['yourplatform.com', '.yourplatform.com', ...]
CORS_ALLOWED_ORIGIN_REGEXES = [r'^https://[\w-]+\.yourplatform\.com$']
```

### Step 4 — DNS / hosting

Configure a wildcard DNS record: `*.yourplatform.com → your server IP`

Platform admin lives at the apex domain: `yourplatform.com` (no subdomain → no slug → platform mode).
