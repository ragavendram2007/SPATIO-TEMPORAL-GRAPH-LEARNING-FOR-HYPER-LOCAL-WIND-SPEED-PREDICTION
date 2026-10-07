import { Link } from 'react-router-dom'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { api, STATION_NAMES } from '../api.js'
import { ErrorState, Loading } from '../components/States.jsx'
import StationMap from '../components/StationMap.jsx'
import useFetch from '../hooks/useFetch.js'

const PIPELINE = [
  'Open-Meteo data',
  'Preprocessing',
  'Feature engineering',
  'Hybrid graph',
  'LSTM temporal + GAT spatial',
  'Next-hour prediction',
  'Dashboard',
]

async function loadDashboard() {
  const [stations, predictions, graph, ...histories] = await Promise.all([
    api.stations(),
    api.predict(),
    api.graph(),
    ...STATION_NAMES.map((s) => api.station(s)),
  ])
  return { stations, predictions, graph, histories }
}

function Stat({ value, label, delay = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${delay}`}>
      <div className="text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, loading, error, refetch } = useFetch(loadDashboard)

  if (loading) return <Loading label="Loading dashboard…" />
  if (error) return <div className="mx-auto max-w-7xl px-4 py-8"><ErrorState message={error} onRetry={refetch} /></div>

  const { stations, predictions, graph, histories } = data

  const current = {}
  histories.forEach((h) => {
    if (h.history?.length) {
      current[h.station] = h.history[h.history.length - 1].wind_speed
    }
  })

  const predEntries = Object.entries(predictions.predictions || {})
  const chartData = predEntries.map(([name, value]) => ({ name, value }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero */}
      <section className="fade-up rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-8 sm:px-10 sm:py-10 text-white shadow-lg">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
          FDS Project · Spatio-Temporal Machine Learning
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          WindWise
        </h1>
        <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-300">
          Spatio-temporal wind speed analysis and 1-hour-ahead forecasting for
          12 stations across Tamil Nadu. A hybrid graph attention network
          combines a per-station LSTM temporal encoder with attention over a
          learned station-to-station correlation graph.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/predict"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 transition-colors"
          >
            View next-hour predictions →
          </Link>
          <Link
            to="/models"
            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Model comparison
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat value="12" label="Stations" delay="fade-up-1" />
        <Stat value="20" label="Features" delay="fade-up-1" />
        <Stat value="24 h" label="Input window" delay="fade-up-2" />
        <Stat value="1 h" label="Forecast horizon" delay="fade-up-2" />
        <Stat value="0.8214" label="Best R² (Hybrid GAT)" delay="fade-up-3" />
      </section>

      <p className="text-xs text-slate-500 -mt-4">
        Latest available dataset timestamp:{' '}
        <span className="font-medium text-slate-700">
          {stations.latest_timestamp}
        </span>{' '}
        (historical archive, not a live feed)
      </p>

      {/* Pipeline */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Modeling pipeline
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {PIPELINE.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2.5 py-1.5 font-medium text-slate-700 border border-slate-200">
                {step}
              </span>
              {i < PIPELINE.length - 1 && (
                <span className="text-slate-400">→</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* Map + prediction summary */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 fade-up-1">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Station map — latest observed wind speed
            </h2>
            <span className="text-[11px] text-slate-400">Tamil Nadu, India</span>
          </div>
          <StationMap
            stations={graph.stations || []}
            values={current}
            height={430}
          />
        </div>

        <div className="lg:col-span-2 fade-up-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">
              Next-hour prediction summary
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Model: {predictions.model} · input {predictions.input_timestamp} ·
              window {predictions.window_hours} h
            </p>
            <ul className="mt-3 divide-y divide-slate-100 max-h-72 overflow-auto pr-1">
              {predEntries.map(([name, value]) => (
                <li key={name} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-slate-600">{name}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {value.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-400">km/h</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Prediction bar chart */}
      <section className="fade-up-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">
          Next-hour predicted wind speed by station (km/h)
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [`${v.toFixed(2)} km/h`, 'Predicted']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
