import { Outlet, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Package, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import useThemeStore from '@/store/themeStore'
import useSettingsStore from '@/store/settingsStore'

export default function AuthLayout() {
  const { theme, toggle } = useThemeStore()
  const { fetchPublicSettings, settings } = useSettingsStore()
  const storeName = settings.store_name

  useEffect(() => { fetchPublicSettings() }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-6 h-16 border-b border-border">
        <Link to="/" className="flex items-center gap-2 font-bold text-primary">
          <Package className="h-5 w-5" />
          {storeName}
        </Link>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

      <footer className="text-center text-xs text-muted-foreground py-4">
        © {new Date().getFullYear()} {storeName}. All rights reserved.
      </footer>
    </div>
  )
}
