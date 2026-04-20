import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag,
  RotateCcw, CreditCard, ClipboardList, LogOut, ShieldCheck, Settings, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import useAuthStore from '@/store/authStore'
import useSettingsStore from '@/store/settingsStore'

const adminNavItems = [
  { label: 'Dashboard',  to: '/admin',            icon: LayoutDashboard },
  { label: 'Products',   to: '/admin/products',   icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: Layers },
  { label: 'Orders',     to: '/admin/orders',     icon: ShoppingBag },
  { label: 'Returns',    to: '/admin/returns',    icon: RotateCcw },
  { label: 'Users',      to: '/admin/users',      icon: Users },
  { label: 'Coupons',    to: '/admin/coupons',    icon: Tag },
  { label: 'Payments',   to: '/admin/payments',   icon: CreditCard },
  { label: 'Settings',   to: '/admin/settings',   icon: Settings },
]

const superAdminNavItems = [
  { label: 'Admin Management', to: '/admin/admins',     icon: ShieldCheck },
  { label: 'Audit Log',        to: '/admin/audit-log',  icon: ClipboardList },
]

export default function MobileAdminNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const storeName = useSettingsStore(s => s.settings.store_name)

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <Package className="h-5 w-5 text-primary" />
        <span className="font-bold text-primary">{storeName}</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {adminNavItems.map(({ label, to, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {user?.role === 'superadmin' && (
          <>
            <Separator className="my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Superadmin
            </p>
            {superAdminNavItems.map(({ label, to, icon: Icon }) => {
              const active = location.pathname === to || location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  )
}
