# Mini E-Commerce Frontend

React frontend for the Ethereal Asteroid e-commerce backend.

Backend repo: `ethereal-asteroid/` (Django REST Framework + MySQL)

---

## Tech Stack

- React 19 + Vite
- React Router v7
- Tailwind CSS v4 + shadcn/ui
- Zustand (state management)
- Axios (API client with JWT interceptors)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set `VITE_API_BASE_URL` to your backend URL (default: `http://localhost:8000/api`).

### 3. Start development server

```bash
npm run dev
```

App runs at `http://localhost:5173`

> Make sure the Django backend is running at `http://localhost:8000` before starting the frontend.

---

## Project Structure

```
src/
├── api/
│   └── axios.js              # Axios instance with JWT interceptors + silent token refresh
├── components/
│   ├── ui/                   # shadcn/ui components (added via CLI as needed)
│   ├── layout/               # Navbar, Footer, AdminSidebar
│   └── shared/               # Reusable: ProductCard, Pagination, EmptyState, etc.
├── hooks/
│   ├── useAuth.js            # Thin wrapper over authStore
│   └── useCart.js            # Thin wrapper over cartStore
├── lib/
│   └── utils.js              # shadcn cn() utility
├── pages/
│   ├── auth/                 # Login, Register, ForgotPassword, ResetPassword
│   ├── catalog/              # ProductList, ProductDetail
│   ├── cart/                 # Cart (LocalStorage for guests)
│   ├── checkout/             # Checkout
│   ├── orders/               # Orders list, Order detail
│   ├── payment/              # Success, Failed, Cancelled redirect landing pages
│   ├── profile/              # Profile, addresses, GDPR
│   ├── wishlist/             # Wishlist
│   ├── admin/                # Admin panel pages (dashboard, products, orders, etc.)
│   └── NotFoundPage.jsx
├── store/
│   ├── authStore.js          # User, tokens, login/logout, 2FA confirm
│   ├── cartStore.js          # LocalStorage cart + backend sync on login
│   └── notificationStore.js  # Unread count, notification list
├── router/
│   └── index.jsx             # All routes, ProtectedRoute, AdminRoute, GuestOnlyRoute
├── App.jsx
├── main.jsx
└── index.css
```

---

## State Management

| Store | Persisted | Description |
|-------|-----------|-------------|
| `authStore` | `localStorage` | User, access token, refresh token; handles login, logout, 2FA |
| `cartStore` | `localStorage` (guest_cart) | Guest cart in LocalStorage; syncs to backend on login |
| `notificationStore` | Memory only | Unread count + notification list; fetched on demand |

---

## Authentication Flow

- Access token: **1 day** | Refresh token: **30 days**
- Axios interceptor silently refreshes expired access tokens using the refresh token
- Refresh token rotates on every refresh — new token is always stored
- If refresh fails (expired): user is logged out and redirected to `/login`
- 2FA: if login returns `requires_2fa: true`, tokens are NOT stored until `/auth/2fa/confirm/` succeeds

---

## Cart Behaviour

- **Guest users:** cart stored in `localStorage` under `guest_cart`
- **On login:** local cart is merged with backend cart and synced; `guest_cart` is cleared
- **Backend cart:** used as source of truth after login

---

## Docs

- [`docs/frontend_plan.md`](docs/frontend_plan.md) — page-to-API mapping, store schemas, routing plan, backend notes
- [`docs/api_reference.md`](docs/api_reference.md) — condensed API cheatsheet for all endpoints

---

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add dialog
# etc.
```

Components are added to `src/components/ui/`.
