# SaaS Multi-Tenant Migration Plan

**Created:** 2026-04-25  
**Scope:** Transform single-store e-commerce app into a multi-tenant SaaS platform  
**Strategy:** Shared database, store-scoped data (Option A)  
**Estimated effort:** Large — touches every model, every view, and the entire auth system

---

## Architecture Overview

```
                        ┌─────────────────────────────┐
                        │     Platform Root Admin      │
                        │  (you — manages all stores)  │
                        └────────────┬────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
     ┌────────▼──────┐      ┌────────▼──────┐      ┌───────▼───────┐
     │   Store A     │      │   Store B     │      │   Store C     │
     │  (Tenant 1)   │      │  (Tenant 2)   │      │  (Tenant 3)   │
     │               │      │               │      │               │
     │ store_owner   │      │ store_owner   │      │ store_owner   │
     │ store_admin   │      │ store_admin   │      │ store_admin   │
     │ customers     │      │ customers     │      │ customers     │
     └───────────────┘      └───────────────┘      └───────────────┘
```

### Tenant Identification Strategy

Each store gets a **subdomain**:
- `store-slug.shoply.com` → identifies the tenant
- API requests carry `X-Store-Slug` header (for non-browser clients)
- Fallback: URL prefix `/api/s/{slug}/` for simpler single-server deploys

**Recommended for your Render setup:** subdomain-based with a wildcard DNS record.  
During development: use `X-Store-Slug` header (easy to test with Postman).

---

## Role Hierarchy (Final)

| Role | Model | Scope | Can Do |
|------|-------|-------|--------|
| `platform_admin` | `User` | Platform-wide | Create/suspend/delete stores, view all analytics |
| `store_owner` | `User` + `StoreMembership` | One store | Full control — settings, staff, products, orders |
| `store_admin` | `User` + `StoreMembership` | One store | Day-to-day store operations |
| *(customer)* | `Customer` (separate model) | One store | Shop, cart, orders, wishlist — scoped to the store they registered at |

**Key decisions:**
- `User` model (global, unique email) covers platform_admin, store_owner, store_admin
- `Customer` is a completely separate model (extends `AbstractBaseUser`) — same email allowed at different stores
- `customer` role removed from `User.ROLE_CHOICES` entirely
- Old roles mapped: `superadmin` → `store_owner`, `admin` → `store_admin`

---

## New `stores` App

This is the core of the SaaS layer. Everything else is tenant-scoped through it.

### Models

```python
# stores/models.py

class Store(models.Model):
    STATUS_CHOICES = (('active', 'Active'), ('suspended', 'Suspended'), ('deleted', 'Deleted'))

    name          = models.CharField(max_length=100)
    slug          = models.SlugField(unique=True)           # used in subdomain/header
    owner         = models.ForeignKey(User, on_delete=models.PROTECT, related_name='owned_stores')
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    custom_domain = models.CharField(max_length=255, blank=True, default='')  # e.g. shop.mybrand.com
    logo          = models.ImageField(upload_to='store_logos/', null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

class StoreSettings(models.Model):
    """Per-store equivalent of the current SiteSettings singleton."""
    store                        = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='settings')
    store_name                   = models.CharField(max_length=100)
    support_email                = models.EmailField()
    currency                     = models.CharField(max_length=10, default='BDT')
    tax_rate                     = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    return_window_days           = models.PositiveIntegerField(default=7)
    free_shipping_threshold      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    birthday_coupon_enabled      = models.BooleanField(default=True)
    birthday_coupon_discount     = models.PositiveIntegerField(default=20)
    birthday_coupon_validity_days= models.PositiveIntegerField(default=30)
    cod_enabled                  = models.BooleanField(default=True)
    online_payment_enabled       = models.BooleanField(default=True)
    cod_min_order_value          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    email_notifications_enabled  = models.BooleanField(default=True)
    registration_enabled         = models.BooleanField(default=True)
    max_login_attempts           = models.PositiveIntegerField(default=5)
    lockout_minutes              = models.PositiveIntegerField(default=15)

class StoreMembership(models.Model):
    """Links a user to a store with a role. Replaces the role field on User for store-level access."""
    ROLE_CHOICES = (('store_owner', 'Store Owner'), ('store_admin', 'Store Admin'))

    store   = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='memberships')
    user    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='store_memberships')
    role    = models.CharField(max_length=20, choices=ROLE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('store', 'user')
```

---

## Models That Need a `store` FK

Every model that holds store-specific data gets `store = models.ForeignKey(Store, on_delete=models.CASCADE)`.

| App | Model | Notes |
|-----|-------|-------|
| catalog | Category | Per-store categories |
| catalog | Product | Per-store products |
| catalog | ProductImage | Cascades from Product |
| catalog | Review | User reviews a product in context of a store |
| catalog | StockMovement | Per-store stock history |
| orders | Coupon | Per-store coupons |
| orders | Order | Per-store orders |
| orders | OrderItem | Cascades from Order |
| orders | ReturnRequest | Cascades from Order |
| cart | CartItem | User's cart in a specific store |
| cart | WishlistItem | User's wishlist in a specific store |
| notifications | Notification | Per-store notifications |
| users | AuditLog | Per-store audit trail |
| config | SiteSettings | **Replaced by StoreSettings** — delete this model |

---

## Tenant Middleware

A single middleware that resolves the current store from every request and attaches it to `request.store`. Views and querysets use `request.store` to scope all data.

```python
# stores/middleware.py

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        store = self._resolve_store(request)
        request.store = store  # None for platform-admin routes
        return self.get_response(request)

    def _resolve_store(self, request):
        # 1. Subdomain: store-slug.shoply.com
        host = request.get_host().split(':')[0]
        parts = host.split('.')
        if len(parts) >= 3:
            slug = parts[0]
            try:
                return Store.objects.get(slug=slug, status='active')
            except Store.DoesNotExist:
                pass

        # 2. Header (Postman / mobile clients)
        slug = request.headers.get('X-Store-Slug')
        if slug:
            try:
                return Store.objects.get(slug=slug, status='active')
            except Store.DoesNotExist:
                pass

        return None
```

---

## URL Structure

```
# Platform-level (no store context needed)
/api/platform/stores/          → CRUD stores (platform_admin only)
/api/platform/stores/{id}/     → Store detail
/api/platform/stats/           → Cross-store analytics

# Auth (store-scoped — register/login creates/uses account within a store)
/api/auth/register/
/api/auth/login/
/api/auth/token/refresh/

# All existing endpoints stay the same — store context comes from middleware
/api/products/
/api/orders/
/api/categories/
...
```

Platform admin routes are served from the root domain (`shoply.com`) or a dedicated subdomain (`admin.shoply.com`). Store routes are served from `{slug}.shoply.com`.

---

## Frontend Changes

### New Platform Admin App

A completely new set of pages, separate from the current store admin UI:

```
src/pages/platform/
├── PlatformDashboard.jsx    # All stores overview, revenue, signups
├── StoresPage.jsx           # Table of all stores — create / suspend / delete
├── StoreDetailPage.jsx      # Per-store deep-dive — owner info, stats, settings
└── PlatformSettingsPage.jsx # Platform-level config (pricing plans, features)
```

### Store Routing

The frontend needs to know which store it's serving. Two options:

**Option A — One frontend deployment per store** (current approach, simplest)  
Each store owner deploys their own frontend with `VITE_STORE_SLUG` set as a build env var. The frontend sends `X-Store-Slug` header on every API request.

**Option B — One frontend, subdomain-aware**  
The frontend reads `window.location.hostname` to extract the slug and sends it as a header. One Render static site serves all stores.

**Recommendation: Option A first** (no code change to routing, just add the header), migrate to Option B as you grow.

### Axios Change

Add store slug header to every request:

```javascript
// axios.js
const storeSlug = import.meta.env.VITE_STORE_SLUG

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: storeSlug ? { 'X-Store-Slug': storeSlug } : {},
})
```

### Auth Store Change

Store the current store's context (slug, name, settings) after login so components can display store branding.

---

## Implementation Phases

### Phase 1 — Foundation (Backend) ✅ COMPLETE
*Do this first — everything else depends on it.*

- [x] Create `stores` app with `Store`, `StoreSettings`, `StoreMembership` models
- [x] Create `customers` app with `Customer` (AbstractBaseUser), `CustomerAddress` models
- [x] Add `platform_admin` to `User.ROLE_CHOICES`, rename superadmin→store_owner, admin→store_admin, remove customer role
- [x] Write and register `TenantMiddleware` (subdomain + X-Store-Slug header)
- [x] Write `IsPlatformAdmin`, `IsStoreOwner`, `IsStoreAdmin`, `IsStoreMember` permission classes in `stores/permissions.py`
- [x] Update `users/permissions.py` — renamed to `IsStoreAdmin`/`IsStoreOwner`, old names kept as aliases
- [x] Update all hardcoded role strings across all views (catalog, orders, payments, config, users)
- [x] Add `X-Store-Slug` to `CORS_ALLOW_HEADERS`
- [x] Migrations generated and verified (`manage.py check` — 0 issues)

### Phase 2 — Model Migration ✅ COMPLETE
*Add `store` FK to every tenant-scoped model.*

- [x] Add nullable `store` FK to: Category, Product, Review, StockMovement
- [x] Add nullable `store` FK to: Coupon, Order, CartItem, WishlistItem
- [x] Add nullable `store` FK to: Notification, AuditLog
- [x] `Coupon.code` changed from globally unique → `unique_together = ('store', 'code')`
- [x] CartItem/WishlistItem `unique_together` updated to `('store', 'user', 'product')`
- [x] Migrations generated for all 5 apps, `manage.py check` — 0 issues
- [ ] Queryset filtering (`filter(store=request.store, ...)`) — applied per-view in Phase 3+
- [ ] `config.SiteSettings` replacement with `store.settings` — Phase 3+

### Phase 3 — Platform Admin API ✅ COMPLETE
*Root admin endpoints for managing stores.*

- [x] `GET /api/platform/stores/` — list all stores with KPIs (customer count, order count, revenue)
- [x] `POST /api/platform/stores/` — create store + owner User + StoreMembership + StoreSettings + send invite email
- [x] `GET /api/platform/stores/{id}/` — store detail with settings and memberships
- [x] `PATCH /api/platform/stores/{id}/` — update store (name, custom_domain, logo)
- [x] `DELETE /api/platform/stores/{id}/` — soft delete (status='deleted')
- [x] `POST /api/platform/stores/{id}/suspend/` — suspend a store
- [x] `POST /api/platform/stores/{id}/activate/` — reactivate a store
- [x] `GET /api/platform/stats/` — aggregate stats (stores, customers, orders, revenue)
- [x] `stores/management/commands/create_platform_admin.py` — CLI to bootstrap the root admin
- [x] `PLATFORM_FRONTEND_URL` setting added (invite email link target)
- [x] All 5 URL patterns verified — `manage.py check` 0 issues

**Store creation flow:**
1. Platform admin POSTs name + slug + owner_email
2. User (store_owner) created with unusable password
3. StoreSettings auto-created with store name
4. StoreMembership created linking owner to store
5. Invite email sent with set-password link (24h token, same mechanism as forgot-password)

### Phase 4 — Customer Auth (Backend) ✅ COMPLETE

**New files:**
- `customers/authentication.py` — `CustomerJWTAuthentication`: decodes JWT, checks `customer_id` claim, validates store context, checks cache-based blacklist
- `customers/permissions.py` — `IsAuthenticatedCustomer`: `isinstance(request.user, Customer)`
- `customers/serializers.py` — register, login, profile, change-password, address serializers
- `customers/views.py` — 12 views covering full auth + profile + address lifecycle
- `customers/urls.py` — 11 URL patterns

**Endpoints (all under `/api/customer/`):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `register/` | Create customer account for current store |
| POST | `login/` | Authenticate, returns access + refresh JWT |
| POST | `logout/` | Blacklist refresh token in cache |
| POST | `token/refresh/` | Issue new access token from refresh token |
| POST | `forgot-password/` | Send reset link to customer email |
| POST | `reset-password/<uid>/<token>/` | Confirm password reset |
| GET/PATCH | `profile/` | View and update customer profile |
| POST | `profile/change-password/` | Change password (requires old password) |
| GET/POST | `addresses/` | List and create addresses |
| GET/PATCH/DELETE | `addresses/<id>/` | Address detail |
| PATCH | `addresses/<id>/set-default/` | Set default shipping/billing address |

**Key design decisions:**
- Customer tokens carry `customer_id` + `store_id` claims — no `user_id`, cannot be used on staff endpoints
- Token blacklist uses Django cache (works with LocMemCache in dev, Redis in prod)
- Store owner invite flow uses `FRONTEND_URL`; customer reset uses same — frontend route `/customer-reset-password/{uid}/{token}/` needed in Phase 5
- Lockout settings read from `store.settings` (per-store configurable)
- `manage.py check` — 0 issues, all 11 URLs verified

### Phase 5 — Frontend: Axios + Auth + Platform Admin UI ✅ COMPLETE

**axios.js:**
- `X-Store-Slug` header attached to every request when `VITE_STORE_SLUG` is set
- Token refresh endpoint switches between `/auth/token/refresh/` (staff) and `/customer/token/refresh/` (customer) based on `session_type` in localStorage

**authStore.js:**
- Renamed `isAdmin()` → checks `['store_admin', 'store_owner']`
- Renamed `isSuperAdmin()` → `isStoreOwner()` checks `'store_owner'`
- Added `isPlatformAdmin()` checks `'platform_admin'`
- `session_type` persisted to localStorage on login

**Role strings fixed across frontend:**
- `AdminSidebar.jsx`, `MobileAdminNav.jsx`, `Navbar.jsx`
- `AdminManagementPage.jsx`, `UsersPage.jsx`, `SettingsPage.jsx`
- `isSuperAdmin` → `isStoreOwner` in `AdminManagementPage.jsx`

**router/index.jsx:**
- `isPlatformMode` flag: `!import.meta.env.VITE_STORE_SLUG`
- `PlatformRoute` guard: requires `platform_admin` role
- `StoreOwnerRoute` replaces `SuperAdminRoute`
- `GuestOnlyRoute` redirects `platform_admin` to `/platform` after login
- Store admin + customer pages conditionally excluded in platform mode
- Platform mode root `/` redirects to `/platform`

**New files:**
- `components/layout/PlatformLayout.jsx`
- `components/shared/PlatformSidebar.jsx` — collapsible, matches AdminSidebar design
- `pages/platform/PlatformDashboard.jsx` — stats cards + recent stores + suspended alert
- `pages/platform/StoresPage.jsx` — full table, create dialog (slug auto-gen), suspend/activate/delete
- `pages/platform/StoreDetailPage.jsx` — KPIs, edit name/domain, staff members, settings preview

**Build:** `npm run build` — ✅ 0 errors

### Phase 6 — Store Onboarding Flow ✅ COMPLETE

- [x] Store creation wizard — 2-step dialog in `StoresPage.jsx` (step 1: identity + owner; step 2: currency, tax rate, support email, payment toggles)
- [x] Auto-create `StoreSettings` on store creation — `post_save` signal in `stores/signals.py` registered via `stores/apps.py`; view also calls `update_or_create` with initial settings from the wizard
- [x] Auto-assign `store_owner` membership to the owner user — already done in Phase 3 view; signal acts as safety net
- [x] Email notification to store owner on creation — invite email with set-password link already implemented in Phase 3

**New files:** `stores/signals.py`  
**Modified files:** `stores/apps.py`, `stores/serializers.py` (initial settings fields), `stores/views.py` (apply initial settings), `StoresPage.jsx` (2-step wizard)

### Phase 7 — Hardening ✅ COMPLETE

- [x] Query-level tenant isolation — `store=request.store` filter applied to all store-scoped views: `CategoryViewSet`, `ProductViewSet`, `ProductImageListCreateView`, `ProductImageDetailView`, `ReviewListCreateView`, `ReviewDetailView`, `ProductSuggestionsView`, `AdminProductBulkUpdateView`, `AdminProductExportView`, `StockHistoryView`, `StockAdjustView`, `OrderViewSet`, `AdminCouponViewSet`, `PublicCouponListView`, `AdminReturnListView`, `AdminReturnDetailView`, `CartListCreateView`, `CartItemDetailView`, `WishlistListCreateView`, `WishlistItemDetailView`, `WishlistMoveToCartView`
- [x] Tenant isolation tests — `stores/tests/test_tenant_isolation.py` (8 tests covering categories, products, orders, coupons, cart, wishlist)
- [x] Middleware tests — `stores/tests/test_middleware.py` (10 tests: header resolution, subdomain resolution, missing/invalid/suspended/deleted slug)
- [x] Rate limiting per store — `stores/throttling.py`: `StoreAnonRateThrottle` (300/min per store) and `StoreUserRateThrottle` (600/min per store); rates added to `settings.py`
- [x] APScheduler jobs scoped per store — `send_birthday_emails` rewritten to iterate active stores, query `Customer` model, use `StoreSettings`; `send_low_stock_alerts` rewritten to iterate active stores, email each store's owner

**All 18 tests pass. `manage.py check` — 0 issues. `npm run build` — 0 errors.**

---

## What Does NOT Change

- All existing API endpoint paths — store context comes from middleware, not URL
- Frontend page structure for store admin and customer flows
- JWT auth, token rotation, SimpleJWT config
- Payment integration (ShurjoPay) — just needs store-scoped config
- Cloudinary setup — can share one account, prefix paths with store slug

---

## Data Migration Strategy

When adding `store` FK to existing models:

```python
# Example migration for Product
def assign_default_store(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Product = apps.get_model('catalog', 'Product')
    default_store = Store.objects.get(slug='default')  # created in Phase 1
    Product.objects.update(store=default_store)
```

Run this pattern for every affected model. The FK is added as nullable first, data is backfilled, then made non-nullable in a follow-up migration.

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Query forgets `store` filter → data leak | Write a base queryset mixin that always filters by `request.store`; use it everywhere |
| Middleware returns wrong store → wrong data | Unit test: assert store resolution for subdomain, header, and missing slug |
| Breaking existing single-store deploy | Phase 1 seed creates Store #1 with all existing data — app keeps working during migration |
| Auth tokens don't carry store context | Tokens are user-scoped; store context resolved per-request via middleware, not in token |
| Scheduler sends birthday emails cross-store | Scope scheduler jobs to iterate over active stores |

---

## Deployment Impact

| Service | Change |
|---------|--------|
| Backend (Render) | One deployment — add `X-Store-Slug` to CORS allowed headers |
| Frontend (Render) | One deployment per store — add `VITE_STORE_SLUG` env var |
| Database | Add `stores` table and FK columns — zero downtime with nullable FK approach |
| DNS | Add wildcard `*.shoply.com → frontend`, configure per-store env on Render |

---

## Decision Log

| Decision | Reason |
|----------|--------|
| Shared DB, store FK | Simpler ops; right choice at this scale |
| Subdomain + header hybrid | Subdomain for production; header makes Postman testing easy |
| One frontend per store (Phase 1) | Zero routing change; migrate to subdomain-aware SPA later |
| User accounts are cross-store | A customer can shop at multiple stores with one account |
| `platform_admin` is a User role, not a separate model | Simpler; platform admins are just users with elevated privileges |
