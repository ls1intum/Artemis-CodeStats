import { dimensionKeys, dimensions, type Snapshot } from './model'

export function ModuleMatrix({
  current,
  compare,
  modules,
  module,
  onSelect,
}: {
  current: Snapshot
  compare: Snapshot
  modules: string[]
  module: string
  onSelect: (module: string | undefined) => void
}) {
  return (
    <section className="migration-panel" aria-labelledby="modules-title">
      <div>
        <h2 id="modules-title">Where to work next</h2>
        <p>
          Largest legacy footprints first. Select a module to focus cards and
          source evidence. Counts overlap; “legacy files” is deduplicated.
        </p>
      </div>
      <div
        className="overflow-auto max-h-[32rem] mt-5"
        tabIndex={0}
        role="region"
        aria-label="Module footprint table"
      >
        <table className="migration-table min-w-[960px]">
          <caption className="sr-only">
            Module migration footprint and net change
          </caption>
          <thead>
            <tr>
              <th scope="col">Module</th>
              <th scope="col">Legacy files</th>
              <th scope="col">Net change</th>
              {dimensionKeys.map((key) => (
                <th scope="col" key={key}>
                  {dimensions[key].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((name) => {
              const now = current.modules.find((m) => m.name === name)
              const before = compare.modules.find((m) => m.name === name)
              const delta =
                now && before ? now.legacyFiles - before.legacyFiles : null
              return (
                <tr key={name} className={module === name ? 'bg-blue-50' : ''}>
                  <th scope="row">
                    <button
                      className="migration-link text-left"
                      aria-pressed={module === name}
                      onClick={() =>
                        onSelect(module === name ? undefined : name)
                      }
                    >
                      {name}
                    </button>
                  </th>
                  <td className="font-semibold">
                    {now?.legacyFiles ?? 'Absent'}
                  </td>
                  <td>
                    {delta === null
                      ? now
                        ? 'New module'
                        : 'Removed module'
                      : `${delta > 0 ? '+' : ''}${delta}`}
                  </td>
                  {dimensionKeys.map((key) => (
                    <td key={key}>{now?.counts[key] ?? '—'}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
