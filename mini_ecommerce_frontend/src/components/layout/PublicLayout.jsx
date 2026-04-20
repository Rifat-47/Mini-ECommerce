import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'
import useSettingsStore from '@/store/settingsStore'

export default function PublicLayout() {
  const { fetchPublicSettings } = useSettingsStore()
  useEffect(() => { fetchPublicSettings() }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
