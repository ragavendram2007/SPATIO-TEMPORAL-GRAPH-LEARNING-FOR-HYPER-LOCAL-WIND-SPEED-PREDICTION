const BASE = ''

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${path}`)
  }
  return res.json()
}

export const api = {
  health: () => get('/health'),
  stations: () => get('/stations'),
  station: (name) => get(`/station/${encodeURIComponent(name)}`),
  predict: () => get('/predict'),
  graph: () => get('/graph'),
  metrics: () => get('/metrics'),
}

export const STATION_NAMES = [
  'Chennai',
  'Coimbatore',
  'Dindigul',
  'Erode',
  'Madurai',
  'Nagercoil',
  'Salem',
  'Thanjavur',
  'Thoothukkudi',
  'Tiruchirappalli',
  'Tirunelveli',
  'Vellore',
]
