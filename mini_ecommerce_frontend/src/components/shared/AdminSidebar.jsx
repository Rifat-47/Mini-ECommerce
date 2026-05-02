import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag,
  RotateCcw, CreditCard, ClipboardList, LogOut, ChevronLeft, ChevronRight,
  ShieldCheck, Settings, Layers, Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import useAuthStore from '@/store/authStore'
import useSettingsStore from '@/store/settingsStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

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
  { label: 'Admin Management', to: '/admin/admins',      icon: ShieldCheck },
  { label: 'Audit Log',        to: '/admin/audit-log',   icon: ClipboardList },
  { label: 'Email Logs',       to: '/admin/email-logs',  icon: Mail },
]

export default function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const storeName = useSettingsStore(s => s.settings.store_name)
  const [collapsed, setCollapsed] = useState(false)

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.email?.[0] || ''}`.toUpperCase()
    : 'A'

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border shrink-0',
        collapsed ? 'justify-center' : 'justify-between',
      )}>
        {!collapsed && (
          <Link to="/admin" className="flex items-center gap-2 font-bold text-primary">
            <Package className="h-5 w-5 shrink-0" />
            <span>{storeName}</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/admin" aria-label="Admin home">
            <Package className="h-5 w-5 text-primary" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 shrink-0', collapsed && 'hidden')}
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="mx-auto mt-2 h-7 w-7"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {adminNavItems.map(({ label, to, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}

        {user?.role === 'superadmin' && (
          <>
            <Separator className="my-2" />
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Superadmin
              </p>
            )}
            {superAdminNavItems.map(({ label, to, icon: Icon }) => {
              const active = location.pathname === to || location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <Separator />

      {/* User info + logout */}
      <div className={cn('p-4', collapsed && 'px-2')}>
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.first_name || 'Admin'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn(
            'text-destructive hover:text-destructive hover:bg-destructive/10',
            !collapsed && 'w-full justify-start',
          )}
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </aside>
  )
}
