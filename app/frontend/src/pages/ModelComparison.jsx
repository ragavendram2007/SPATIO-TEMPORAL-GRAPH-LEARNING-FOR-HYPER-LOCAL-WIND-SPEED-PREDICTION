import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../api.js'
import { ErrorState, Loading } from '../components/States.jsx'
import useFetch from '../hooks/useFetch.js'

const tooltipStyle = { borderRadius: 8, fontSize: 12 }

export default function ModelComparison() {
  const { data, loading, error, refetch } = useFetch(api.metrics)

  if (loading) return <Loading label="Loading frozen evaluation results…" />
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    )
  }

  const models = data.models || []
  const best = models.find((m) => m.best)
  const lstm = models.find((m) => m.name === 'LSTM')
  const improvement =
    best && lstm ? (best.r2 - lstm.r2).toFixed(4) : null

  const chartData = models.map((m) => ({
    name: m.name.replace(' (local CPU)', ''),
    rmse: m.rmse,
    mae: m.mae,
    r2: m.r2,
    best: !!m.best,
    family: m.family,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Model Comparison
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          All results are from the untouched chronological test set
          (Apr–Jun 2026), averaged over the 12 stations. Lower MAE/RMSE is
          better; higher R² is better. R² is the coefficient of determination —
          it is not an accuracy percentage.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Split: {data.split}
        </p>
      </div>

      {/* Table */}
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm fade-up-1">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium text-right">MAE</th>
              <th className="px-4 py-3 font-medium text-right">RMSE</th>
              <th className="px-4 py-3 font-medium text-right">R²</th>
              <th className="px-4 py-3 font-medium">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {models.map((m) => (
              <tr
                key={m.name}
                className={
                  m.best
                    ? 'bg-emerald-50/70'
                    : m.family === 'graph'
                      ? 'bg-indigo-50/40'
                      : 'hover:bg-slate-50'
                }
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">{m.name}</span>
                  {m.best && (
                    <span className="ml-2 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Best evaluated model by R²
                    </span>
                  )}
                  {m.params && (
                    <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {m.params.toLocaleString()} params
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {m.mae.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {m.rmse.toFixed(4)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-semibold ${m.best ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {m.r2.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {m.note || familyLabel(m.family)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm fade-up-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Test RMSE by model (km/h) — lower is better
          </h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} domain={[1.5, 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toFixed(4)} km/h`, 'RMSE']} />
                <Bar dataKey="rmse" radius={[4, 4, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.name} fill={d.best ? '#10b981' : d.family === 'graph' ? '#6366f1' : '#38bdf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm fade-up-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Test R² by model — higher is better
          </h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} domain={[0.65, 0.85]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v).toFixed(4), 'R²']} />
                <ReferenceLine y={best?.r2} stroke="#10b981" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="r2"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Insights */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 fade-up-3">
        <h2 className="text-sm font-semibold text-slate-700">Insights</h2>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          <li>
            <strong>Hybrid GAT</strong> achieved the highest test R² (
            <strong>{best?.r2.toFixed(4)}</strong>) of all evaluated models —
            an absolute increase of <strong>{improvement} R² points</strong>{' '}
            over the LSTM baseline ({lstm?.r2.toFixed(4)}).
          </li>
          <li>
            The lowest RMSE belongs to <strong>LSTM</strong> (
            {models.find((m) => m.name === 'LSTM')?.rmse.toFixed(4)} km/h), so
            the graph models do not win every metric — the hybrid graph's
            advantage is in explained variance (R²), not in absolute error.
          </li>
          <li>
            All learned models clearly beat <strong>Persistence</strong> and{' '}
            <strong>Decision Tree</strong>, confirming that both temporal
            depth and spatial structure carry signal.
          </li>
          <li>
            The <strong>Graph Transformer</strong> was an initial
            CPU-constrained experimental configuration (33,073 parameters,
            1 layer) and did not outperform the baselines; it remains a
            documented ablation rather than the headline model.
          </li>
        </ul>
      </section>
    </div>
  )
}

function familyLabel(family) {
  switch (family) {
    case 'baseline':
      return 'naive baseline'
    case 'classical':
      return 'classical ML'
    case 'deep':
      return 'deep learning'
    case 'graph':
      return 'graph neural network'
    default:
      return family || ''
  }
}
