import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import About from './pages/About.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ModelComparison from './pages/ModelComparison.jsx'
import Prediction from './pages/Prediction.jsx'
import SpatialExplorer from './pages/SpatialExplorer.jsx'
import StationAnalysis from './pages/StationAnalysis.jsx'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stations" element={<StationAnalysis />} />
          <Route path="/predict" element={<Prediction />} />
          <Route path="/spatial" element={<SpatialExplorer />} />
          <Route path="/models" element={<ModelComparison />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 justify-between">
          <span>
            WindWise — FDS Project · Spatio-temporal wind speed forecasting
          </span>
          <span>
            Data: Open-Meteo Archive API · Inference only — no training in the
            browser or server
          </span>
        </div>
      </footer>
    </div>
  )
}
