import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/lib/router'
import './index.css'

// The hash router owns the query string; a query before the hash would be re-emitted on every navigation.
if (location.search) {
  const hash = location.hash || '#/'
  history.replaceState(
    null,
    '',
    `${location.pathname}${hash}${hash.includes('?') ? '&' : '?'}${location.search.slice(1)}`,
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
