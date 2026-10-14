import {
  createRouter,
  createHashHistory,
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router'
import { RootLayout } from '@/routes/__root'
import { z } from 'zod'
import { views } from '@/lib/dashboard-views'
import {
  MigrationError,
  MigrationPending,
} from '@/features/migrations/route-feedback'
import { OpenApiError, OpenApiPending } from '@/features/openapi/route-feedback'

const searchSchema = z.object({
  view: z.enum(views).optional().catch(undefined),
  snapshot: z.string().optional().catch(undefined),
  compare: z.string().optional().catch(undefined),
  module: z.string().optional().catch(undefined),
})

// Preserve invalid primitive filters for the dashboard's recovery UI. Never coerce objects:
// user-controlled toString properties can throw before a route error boundary exists.
const openApiSearchValue = z.preprocess((value) => {
  if (value === undefined || typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return '[invalid value]'
}, z.string().optional())

const openApiSearchSchema = z.object({
  view: openApiSearchValue,
  module: openApiSearchValue,
  operation: openApiSearchValue,
  snapshot: openApiSearchValue,
})

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(
    () => import('@/features/migrations/dashboard'),
    'MigrationDashboard',
  ),
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    snapshot: search.snapshot,
    compare: search.compare,
  }),
  loader: async ({ deps, abortController }) =>
    (await import('@/features/migrations/load-report')).loadMigrationReport(
      deps,
      abortController.signal,
    ),
  staleTime: Infinity,
  pendingComponent: MigrationPending,
  errorComponent: MigrationError,
})

const decoratorlessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/decoratorless',
  component: lazyRouteComponent(
    () => import('@/routes/decoratorless'),
    'DecoratorlessDashboard',
  ),
})

const openApiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/openapi',
  validateSearch: (search) => openApiSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ snapshot: search.snapshot }),
  loader: async ({ deps, abortController }) =>
    (await import('@/features/openapi/load-report')).loadOpenApiReport(
      deps,
      abortController.signal,
    ),
  staleTime: Infinity,
  pendingComponent: OpenApiPending,
  errorComponent: OpenApiError,
  component: lazyRouteComponent(
    () => import('@/features/openapi/dashboard'),
    'OpenApiDashboard',
  ),
  // Replace stale controls immediately while another revision is loading so a
  // second navigation cannot cancel the load and reuse its unfinished match.
  pendingMs: 0,
  pendingMinMs: 0,
})

const dtoUsageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dto-usage',
  validateSearch: (search) =>
    z
      .object({
        current: z.number().int().nonnegative().optional().catch(undefined),
      })
      .parse(search),
  loaderDeps: ({ search }) => ({ current: search.current }),
  loader: async ({ deps, abortController }) =>
    (await import('@/lib/dto-data')).loadDtoReport(
      deps.current,
      abortController.signal,
    ),
  staleTime: Infinity,
  pendingComponent: MigrationPending,
  errorComponent: MigrationError,
  component: lazyRouteComponent(
    () => import('@/routes/dto-usage'),
    'DtoUsageDashboard',
  ),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  decoratorlessRoute,
  dtoUsageRoute,
  openApiRoute,
])

const history = createHashHistory()
// Normalize pasted endpoint URLs before the router starts loading. Otherwise its
// mount-time canonicalization (%20 vs +, or reordered filters) cancels the first
// fetch and may reuse the canceled match without loader data.
if (history.location.pathname === '/openapi') {
  const location = history.location
  const search = openApiSearchSchema.parse(defaultParseSearch(location.search))
  const canonical = `${location.pathname}${defaultStringifySearch(search)}${location.hash}`
  if (location.href !== canonical) {
    history.replace(canonical, location.state)
    history.flush()
  }
}

// Create router with hash history for GitHub Pages
export const router = createRouter({
  routeTree,
  history,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
