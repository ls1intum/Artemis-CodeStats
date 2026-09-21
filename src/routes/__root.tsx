import { Close as PopoverClose } from '@radix-ui/react-popover'
import { Outlet, Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Activity, ChevronDown } from 'lucide-react'

export function RootLayout() {
  const currentPath = useRouterState().location.pathname
  const archived = currentPath !== '/'
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        onClick={(event) => {
          // Preserve hash-router state when moving focus to the page content.
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white px-4 sm:px-8">
        <div className="mx-auto max-w-[1440px] flex flex-wrap items-center justify-between gap-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-900 p-2 text-white">
              <Activity size={22} />
            </span>
            <span>
              <span className="block font-bold tracking-tight">
                Artemis CodeStats
              </span>
              <span className="block text-xs text-slate-500">
                Migration observatory
              </span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap gap-1 text-sm"
          >
            <Link
              to="/"
              aria-current={!archived ? 'page' : undefined}
              className={`rounded-md px-3 py-2 font-medium ${!archived ? 'bg-blue-50 text-blue-800' : 'text-slate-600'}`}
            >
              UI modernization
            </Link>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={
                    archived ? 'bg-blue-50 text-blue-800' : 'text-slate-600'
                  }
                >
                  Archived migrations <ChevronDown aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-60 p-2"
                aria-label="Archived migrations"
              >
                <PopoverClose asChild>
                  <Link
                    to="/decoratorless"
                    aria-current={
                      currentPath === '/decoratorless' ? 'page' : undefined
                    }
                    className="block rounded px-3 py-2 hover:bg-slate-100"
                  >
                    Signals / decoratorless APIs
                  </Link>
                </PopoverClose>
                <PopoverClose asChild>
                  <Link
                    to="/dto-usage"
                    aria-current={
                      currentPath === '/dto-usage' ? 'page' : undefined
                    }
                    className="block rounded px-3 py-2 hover:bg-slate-100"
                  >
                    DTO usage
                  </Link>
                </PopoverClose>
              </PopoverContent>
            </Popover>
          </nav>
        </div>
      </header>
      {archived && (
        <aside
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-[1440px] m-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <strong>Archived migration.</strong> Historical signals and DTO
          reports remain available for reference. Archival reflects project
          priority, not certified 100% completion. These reports are no longer
          refreshed by the scheduled workflow.{' '}
          <Link className="underline" to="/">
            Return to UI modernization
          </Link>
          .
        </aside>
      )}
      <Outlet />
      <footer className="border-t bg-white px-6 py-6 text-xs text-slate-500">
        <div className="mx-auto max-w-[1440px] flex flex-wrap justify-between gap-3">
          <span>Artemis CodeStats · Evidence, not vanity metrics.</span>
          <a
            className="migration-link"
            href="https://github.com/ls1intum/Artemis-CodeStats"
          >
            Source & methodology ↗
          </a>
        </div>
      </footer>
    </div>
  )
}
