# Deployment Readiness Report

**Date:** 2026-04-24  
**Audited by:** Claude Code  
**Overall Verdict:** ❌ NOT READY FOR PRODUCTION

---

## 🔴 Critical — Must Fix Before Deploying

### Backend

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | ~~**`.env` committed with real credentials**~~ — **NOT AN ISSUE.** `.env` is in `.gitignore` and has never been committed to git history. Credentials are safe. | `mini_ecommerce_backend/.env` | ✅ No action needed |
| 2 | ~~**Missing HTTPS/SSL security settings**~~ — **FIXED.** Added full production security block with `SECURE_PROXY_SSL_HEADER` for Render's proxy (prevents redirect loops). Active only when `DEBUG=False`. | `mini_ecommerce_backend/ecommerce_backend/settings.py` | ✅ Fixed |
| 3 | ~~**DEBUG defaults to `True`**~~ — **FIXED.** Default changed to `'False'`. Production is safe if env var is not set. | `mini_ecommerce_backend/ecommerce_backend/settings.py:29` | ✅ Fixed |
| 4 | ~~**No logging configured**~~ — **FIXED.** Added `LOGGING` config with console + rotating file handler (14-day retention). `logs/` added to `.gitignore`. | `mini_ecommerce_backend/ecommerce_backend/settings.py` | ✅ Fixed |

### Frontend

| # | Issue | File | Fix |
|---|-------|------|-----|
| 5 | ~~**API base URL falls back to `localhost`**~~ — **FIXED.** Removed `localhost` fallback from both `baseURL` and token refresh URL. `VITE_API_BASE_URL` must be set in Render dashboard — missing it now fails loudly instead of silently. | `mini_ecommerce_frontend/src/api/axios.js` | ✅ Fixed |
| 6 | ~~**No React Error Boundary**~~ — **FIXED.** Created `ErrorBoundary` component matching app design (with Refresh + Back to Home actions). Wrapped entire app in `App.jsx`. | `mini_ecommerce_frontend/src/components/shared/ErrorBoundary.jsx` | ✅ Fixed |

---

## 🟡 Warnings — Should Fix Before Deploying

### Backend

| # | Issue | File | Fix |
|---|-------|------|-----|
| 7 | ~~**CORS/CSRF config**~~ — **FIXED.** `CSRF_TRUSTED_ORIGINS` now uses its own env var. Both use list comprehension to filter empty strings, producing `[]` instead of `['']` when unset. `.env.example` updated. | `mini_ecommerce_backend/ecommerce_backend/settings.py` | ✅ Fixed |
| 8 | ~~**APScheduler is single-instance only**~~ — **FIXED.** Removed APScheduler entirely. Birthday emails and low-stock alerts now run as Render Cron Jobs (`5 0 * * *` and `0 12 * * *`), fully decoupled from the web process. No more worker timeouts or duplicate job runs. | `mini_ecommerce_backend/users/scheduler.py` (deleted) | ✅ Fixed |

### Frontend

| # | Issue | File | Fix |
|---|-------|------|-----|
| 9 | ~~**JWT tokens stored in `localStorage`**~~ — **ACCEPTED RISK.** React escapes all output by default (no `dangerouslySetInnerHTML`), access tokens are short-lived (1 day), refresh tokens rotate on every use. Industry-standard for SPAs at this scale. No action needed. | `mini_ecommerce_frontend/src/store/authStore.js` | ✅ Accepted |
| 10 | ~~**`index.html` has placeholder title**~~ — **FIXED.** Title updated to `Shoply — Online Store`, meta description and Open Graph tags added. | `mini_ecommerce_frontend/index.html` | ✅ Fixed |
| 11 | ~~**`vite.config.js` has no production build settings**~~ — **FIXED.** Added `minify: 'esbuild'`, `sourcemap: false`, `chunkSizeWarningLimit: 600`. | `mini_ecommerce_frontend/vite.config.js` | ✅ Fixed |

---

## 🔵 Non-Blocking — Address Post-Launch

| # | Area | Issue | File |
|---|------|-------|------|
| 12 | **Backend tests** | All test files are empty stubs — zero test coverage for auth, orders, payments, catalog | `mini_ecommerce_backend/*/tests.py` |
| 13 | **Frontend tests** | No test framework installed, no tests at all | `mini_ecommerce_frontend/` |
| 14 | **Bundle size** | Main JS bundle is 243 KB — acceptable now but worth monitoring as features grow | `mini_ecommerce_frontend/dist/` |
| 15 | **Celery for complex task queuing** | If background jobs grow beyond simple daily cron (e.g. per-order async processing, retries, chaining), migrate from Render Cron Jobs to Celery+Redis | N/A |

---

## ✅ What's Already Good

- All API endpoints properly authenticated — no unauthenticated data leaks
- All database migrations are committed and accounted for
- Admin and protected routes properly guarded on the frontend (AdminRoute, SuperAdminRoute, ProtectedRoute, GuestOnlyRoute)
- JWT rotation + blacklisting configured (SimpleJWT)
- WhiteNoise + Cloudinary properly set up for static/media files
- All dependencies present in `requirements.txt` including gunicorn for production
- `.env.example` exists and documents all required env vars
- No TODO/FIXME comments — codebase is clean and complete
- 404 routing handled with NotFoundPage
- Full mobile/tablet/desktop responsiveness implemented
- Password validators enabled
- CSRF and Security middleware enabled

---

## Recommended Fix Order

```
Step 1 — IMMEDIATE (security):
  - Rotate ALL credentials: SECRET_KEY, DB password, Gmail app password, ShurjoPay password
  - Remove .env from git history using git-filter-repo

Step 2 — Before going live (backend):
  - Fix DEBUG default to 'False' in settings.py
  - Add HTTPS/SSL security settings block (if not DEBUG)
  - Add LOGGING configuration
  - Fix CSRF_TRUSTED_ORIGINS to use its own env var

Step 3 — Before going live (frontend):
  - Add Error Boundary to App.jsx
  - Create .env.production with real VITE_API_BASE_URL
  - Remove localhost fallback from axios.js
  - Update index.html title and meta tags
  - Add production build settings to vite.config.js

Step 4 — Post-launch (first sprint):
  - Write backend tests (auth, orders, payments at minimum)
  - Set up frontend test framework (Vitest recommended)
  - Monitor bundle size
  - Evaluate Celery migration if scaling is needed
```

---

## Quick Reference: Required Environment Variables

### Backend (`.env`)
```
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=                        # For cloud PostgreSQL
DB_NAME=                             # For local MySQL
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
SHURJOPAY_USERNAME=
SHURJOPAY_PASSWORD=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Frontend (`.env.production`)
```
VITE_API_BASE_URL=https://your-api-domain.com/api
```
