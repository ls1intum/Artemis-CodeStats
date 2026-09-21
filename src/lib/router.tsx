import {
  createRouter,
  createHashHistory,
  createRootRoute,
  createRoute,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { RootLayout } from '@/routes/__root'
import { MigrationDashboard } from '@/features/migrations/dashboard'
import { z } from 'zod'
import { views } from '@/features/migrations/model'
import { loadMigrationReport } from '@/features/migrations/load-report'
import {
  MigrationError,
  MigrationPending,
} from '@/features/migrations/route-feedback'

const searchSchema = z.object({
  view: z.enum(views).optional().catch(undefined),
  snapshot: z.string().optional().catch(undefined),
  compare: z.string().optional().catch(undefined),
  section: z.string().optional().catch(undefined),
})

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MigrationDashboard,
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    snapshot: search.snapshot,
    compare: search.compare,
  }),
  loader: ({ deps, abortController }) =>
    loadMigrationReport(deps, abortController.signal),
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
])

// Create router with hash history for GitHub Pages
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
