import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function OpenApiPending() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8"
      role="status"
      aria-label="Loading OpenAPI report"
    >
      Loading and validating OpenAPI evidence…
    </main>
  )
}

export function OpenApiError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8"
    >
      <Alert variant="destructive">
        <AlertTitle>OpenAPI data unavailable</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          <div className="mt-3 flex items-center gap-4">
            <Button variant="outline" onClick={() => void router.invalidate()}>
              Retry
            </Button>
            <Link to="/openapi" search={{}} className="underline">
              Clear filters and load latest
            </Link>
          </div>
        </AlertDescription>
      </Alert>
    </main>
  )
}
