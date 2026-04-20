# Ethereal Asteroid — E-Commerce Backend

A RESTful e-commerce backend built with **Django REST Framework** and **MySQL**. Features JWT authentication, role-based access control, product catalog, cart, wishlist, order management, ShurjoPay payment integration (bKash, Nagad, Rocket), address book, and automated email notifications.

---

## Tech Stack

- Python / Django 6.0.4
- pyotp (TOTP-based 2FA)
- qrcode[pil] (QR code generation for 2FA setup)
- Django REST Framework 3.17.1
- MySQL (local) / PostgreSQL (staging/production)
- SimpleJWT (Authentication)
- APScheduler (Background tasks)
- ShurjoPay (Payment gateway — bKash, Nagad, Rocket)
- requests (ShurjoPay API client)
- reportlab (PDF invoice & credit note generation)
- python-dotenv (Environment config)

---

## Getting Started

### Prerequisites

- Python 3.10+
- MySQL (local) / PostgreSQL (staging/production) server running locally
- Git

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ethereal-asteroid
```

---

### 2. Create & Activate Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac / Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

---

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 4. Database Setup

Make sure MySQL is installed and running. Then create the database:

```sql
CREATE DATABASE ecommerce_db;
```

---

### 5. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
# Django
SECRET_KEY=your-secret-key-here

# Database
DB_NAME=ecommerce_db
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_HOST=localhost
DB_PORT=5432

# CORS (comma-separated list of allowed frontend origins)
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Email (Gmail SMTP)
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password

# ShurjoPay (get credentials from https://shurjopayment.com)
SHURJOPAY_USERNAME=your-shurjopay-username
SHURJOPAY_PASSWORD=your-shurjopay-password
SHURJOPAY_PREFIX=SP
SHURJOPAY_RETURN_URL=http://localhost:8000/api/payments/callback/
SHURJOPAY_CANCEL_URL=http://localhost:8000/api/payments/callback/

# Frontend base URL (for post-payment redirects)
FRONTEND_URL=http://localhost:5173
```

> **Note:** `EMAIL_HOST_PASSWORD` must be a **Gmail App Password**, not your regular Gmail password.
> To generate one: Google Account → Security → 2-Step Verification → App Passwords.

---

### 6. Run Migrations

```bash
python manage.py migrate
```

---

### 7. Create a SuperAdmin

```bash
python manage.py createsuperuser
```

> Or use the Django admin panel at `http://localhost:8000/admin/` after the server is running.

---

### 8. Run the Development Server

```bash
python manage.py runserver
```

The API will be available at: `http://localhost:8000/api`

---

## Email Configuration

The project uses **Gmail SMTP** to send real emails to users. The following events trigger emails:

| Event | Recipient |
|-------|-----------|
| Order placed | Customer (order confirmation) |
| Order status → In-Progress | Customer (order being processed) |
| Order status → Delivered | Customer (delivery confirmation) |
| Order cancelled | Customer (cancellation confirmation) |
| Forgot password | Customer (reset link, expires in 24h) |
| Birthday (12:05 AM daily) | Customer (happy birthday wish) |
| Low stock (12:00 PM daily) | All superadmins (products with stock < 10) |

To switch back to console output (development/testing), change `settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

---

## Scheduled Background Tasks

Both tasks run automatically when the Django server starts using APScheduler — no separate process needed.

| Task | Schedule | Description |
|------|----------|-------------|
| Birthday emails | 12:05 AM daily | Sends a happy birthday email to customers whose birthday is today |
| Low-stock alerts | 12:00 PM daily | Emails all superadmins a summary of products with stock below 10 units |

To trigger manually:

```bash
python manage.py send_birthday_emails
python manage.py send_low_stock_alerts
```

---

## User Roles

| Role | Access |
|------|--------|
| `superadmin` | Full access |
| `admin` | Manage users, catalog, orders |
| `customer` | Browse products, place & view own orders |

---

## API Overview

Base URL: `http://localhost:8000/api`

For authenticated endpoints, pass the access token in the header:
```
Authorization: Bearer <your_access_token>
```

All list endpoints are **paginated** (default: 20 items/page). Responses follow this structure:
```json
{ "count": 85, "next": "...?page=2", "previous": null, "results": [...] }
```

Access tokens expire after **1 day**. Use `/auth/token/refresh/` with your refresh token to get a new one. Refresh tokens expire after **30 days**.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register/` | Register a new customer |
| POST | `/auth/login/` | Login and receive JWT tokens |
| POST | `/auth/logout/` | Logout (blacklists refresh token) |
| POST | `/auth/token/refresh/` | Refresh access token |
| GET/PUT | `/auth/profile/` | View or update own profile |
| POST | `/auth/forgot-password/` | Request password reset link |
| POST | `/auth/reset-password/<uid>/<token>/` | Confirm password reset |
| POST | `/auth/update-password/` | Change password while logged in |

### Admin — User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/admin/users/` | List or create users |
| GET/PUT/DELETE | `/admin/users/<id>/` | Manage a specific user |

### Catalog
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories/` | List all categories (public) |
| POST/PUT/DELETE | `/categories/<id>/` | Manage categories (admin only) |
| GET | `/products/?search=&category=&min_price=&max_price=&in_stock=&sort=` | List/search/filter products (public) |
| GET | `/products/search/suggestions/?q=` | Autocomplete suggestions — up to 10 results (public) |
| POST/PUT/DELETE | `/products/<id>/` | Manage products (admin only) |
| GET/POST | `/products/<id>/images/` | List or upload product images |
| PATCH/DELETE | `/products/<id>/images/<image_id>/` | Set primary or delete an image (admin only) |

### Product Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/<id>/reviews/` | List reviews for a product (public) |
| POST | `/products/<id>/reviews/` | Submit a review (verified buyers only) |
| PUT/PATCH | `/products/<id>/reviews/<review_id>/` | Edit own review |
| DELETE | `/products/<id>/reviews/<review_id>/` | Delete review (owner or admin) |

### Wishlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/wishlist/` | View or add to wishlist |
| DELETE | `/wishlist/<id>/` | Remove item from wishlist |
| POST | `/wishlist/<id>/move-to-cart/` | Move wishlist item to cart |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/cart/` | View cart or add an item |
| DELETE | `/cart/` | Clear entire cart |
| PATCH/DELETE | `/cart/<id>/` | Update quantity or remove item |

### Admin Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats/?top=5` | Dashboard stats: revenue, orders, top products, new users (admin only) |

### Coupons
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/coupons/validate/` | Preview discount for a coupon code; supports `category_ids` for category-restricted coupons |
| GET/POST | `/admin/coupons/` | List or create coupons (admin only) |
| GET/PUT/PATCH/DELETE | `/admin/coupons/<id>/` | Manage a specific coupon (admin only) |

### Address Book
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/addresses/` | List or add saved addresses |
| GET/PUT/PATCH/DELETE | `/addresses/<id>/` | View, update, or delete a specific address |
| PATCH | `/addresses/<id>/set-default/` | Set address as default shipping or billing |

### Payments (ShurjoPay — bKash, Nagad, Rocket)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/initiate/` | Initiate payment — returns ShurjoPay `checkout_url` |
| GET | `/payments/callback/` | ShurjoPay redirect callback — auto-verifies and updates order |
| POST | `/payments/verify/<order_id>/` | Manually re-verify a payment |
| GET | `/payments/order/<order_id>/` | Get payment status for an order |
| GET | `/admin/payments/` | List all payments (admin only) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders/` | Place a new order — optionally apply a `coupon_code` |
| GET | `/orders/?status=` | View orders (own for customers, all for admins) |
| POST | `/orders/<id>/cancel/` | Cancel a Pending order (customer, own orders only) |
| PUT/PATCH | `/orders/<id>/` | Update order status (admin only) |

### Two-Factor Authentication (2FA)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/2fa/status/` | Check if 2FA is enabled |
| POST | `/auth/2fa/setup/` | Generate TOTP secret + QR code |
| POST | `/auth/2fa/verify-setup/` | Confirm code to activate 2FA |
| POST | `/auth/2fa/confirm/` | Complete login when 2FA is active |
| POST | `/auth/2fa/disable/` | Disable 2FA (requires current TOTP code) |

### GDPR
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile/export/` | Export all personal data as JSON |
| DELETE | `/profile/delete/` | Permanently delete account (password required) |

### Admin Audit Log
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/audit-log/` | List all admin actions; supports `?action=` and `?admin_id=` |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications/` | List own notifications (supports `?unread_only=true`) |
| GET | `/notifications/unread-count/` | Get count of unread notifications |
| PATCH | `/notifications/<id>/read/` | Mark a single notification as read |
| POST | `/notifications/mark-all-read/` | Mark all notifications as read |

### Admin Bulk Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/orders/bulk-update/` | Bulk update status on multiple orders |
| GET | `/admin/orders/export/` | Export orders as CSV (supports `?status=` filter) |
| POST | `/admin/products/bulk-update/` | Bulk update price/stock/discount on multiple products |
| GET | `/admin/products/export/` | Export product catalog as CSV (supports `?category=` filter) |
| GET | `/admin/products/<id>/stock-history/` | View stock movement history for a product |
| POST | `/admin/products/<id>/adjust-stock/` | Manual stock adjustment with required reason |

### Invoice & Credit Note (PDF)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders/<id>/invoice/` | Download invoice PDF — PAID or UNPAID badge (customer: own; admin: any) |
| GET | `/orders/<id>/credit-note/` | Download credit note PDF — available only after refund is complete |

### Returns & Refunds
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders/<id>/return/` | Initiate a return request (customer, Delivered orders only) |
| GET | `/orders/<id>/return/` | View return request status (customer) |
| GET | `/admin/returns/` | List all return requests (admin) |
| GET/PATCH | `/admin/returns/<id>/` | View or approve/reject a return (admin) |
| POST | `/admin/returns/<id>/refund/` | Mark refund as complete after manual ShurjoPay processing (admin) |

For full request/response details, see [`business docs/api_documentation.md`](business%20docs/api_documentation.md).

---

## Project Structure

```
ethereal-asteroid/
├── ecommerce_backend/      # Django project settings & URLs
├── users/                  # User model, auth APIs, address book, birthday scheduler
├── catalog/                # Category & product models, APIs, and reviews
├── orders/                 # Order models, checkout API, and coupon system
├── cart/                   # Wishlist and cart models and APIs
├── payments/               # ShurjoPay integration (bKash, Nagad, Rocket)
├── notifications/          # In-app notification model and APIs
├── business docs/          # api_documentation.md, implementation_plan.md, production_checklist.md
├── postman/                # Postman collection & environment
├── manage.py
├── requirements.txt
└── .env                    # Local environment variables (never commit)
```
