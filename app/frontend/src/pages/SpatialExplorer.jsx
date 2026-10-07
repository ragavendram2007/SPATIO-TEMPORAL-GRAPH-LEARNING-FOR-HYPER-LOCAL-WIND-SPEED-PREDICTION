import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../api.js'
import { ErrorState, Loading } from '../components/States.jsx'
import StationMap from '../components/StationMap.jsx'
import useFetch from '../hooks/useFetch.js'

export default function SpatialExplorer() {
  const { data, loading, error, refetch } = useFetch(api.graph)
  const [hover, setHover] = useState(null)
  const [selected, setSelected] = useState(null)

  const edges = data?.edges || []
  const stats = data?.statistics || []
  const edgesAll = data?.edges_all || []

  const sortedEdges = useMemo(
    () => [...edges].sort((a, b) => b.weight - a.weight),
    [edges],
  )

  const hybridStats = stats.find((s) => s.graph === 'Hybrid')

  const allGraphEdges = useMemo(
    () =>
      ['Geographic', 'Correlation', 'Hybrid'].map((g) => ({
        graph: g,
        count: edgesAll.filter((e) => e.graph === g).length,
      })),
    [edgesAll],
  )

  if (loading) return <Loading label="Loading graph data…" />
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    )
  }

  const visibleEdges = selected
    ? sortedEdges.filter((e) => e.source === selected || e.target === selected)
    : sortedEdges

  const filteredStations = selected
    ? data.stations.filter(
        (s) =>
          s.station === selected ||
          sortedEdges.some(
            (e) =>
              (e.source === selected && e.target === s.station) ||
              (e.target === selected && e.source === s.station),
          ),
      )
    : data.stations

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Spatial Relationship Explorer
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          The real hybrid station graph: edges are drawn from{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
            adjacency_hybrid.csv
          </code>{' '}
          — the intersection of geographic proximity (k-nearest neighbours) and
          train-period wind correlation. No fabricated relationships.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Nodes" value={hybridStats?.nodes ?? '—'} />
        <Stat label="Hybrid edges" value={hybridStats?.undirected_edges ?? edges.length} />
        <Stat label="Density" value={hybridStats ? hybridStats.density.toFixed(3) : '—'} />
        <Stat label="Max weight" value={hybridStats ? hybridStats.max_weight.toFixed(4) : '—'} />
        <Stat label="Mean degree" value={hybridStats ? hybridStats.mean_degree.toFixed(2) : '—'} />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Hybrid graph — edge thickness ∝ correlation weight
            </h2>
            {selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-sky-600 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>
          <StationMap
            stations={data.stations}
            edges={visibleEdges}
            selected={selected}
            onSelect={(s) => setSelected((prev) => (prev === s ? null : s))}
            height={460}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">
              Edges {selected ? `of ${selected}` : '(hybrid)'}
            </h2>
            <p className="text-[11px] text-slate-400">
              Click a station on the map to filter its neighbours.
            </p>
            <ul className="mt-3 divide-y divide-slate-100 max-h-[380px] overflow-auto pr-1">
              {visibleEdges.map((e) => (
                <li
                  key={`${e.source}-${e.target}`}
                  className="py-2"
                  onMouseEnter={() => setHover(`${e.source}-${e.target}`)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      {e.source} <span className="text-slate-300">↔</span> {e.target}
                    </span>
                    <span className="tabular-nums font-semibold text-indigo-600">
                      {e.weight.toFixed(4)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        hover === `${e.source}-${e.target}` ? 'bg-indigo-500' : 'bg-indigo-400'
                      }`}
                      style={{ width: `${Math.max(e.weight * 100, 3)}%` }}
                    />
                  </div>
                </li>
              ))}
              {visibleEdges.length === 0 && (
                <li className="py-6 text-center text-xs text-slate-400">
                  No edges for this station.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Graph statistics
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-2 font-medium">Graph</th>
                  <th className="pb-2 font-medium text-right">Edges</th>
                  <th className="pb-2 font-medium text-right">Density</th>
                  <th className="pb-2 font-medium text-right">Mean deg.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((s) => (
                  <tr key={s.graph} className={s.graph === 'Hybrid' ? 'bg-indigo-50/60' : ''}>
                    <td className="py-2 font-medium text-slate-700">
                      {s.graph}
                      {s.graph === 'Hybrid' && (
                        <span className="ml-1.5 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          selected
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.undirected_edges}</td>
                    <td className="py-2 text-right tabular-nums">{s.density.toFixed(3)}</td>
                    <td className="py-2 text-right tabular-nums">{s.mean_degree.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            Hybrid edge weights
          </h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedEdges.map((e) => ({
                  name: `${e.source.split(' ')[0]}–${e.target.split(' ')[0]}`,
                  weight: e.weight,
                }))}
                margin={{ top: 5, right: 10, left: -20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="weight" radius={[3, 3, 0, 0]}>
                  {sortedEdges.map((e) => (
                    <Cell
                      key={`${e.source}-${e.target}`}
                      fill={e.weight >= 0.8 ? '#4f46e5' : e.weight >= 0.5 ? '#818cf8' : '#c7d2fe'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            Edge count by graph construction
          </h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={allGraphEdges}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="graph" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Geographic: k-nearest neighbours (k=4, σ=238 km) · Correlation:
            train-period wind correlation ≥ 0.30 · Hybrid: intersection of both
            (12 nodes, 24 edges).
          </p>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  )
}
