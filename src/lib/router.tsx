import {
  createRouter,
  createHashHistory,
  createRootRoute,
  createRoute,
} from '@tanstack/react-router'
import { RootLayout } from '@/routes/__root'
import { DecoratorlessDashboard } from '@/routes/decoratorless'
import { DtoUsageDashboard } from '@/routes/dto-usage'

// Create root route with layout
const rootRoute = createRootRoute({
  component: RootLayout,
})

// Define child routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DecoratorlessDashboard,
})

const decoratorlessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/decoratorless',
  component: DecoratorlessDashboard,
})

const dtoUsageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dto-usage',
  component: DtoUsageDashboard,
})

// Build route tree
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

// Type registration for useNavigate, Link, etc.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
