import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  dimensions,
  sourceUrl,
  commitUrl,
  type Dimension,
  type Detail,
} from './model'

export function EvidenceExplorer({
  commit,
  module,
  dimension,
  query,
  data,
  error,
  retry,
}: {
  commit: string
  module: string
  dimension: Dimension | ''
  query: string
  data?: Detail
  error?: string
  retry: () => void
}) {
  const filterKey = `${module}/${dimension}/${query}`
  const [pagination, setPagination] = useState({ filterKey, page: 0 })
  const page = pagination.filterKey === filterKey ? pagination.page : 0
  const setPage = (page: number) => setPagination({ filterKey, page })
  if (error)
    return (
      <section className="migration-panel" role="alert">
        <h2>Evidence could not be loaded</h2>
        <p>{error}</p>
        <Button variant="outline" onClick={retry}>
          Retry evidence
        </Button>
      </section>
    )
  if (!data)
    return (
      <section className="migration-panel" role="status">
        <h2>Summary-only historical snapshot</h2>
        <p>
          Counts and module comparisons are retained for every first-parent
          commit since package adoption. Detailed file evidence is retained for
          weekly checkpoints, both adoption milestones, and the latest commit.
        </p>
        <a className="migration-link" href={commitUrl(commit)}>
          Inspect this commit on GitHub ↗
        </a>
      </section>
    )
  const filtered = data.findings.filter(
    (f) =>
      (!module || f.module === module) &&
      (!dimension || f.dimension === dimension) &&
      (!query ||
        `${f.path} ${f.evidence}`.toLowerCase().includes(query.toLowerCase())),
  )
  const lastPage = Math.max(0, Math.ceil(filtered.length / 50) - 1)
  const currentPage = Math.min(page, lastPage)
  return (
    <section className="migration-panel" aria-labelledby="evidence-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="evidence-title">Source evidence</h2>
          <p aria-live="polite">
            {filtered.length.toLocaleString()} observations · commit-pinned
            source references · 50 per page
          </p>
        </div>
        <a
          className="migration-link"
          href={`${import.meta.env.BASE_URL}migrations/${commit}.json`}
          download
        >
          Download snapshot JSON
        </a>
      </div>
      <div
        className="overflow-auto max-h-[32rem] mt-5"
        tabIndex={0}
        role="region"
        aria-label="Evidence results"
      >
        <table className="migration-table min-w-[720px]">
          <caption className="sr-only">Filtered migration observations</caption>
          <thead>
            <tr>
              <th scope="col">File / line</th>
              <th scope="col">Dimension</th>
              <th scope="col">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice(currentPage * 50, (currentPage + 1) * 50)
              .map((f, i) => (
                <tr key={`${f.path}-${f.line}-${i}`}>
                  <td>
                    <a
                      className="migration-link break-all"
                      href={sourceUrl(commit, f.path, f.line)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {f.path.replace('src/main/webapp/', '')}:{f.line}
                    </a>
                  </td>
                  <td className="whitespace-nowrap">
                    {dimensions[f.dimension].label}
                  </td>
                  <td>
                    <code className="break-all">{f.evidence}</code>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <p className="py-8 text-center">
          No matching evidence. Clear your filters or select another dimension.
        </p>
      )}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="text-sm" role="status">
          Page {currentPage + 1} of {lastPage + 1}
        </span>
        <Button
          variant="outline"
          disabled={currentPage === lastPage}
          onClick={() => setPage(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  )
}
