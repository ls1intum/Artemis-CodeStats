import { Outlet, Link, useRouterState } from '@tanstack/react-router'

export function RootLayout() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const isActive = (path: string) => {
    if (path === '/decoratorless') {
      return currentPath === '/' || currentPath === '/decoratorless'
    }
    return currentPath === path
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Navigation header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Artemis CodeStats</h1>
              <p className="text-xs text-slate-500">Migration Progress Dashboard</p>
            </div>
            <nav className="flex gap-1">
              <Link
                to="/decoratorless"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive('/decoratorless')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Decoratorless API
              </Link>
              <Link
                to="/dto-usage"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive('/dto-usage')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                DTO Usage
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Route content renders here */}
      <Outlet />
    </div>
  )
}
