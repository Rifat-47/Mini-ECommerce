const RESERVED = new Set(['auth', 'platform', 'login', 'register', 'forgot-password'])

export function getStoreSlug() {
  const segments = window.location.pathname.split('/').filter(Boolean)
  if (segments.length === 0 || RESERVED.has(segments[0])) return null
  return segments[0]
}

export function isPlatformMode() {
  return !getStoreSlug()
}
