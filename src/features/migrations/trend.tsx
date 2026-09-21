import {
  Line,
  LineChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import {
  commitUrl,
  dimensionKeys,
  dimensions,
  type Dimension,
  type Snapshot,
} from './model'

const series: Record<Dimension, { color: string; dash?: string }> = {
  bootstrap: { color: '#92400e' },
  primeng: { color: '#1d4ed8', dash: '8 3' },
  ngBootstrap: { color: '#7e22ce', dash: '3 3' },
  legacyTokens: { color: '#be123c', dash: '8 3 2 3' },
  tumUi: { color: '#0f766e' },
  tailwind: { color: '#1d4ed8', dash: '8 3' },
}
const dateLabel = (value: number) => new Date(value).toISOString().slice(0, 10)
const timeLabel = (value: number) =>
  new Date(value).toISOString().replace('T', ' ').slice(0, 19)

export function MigrationTrend({ snapshots }: { snapshots: Snapshot[] }) {
  const data = snapshots.map((s) => ({
    commit: s.commit,
    timestamp: Date.parse(s.date),
    ...s.counts,
  }))
  return (
    <section className="migration-panel" aria-labelledby="trend-title">
      <div className="mb-6">
        <h2 id="trend-title">Migration evidence over time</h2>
        <p>
          Every first-parent commit since package adoption; weekly samples
          before adoption. Distinct files per dimension; series overlap. Dates
          use elapsed time, not equally spaced snapshots. Scope: all modules.
        </p>
      </div>
      <div className="grid gap-8 xl:grid-cols-2">
        {(['legacy', 'modern'] as const).map((kind) => (
          <div key={kind}>
            <h3 className="mb-2 text-sm font-semibold">
              {kind === 'legacy'
                ? 'Legacy footprint'
                : 'Modern adoption evidence'}
            </h3>
            <p className="mb-4">
              {kind === 'legacy'
                ? 'Lower is better, but deletion is not proof of migration.'
                : 'Presence is not proof of adoption quality or feature parity.'}
            </p>
            <div className="h-72" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 8, right: 18, bottom: 4, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tick={{ fontSize: 11 }}
                    minTickGap={40}
                    tickFormatter={(v: number) => dateLabel(v).slice(5)}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={45}
                    tick={{ fontSize: 11 }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    labelFormatter={(v) => `${timeLabel(Number(v))} UTC`}
                  />
                  <Legend iconType="plainline" />
                  {dimensionKeys
                    .filter((key) => dimensions[key].kind === kind)
                    .map((key) => (
                      <Line
                        key={key}
                        type="linear"
                        dataKey={key}
                        name={dimensions[key].label}
                        stroke={series[key].color}
                        strokeDasharray={series[key].dash}
                        strokeWidth={2}
                        dot={data.length === 1}
                        isAnimationActive={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
      <details className="mt-5">
        <summary>View accessible trend data</summary>
        <div
          className="overflow-auto max-h-[32rem]"
          tabIndex={0}
          role="region"
          aria-label="Trend data"
        >
          <table className="migration-table">
            <caption className="sr-only">
              Affected files per analyzed commit
            </caption>
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                <th scope="col">Commit</th>
                {dimensionKeys.map((key) => (
                  <th scope="col" key={key}>
                    {dimensions[key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.commit}>
                  <th scope="row" className="whitespace-nowrap">
                    {timeLabel(row.timestamp)}
                  </th>
                  <td>
                    <a className="migration-link" href={commitUrl(row.commit)}>
                      {row.commit.slice(0, 8)}
                    </a>
                  </td>
                  {dimensionKeys.map((key) => (
                    <td key={key}>{row[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
