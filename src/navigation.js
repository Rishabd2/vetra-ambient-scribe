export function resolveInitialView(locationLike = {}) {
  const pathname = locationLike.pathname || '/'
  const search = locationLike.search || ''
  const hash = locationLike.hash || ''
  const params = new URLSearchParams(search)

  if (pathname === '/revenue' || hash === '#revenue' || params.get('page') === 'revenue') return 'revenue'
  if (params.get('page') === 'legacy' || hash === '#legacy') return 'legacyLanding'
  if (pathname === '/dashboard' || params.get('page') === 'dashboard') return 'overview'
  return 'landing'
}
