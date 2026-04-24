import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import router from '@/router'
import useThemeStore from '@/store/themeStore'
import ErrorBoundary from '@/components/shared/ErrorBoundary'

export default function App() {
  const init = useThemeStore((s) => s.init)
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    init()
  }, [init])

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster theme={theme} richColors position="top-right" />
    </ErrorBoundary>
  )
}
