const PIPELINE = [
  {
    n: '01',
    title: 'Data collection',
    body: 'Hourly weather from the Open-Meteo Archive API for 12 Tamil Nadu stations, January 2024 – June 2026 (262,656 raw rows).',
  },
  {
    n: '02',
    title: 'Data cleaning',
    body: 'Type-aware provenance audit over 11 shared raw columns, zero missing cells, hourly continuity, no duplicates, fixed coordinates.',
  },
  {
    n: '03',
    title: 'EDA',
    body: 'Distribution and outlier analysis across all features; exhaustive check of 18.9 M feature cells against physical plausibility bounds.',
  },
  {
    n: '04',
    title: 'Feature engineering',
    body: '20 features per hour: raw weather variables, wind-direction sin/cos, lags (1/3/6/24 h), rolling stats (3/6/24 h), calendar fields and a neighbour-weighted wind feature.',
  },
  {
    n: '05',
    title: 'Chronological splitting',
    body: 'Train ≤ 2025-12-31 · Validation Jan–Mar 2026 · Test Apr–Jun 2026. Strictly time-ordered — no random shuffling.',
  },
  {
    n: '06',
    title: 'Classical baselines',
    body: 'Persistence, Decision Tree, Linear Regression, Random Forest and Gradient Boosting — hyperparameters selected on validation only.',
  },
  {
    n: '07',
    title: 'LSTM',
    body: 'Sequence model over the 24-hour window per station; best epoch chosen on validation with early stopping.',
  },
  {
    n: '08',
    title: 'Spatial analysis',
    body: 'Haversine distances (42–627 km), train-period wind correlations (0.077–0.815) and neighbour-benefit tests — correlation vs distance r = −0.421.',
  },
  {
    n: '09',
    title: 'Hybrid graph',
    body: 'Intersection of geographic k-nearest neighbours (k=4, σ=238 km) and train-correlation ≥ 0.30: 12 nodes, 24 edges, mean degree 4.00.',
  },
  {
    n: '10',
    title: 'Hybrid GAT',
    body: 'LSTM temporal encoder per station + graph attention across stations. Selected on validation; evaluated once on the test set → R² = 0.8214.',
  },
  {
    n: '11',
    title: 'Graph Transformer experiment',
    body: 'CPU-constrained experimental configuration (33,073 parameters, 1 layer) — documented ablation; did not outperform the baselines.',
  },
  {
    n: '12',
    title: 'Evaluation',
    body: 'MAE, RMSE and R² on the untouched test set, averaged across all 12 stations. The test set was touched once, after all choices were frozen.',
  },
]

const STACK = [
  ['Languages', 'Python, JavaScript'],
  ['Data', 'pandas, NumPy, scikit-learn'],
  ['Deep learning', 'PyTorch (CPU)'],
  ['Backend', 'FastAPI, Uvicorn'],
  ['Frontend', 'React, Vite, Tailwind CSS'],
  ['Visualization', 'Recharts, Leaflet'],
]

function Section({ title, children, delay = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${delay}`}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

export default function About() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          About &amp; Methodology
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          WindWise — spatio-temporal graph learning for hyper-local wind-speed
          prediction across Tamil Nadu. This page documents the complete
          project pipeline for academic demonstration.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Dataset" delay="fade-up-1">
          <ul className="space-y-1.5">
            <li><strong>Source:</strong> Open-Meteo Historical Weather API</li>
            <li><strong>Stations:</strong> 12 across Tamil Nadu</li>
            <li><strong>Resolution:</strong> hourly</li>
            <li><strong>Period:</strong> Jan 2024 – Jun 2026</li>
            <li><strong>Input features:</strong> 20</li>
            <li><strong>Window:</strong> 24 hours in → 1 hour ahead out</li>
          </ul>
        </Section>

        <Section title="Spatial graph" delay="fade-up-1">
          <ul className="space-y-1.5">
            <li>Hybrid of geographic proximity and wind correlation</li>
            <li><strong>Edges:</strong> 24 (of 66 possible)</li>
            <li><strong>Mean degree:</strong> 4.00 · density 0.364</li>
            <li>
              <strong>Strongest relationship:</strong> Thanjavur–Tiruchirappalli
              (weight 0.9958)
            </li>
          </ul>
        </Section>

        <Section title="Evaluation" delay="fade-up-2">
          <ul className="space-y-1.5">
            <li><strong>MAE</strong> — mean absolute error (km/h)</li>
            <li><strong>RMSE</strong> — root mean squared error (km/h)</li>
            <li><strong>R²</strong> — coefficient of determination</li>
            <li>
              <strong>Split:</strong> chronological train / validation / test,
              selected on validation only
            </li>
            <li>
              <strong>Leakage prevention:</strong> features at hour t predict
              t+1; all scalers fitted on train only; correlations computed on
              train only; exhaustive leakage audit passed
            </li>
          </ul>
        </Section>
      </div>

      <Section title="Methodology pipeline" delay="fade-up-2">
        <ol className="mt-1 space-y-3">
          {PIPELINE.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                <p className="text-sm text-slate-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="The model" delay="fade-up-3">
          <p>
            LSTM learns temporal wind patterns per station, while Graph
            Attention learns the importance of connected stations. For each
            hour, a sequence of 20 features over 24 hours is encoded
            per-station; graph attention then mixes information across the
            hybrid adjacency so that, for example, Tiruchirappalli can borrow
            signal from its strongly correlated neighbour Thanjavur. The fused
            representation is decoded to a single next-hour wind speed.
          </p>
          <p className="mt-3">
            The strongest evaluated model is the <strong>Hybrid GAT</strong>{' '}
            (test R² = 0.8214). The Graph Transformer on this site is an
            initial CPU-constrained experimental configuration (33,073
            parameters) that did not outperform the baselines.
          </p>
        </Section>

        <Section title="Technology stack" delay="fade-up-3">
          <dl className="divide-y divide-slate-100">
            {STACK.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {k}
                </dt>
                <dd className="text-right text-sm text-slate-700">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            The web application performs inference only — no training ever runs
            when the site is open.
          </p>
        </Section>
      </div>
    </div>
  )
}
