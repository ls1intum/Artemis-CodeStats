import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

export function MigrationPending() {
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-8"
      role="status"
      aria-label="Loading migration report"
    >
      <Skeleton className="h-8 w-96" />
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </main>
  )
}

export function MigrationError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8"
    >
      <Alert variant="destructive">
        <AlertTitle>Migration data unavailable</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          <Button variant="outline" onClick={() => void router.invalidate()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  )
}
