import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, STATION_NAMES } from '../api.js'
import { ErrorState, Loading } from '../components/States.jsx'
import useFetch from '../hooks/useFetch.js'

async function loadPrediction() {
  const [predictions, ...histories] = await Promise.all([
    api.predict(),
    ...STATION_NAMES.map((s) => api.station(s)),
  ])
  const current = {}
  histories.forEach((h) => {
    if (h.history?.length) {
      current[h.station] = h.history[h.history.length - 1].wind_speed
    }
  })
  return { predictions, current }
}

function speedColor(v) {
  if (v >= 18) return 'text-rose-600'
  if (v >= 12) return 'text-amber-600'
  return 'text-emerald-600'
}

export default function Prediction() {
  const { data, loading, error, refetch } = useFetch(loadPrediction)

  if (loading) return <Loading label="Running CPU inference for 12 stations…" />
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    )
  }

  const { predictions, current } = data
  const entries = Object.entries(predictions.predictions || {})

  const chartData = entries.map(([name, value]) => ({
    name,
    value,
    current: current[name],
  }))

  const sorted = [...entries].sort((a, b) => b[1] - a[1])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 px-6 py-7 text-white shadow-md fade-up">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-100">
          Inference-only · CPU · no training
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight">
          Next-hour predicted wind speed
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-sky-50">
          Prediction generated from the latest available 24-hour feature window
          of the frozen dataset. Model: {predictions.model}.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-sky-100">
          <span>Input timestamp: <strong className="text-white">{predictions.input_timestamp}</strong></span>
          <span>Window: <strong className="text-white">{predictions.window_hours} h</strong></span>
          <span>Horizon: <strong className="text-white">+1 hour</strong></span>
          <span>Unit: <strong className="text-white">km/h</strong></span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map(([name, value], i) => {
          const now = current[name]
          const delta = typeof now === 'number' ? value - now : null
          return (
            <div
              key={name}
              className={`fade-up-${(i % 3) + 1} rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{name}</h3>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                  +1 h
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current</span>
                  <span className="tabular-nums text-slate-700">
                    {typeof now === 'number' ? now.toFixed(2) : '—'}{' '}
                    <span className="text-[10px] text-slate-400">km/h</span>
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                  <span className="text-slate-500">Predicted</span>
                  <span className={`text-lg font-bold tabular-nums ${speedColor(value)}`}>
                    {value.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-400">km/h</span>
                  </span>
                </div>
                {delta !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Change</span>
                    <span className={`tabular-nums text-xs font-medium ${delta >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {delta >= 0 ? '▲ +' : '▼ '}{delta.toFixed(2)} km/h
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Next-hour predicted wind speed by station (km/h)
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" /> Predicted
            </span>
          </div>
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={65} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v, n) => [`${Number(v).toFixed(2)} km/h`, n === 'value' ? 'Predicted' : 'Current']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.value >= 18 ? '#ef4444' : d.value >= 12 ? '#f59e0b' : '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Ranked highest → lowest: {sorted.map(([n, v]) => `${n} ${v.toFixed(1)}`).join(' · ')}
        </p>
      </section>

      <p className="text-xs text-slate-500">
        Data source: Open-Meteo historical archive (frozen dataset) — this is
        not a live weather feed.{' '}
        <Link className="text-sky-600 underline" to="/about">
          How the prediction is produced →
        </Link>
      </p>
    </div>
  )
}
