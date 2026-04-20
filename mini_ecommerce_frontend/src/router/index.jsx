import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import useAuthStore from '@/store/authStore'
import PublicLayout from '@/components/layout/PublicLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

// ── Route guards ──────────────────────────────────────────
function ProtectedRoute() {
  const { accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return <Outlet />
}

function AdminRoute() {
  const { accessToken, user } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  if (!['admin', 'superadmin'].includes(user?.role)) return <Navigate to="/" replace />
  return <Outlet />
}

function SuperAdminRoute() {
  const { accessToken, user } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  if (user?.role !== 'superadmin') return <Navigate to="/admin" replace />
  return <Outlet />
}

function GuestOnlyRoute() {
  const { accessToken } = useAuthStore()
  if (accessToken) return <Navigate to="/" replace />
  return <Outlet />
}

// ── Lazy page loader ──────────────────────────────────────
const fallback = (
  <div className="flex items-center justify-center min-h-[40vh]">
    <LoadingSpinner />
  </div>
)

function wrap(importFn) {
  const Page = lazy(importFn)
  return (
    <Suspense fallback={fallback}>
      <Page />
    </Suspense>
  )
}

// ── Pages ─────────────────────────────────────────────────
const ProductListPage    = () => import('@/pages/catalog/ProductListPage')
const ProductDetailPage  = () => import('@/pages/catalog/ProductDetailPage')
const LoginPage          = () => import('@/pages/auth/LoginPage')
const RegisterPage       = () => import('@/pages/auth/RegisterPage')
const ForgotPasswordPage = () => import('@/pages/auth/ForgotPasswordPage')
const ResetPasswordPage  = () => import('@/pages/auth/ResetPasswordPage')
const CartPage           = () => import('@/pages/cart/CartPage')
const CheckoutPage       = () => import('@/pages/checkout/CheckoutPage')
const OrdersPage         = () => import('@/pages/orders/OrdersPage')
const OrderDetailPage    = () => import('@/pages/orders/OrderDetailPage')
const WishlistPage       = () => import('@/pages/wishlist/WishlistPage')
const ProfilePage        = () => import('@/pages/profile/ProfilePage')
const PaymentSuccessPage   = () => import('@/pages/payment/PaymentSuccessPage')
const PaymentFailedPage    = () => import('@/pages/payment/PaymentFailedPage')
const PaymentCancelledPage = () => import('@/pages/payment/PaymentCancelledPage')
const DashboardPage   = () => import('@/pages/admin/DashboardPage')
const AdminProductsPage  = () => import('@/pages/admin/ProductsPage')
const AdminOrdersPage    = () => import('@/pages/admin/OrdersPage')
const AdminUsersPage     = () => import('@/pages/admin/UsersPage')
const AdminCouponsPage   = () => import('@/pages/admin/CouponsPage')
const AdminReturnsPage   = () => import('@/pages/admin/ReturnsPage')
const AdminPaymentsPage  = () => import('@/pages/admin/PaymentsPage')
const AdminCategoriesPage = () => import('@/pages/admin/CategoriesPage')
const AdminAuditLogPage       = () => import('@/pages/admin/AuditLogPage')
const AdminManagementPage     = () => import('@/pages/admin/AdminManagementPage')
const AdminSettingsPage       = () => import('@/pages/admin/SettingsPage')
const NotFoundPage            = () => import('@/pages/NotFoundPage')

// ── Router ────────────────────────────────────────────────
const router = createBrowserRouter([

  // Auth pages — centered card, no Navbar/Footer
  {
    element: <AuthLayout />,
    children: [
      {
        element: <GuestOnlyRoute />,
        children: [
          { path: '/login',                        element: wrap(LoginPage) },
          { path: '/register',                     element: wrap(RegisterPage) },
          { path: '/forgot-password',              element: wrap(ForgotPasswordPage) },
          { path: '/reset-password/:uid/:token',   element: wrap(ResetPasswordPage) },
        ],
      },
    ],
  },

  // Admin pages — sidebar layout, admin + superadmin
  {
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin',             element: wrap(DashboardPage) },
          { path: '/admin/products',    element: wrap(AdminProductsPage) },
          { path: '/admin/orders',      element: wrap(AdminOrdersPage) },
          { path: '/admin/users',       element: wrap(AdminUsersPage) },
          { path: '/admin/coupons',     element: wrap(AdminCouponsPage) },
          { path: '/admin/returns',     element: wrap(AdminReturnsPage) },
          { path: '/admin/payments',    element: wrap(AdminPaymentsPage) },
          { path: '/admin/categories',  element: wrap(AdminCategoriesPage) },
          { path: '/admin/settings',    element: wrap(AdminSettingsPage) },

          // Superadmin-only pages nested inside AdminLayout
          {
            element: <SuperAdminRoute />,
            children: [
              { path: '/admin/audit-log', element: wrap(AdminAuditLogPage) },
              { path: '/admin/admins',    element: wrap(AdminManagementPage) },
            ],
          },
        ],
      },
    ],
  },

  // Customer pages — Navbar + Footer
  {
    element: <PublicLayout />,
    children: [
      // Public (no auth required)
      { path: '/',               element: wrap(ProductListPage) },
      { path: '/products/:id',   element: wrap(ProductDetailPage) },
      { path: '/cart',           element: wrap(CartPage) },
      { path: '/payment/success',    element: wrap(PaymentSuccessPage) },
      { path: '/payment/failed',     element: wrap(PaymentFailedPage) },
      { path: '/payment/cancelled',  element: wrap(PaymentCancelledPage) },

      // Protected (require login)
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/wishlist',      element: wrap(WishlistPage) },
          { path: '/checkout',      element: wrap(CheckoutPage) },
          { path: '/orders',        element: wrap(OrdersPage) },
          { path: '/orders/:id',    element: wrap(OrderDetailPage) },
          { path: '/profile',       element: wrap(ProfilePage) },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: wrap(NotFoundPage) },
])

export default router
