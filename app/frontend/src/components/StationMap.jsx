import { CircleMarker, MapContainer, Popup, Polyline, TileLayer, Tooltip } from 'react-leaflet'

// Circle markers avoid Leaflet's default icon asset issues entirely.
export default function StationMap({
  stations = [],
  values = {},
  edges = [],
  onSelect,
  selected = null,
  height = 420,
}) {
  const speeds = Object.values(values).filter((v) => typeof v === 'number')
  const maxSpeed = speeds.length ? Math.max(...speeds, 1) : 1

  const colorFor = (name) => {
    const v = values[name]
    if (typeof v !== 'number') return '#64748b'
    const t = Math.min(v / maxSpeed, 1)
    // slate -> amber -> rose scale
    if (t < 0.5) return t > 0.25 ? '#f59e0b' : '#38bdf8'
    return t > 0.75 ? '#ef4444' : '#f97316'
  }

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <MapContainer
        center={[10.4, 78.3]}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {edges.map((e, i) => {
          const a = stations.find((s) => s.station === e.source)
          const b = stations.find((s) => s.station === e.target)
          if (!a || !b) return null
          return (
            <Polyline
              key={`${e.source}-${e.target}-${i}`}
              positions={[
                [a.lat, a.lon],
                [b.lat, b.lon],
              ]}
              pathOptions={{
                color: '#6366f1',
                weight: 1 + e.weight * 4,
                opacity: 0.35 + e.weight * 0.4,
              }}
            />
          )
        })}

        {stations.map((s) => {
          const v = values[s.station]
          const active = selected === s.station
          return (
            <CircleMarker
              key={s.station}
              center={[s.lat, s.lon]}
              radius={active ? 11 : 8}
              pathOptions={{
                color: active ? '#0f172a' : '#ffffff',
                weight: 2,
                fillColor: colorFor(s.station),
                fillOpacity: 0.95,
              }}
              eventHandlers={onSelect ? { click: () => onSelect(s.station) } : undefined}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <span className="text-xs font-semibold">
                  {s.station}
                  {typeof v === 'number' ? ` — ${v.toFixed(2)} km/h` : ''}
                </span>
              </Tooltip>
              {onSelect && (
                <Popup>
                  <strong>{s.station}</strong>
                  {typeof v === 'number' && (
                    <div className="text-xs">Wind: {v.toFixed(2)} km/h</div>
                  )}
                  <button
                    type="button"
                    className="mt-1 text-xs text-sky-600 underline"
                    onClick={() => onSelect(s.station)}
                  >
                    View station →
                  </button>
                </Popup>
              )}
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
