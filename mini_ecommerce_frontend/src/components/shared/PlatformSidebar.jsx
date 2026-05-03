import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Store, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import useAuthStore from '@/store/authStore'
import { useState } from 'react'

const navItems = [
  { label: 'Dashboard', to: '/platform',        icon: LayoutDashboard },
  { label: 'Stores',    to: '/platform/stores',  icon: Store },
]

export default function PlatformSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  const initials = `${user?.first_name?.[0] || ''}${user?.email?.[0] || ''}`.toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className={cn(
      'hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
      collapsed ? 'w-16' : 'w-60',
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border shrink-0',
        collapsed ? 'justify-center' : 'justify-between',
      )}>
        {!collapsed && (
          <Link to="/platform" className="flex items-center gap-2 font-bold text-primary">
            <Store className="h-5 w-5 shrink-0" />
            <span>Platform Admin</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/platform" aria-label="Platform home">
            <Store className="h-5 w-5 text-primary" />
          </Link>
        )}
        <Button
          variant="ghost" size="icon"
          className={cn('h-7 w-7 shrink-0', collapsed && 'hidden')}
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {collapsed && (
        <Button variant="ghost" size="icon" className="mx-auto mt-2 h-7 w-7"
          onClick={() => setCollapsed(false)} aria-label="Expand sidebar">
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, to, icon: Icon }) => {
          const active = to === '/platform'
            ? location.pathname === '/platform'
            : location.pathname.startsWith(to)
          return (
            <Link key={to} to={to} title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2',
              )}>
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* User + logout */}
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
