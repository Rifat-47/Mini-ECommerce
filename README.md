# Mini E-Commerce

A full-stack e-commerce application with a React frontend and Django REST Framework backend.

## Structure

```
mini_ecommerce/
├── mini_ecommerce_frontend/   # React + Vite + Tailwind CSS
├── mini_ecommerce_backend/    # Django REST Framework + PostgreSQL
```

## Documentation

- [Frontend README](mini_ecommerce_frontend/README.md) — setup, project structure, auth flow
- [Backend README](mini_ecommerce_backend/README.md) — setup, API overview, env vars

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui, Zustand |
| Backend | Django 6, Django REST Framework, SimpleJWT |
| Database | PostgreSQL |
| Payments | ShurjoPay (bKash, Nagad, Rocket) |
| Auth | JWT + 2FA (TOTP) |

## Quick Start

See the individual READMEs for full setup instructions.

```bash
# Backend
cd mini_ecommerce_backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in your values
python manage.py migrate
python manage.py runserver

# Frontend (new terminal)
cd mini_ecommerce_frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL
npm run dev
```
