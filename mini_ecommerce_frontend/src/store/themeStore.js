import { create } from 'zustand'

function getInitialTheme() {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

const useThemeStore = create((set, get) => ({
  theme: 'light',

  init: () => {
    const theme = getInitialTheme()
    applyTheme(theme)
    set({ theme })
  },

  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    localStorage.setItem('theme', next)
    set({ theme: next })
  },

  setTheme: (theme) => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
    set({ theme })
  },
}))

export default useThemeStore
