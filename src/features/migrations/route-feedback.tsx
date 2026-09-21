import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function MigrationPending() {
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="migration-shell"
      role="status"
    >
      Loading migration progress…
    </main>
  )
}

export function MigrationError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main tabIndex={-1} id="main-content" className="migration-shell">
      <Alert variant="destructive">
        <AlertTitle>
          <h1>Migration data unavailable</h1>
        </AlertTitle>
        <AlertDescription>
          <p>No progress is inferred from missing or invalid data.</p>
          <p>{error.message}</p>
          <Button variant="outline" onClick={() => void router.invalidate()}>
            Retry report
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  )
}
