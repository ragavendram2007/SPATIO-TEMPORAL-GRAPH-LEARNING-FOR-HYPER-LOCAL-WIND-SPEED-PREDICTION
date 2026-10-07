import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, STATION_NAMES } from '../api.js'
import { ErrorState, Loading } from '../components/States.jsx'
import useFetch from '../hooks/useFetch.js'

function fmtTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

const tooltipStyle = { borderRadius: 8, fontSize: 12 }

function formatMetric(value, digits) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : 'N/A'
}

function ChartCard({ title, unit, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="text-[11px] text-slate-400">{unit}</span>
      </div>
      <div className="mt-3 h-56">{children}</div>
    </div>
  )
}

function MetricCard({ label, value, unit, accent = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${accent}`}>
        {value}{' '}
        <span className="text-[11px] font-normal text-slate-400">{unit}</span>
      </div>
    </div>
  )
}

export default function StationAnalysis() {
  const [station, setStation] = useState('Chennai')
  const [hours, setHours] = useState(48)

  const { data, loading, error, refetch } = useFetch(
    () => api.station(station),
    [station],
  )

  const rows = useMemo(() => {
    if (!data?.history) return []
    return data.history.map((r) => ({ ...r, t: fmtTime(r.time) }))
  }, [data])

  const shown = rows.slice(-hours)
  const latest = rows[rows.length - 1]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Station Analysis
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Historical weather variables from the frozen feature dataset
            (archive, not live weather).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-500" htmlFor="station-select">
            Station
          </label>
          <select
            id="station-select"
            value={station}
            onChange={(e) => setStation(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {STATION_NAMES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-medium">
            {[24, 48].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHours(h)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  hours === h
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <Loading label={`Loading ${station} history…`} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && latest && (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Wind speed" value={formatMetric(latest.wind_speed, 1)} unit="km/h" accent="text-sky-600" />
            <MetricCard label="Temperature" value={formatMetric(latest.temperature, 1)} unit="°C" accent="text-orange-500" />
            <MetricCard label="Humidity" value={formatMetric(latest.humidity, 0)} unit="%" accent="text-cyan-600" />
            <MetricCard label="Pressure" value={formatMetric(latest.pressure, 0)} unit="hPa" accent="text-slate-700" />
            <MetricCard label="Precipitation" value={formatMetric(latest.precipitation, 1)} unit="mm" accent="text-indigo-500" />
            <MetricCard label="Cloud cover" value={formatMetric(latest.cloud_cover, 0)} unit="%" accent="text-slate-500" />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">
                {station} — last {hours} hours
              </h2>
              <span className="text-[11px] text-slate-400">
                {shown[0]?.time.slice(0, 16).replace('T', ' ')} → {shown[shown.length - 1]?.time.slice(0, 16).replace('T', ' ')}
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={shown} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="windFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} km/h`, 'Wind speed']} />
                  <Area type="monotone" dataKey="wind_speed" stroke="#0ea5e9" strokeWidth={2} fill="url(#windFill)" name="Wind speed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Temperature" unit="°C">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={shown} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} °C`, 'Temperature']} />
                  <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Relative humidity" unit="%">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={shown} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} %`, 'Humidity']} />
                  <Line type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Surface pressure" unit="hPa">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={shown} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} hPa`, 'Pressure']} />
                  <Line type="monotone" dataKey="pressure" stroke="#475569" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Precipitation & cloud cover" unit="mm / %">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={shown} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={30} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar yAxisId="l" dataKey="precipitation" fill="#6366f1" name="Precipitation (mm)" />
                  <Line yAxisId="r" type="monotone" dataKey="cloud_cover" stroke="#94a3b8" strokeWidth={1.5} name="Cloud cover (%)" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>
        </>
      )}

      {!loading && !error && !latest && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No history available for this station.
        </div>
      )}
    </div>
  )
}
