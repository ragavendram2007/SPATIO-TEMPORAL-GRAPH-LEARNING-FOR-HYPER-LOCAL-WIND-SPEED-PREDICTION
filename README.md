# Spatio-Temporal Graph Transformer for Hyper-Local Wind Speed Prediction

A full Data Science pipeline analyzing multi-station weather data across 12 major
cities in Tamil Nadu, discovering spatial/temporal wind patterns, and building
forecasting models — from classical ML baselines to deep learning (LSTM) with
graph-aware spatial features.

> **Project status (honest):** The Data Science pipeline is validated (16/16 audit)
> and the **12-station baseline is LOCKED** (Persistence, Linear Regression,
> Decision Tree, Random Forest, Gradient Boosting, LSTM — validation-based model
> selection, 11/11 implementation audit). The multi-station Graph Transformer is
> the planned next stage — foundations (station relationships, adjacency
> structure, neighbour features) are done.

## Project Structure

```
FDS Project/
├── data/
│   ├── raw/         # Raw hourly data from Open-Meteo Archive API (12 stations)
│   ├── processed/   # Cleaned, normalized, engineered features + analysis outputs
│   └── final/       # Final master datasets
├── models/          # Trained models (sklearn .joblib + PyTorch .pt for all 12 stations)
├── notebooks/       # (planned) Jupyter notebooks per phase
├── src/             # Reusable modules (config, data_collector)
├── visualizations/  # 15+ professional charts
├── reports/         # Leakage audit report + mentor explanation guide
└── *.py             # Phase pipeline scripts
```

## Pipeline Phases

| Phase | Name | Status | Key Outputs |
|-------|------|--------|-------------|
| 1 | Data Collection | COMPLETE | `data/raw/master_raw.csv` — 262,656 rows, 12 stations, 2024-01-01 → 2026-06-30 |
| 2 | Data Engineering | COMPLETE | `cleaned.csv`, `cleaned_leakfree.csv` — missing values (none found), train-only outlier clipping, MinMax |
| 3 | EDA | COMPLETE | 7 charts — windiest station: Nagercoil (13.15 km/h), windiest month: July, season: Monsoon, peak hour: 15:00 |
| 4 | Spatial Analysis | COMPLETE | `distance_matrix.csv`, `spatial_correlation.csv`, `lag_correlations.csv` — top pair: Thanjavur~Tiruchirappalli (r=0.81) |
| 5 | Feature Engineering | COMPLETE | 15+ leak-free features: lags (1/3/6/24h), rolling means, temporal features, neighbour-weighted wind |
| 6 | Pattern Discovery | COMPLETE | K-Means: 3 wind-regime clusters; DBSCAN; anomaly detection; extreme event analysis |
| 7 | Baseline Models | COMPLETE | Persistence, Linear Regression, Decision Tree, Random Forest, Gradient Boosting (corrected setup) |
| 8 | Deep Learning | COMPLETE | LSTM trained for ALL 12 stations (`.pt` + scalers saved in `models/`) |
| 9 | Validation & Leakage Audit | COMPLETE | `reports/leakage_audit_report.md`, `temporal_leakage_audit.csv` |
| 10 | Final Validation Audit v3 | COMPLETE | `reports/final_validation_audit_v3.csv` — **16/16 PASS** (provenance, continuity, duplicates, coordinates, exhaustive train-only clipping, lags 1/3/24h, rolls 3/6h, target t+1, neighbour, all 12 scalers, split) |
| 11 | 12-Station Baseline (locked) | COMPLETE | `data/processed/final_baseline_metrics.csv`, `reports/locked_baseline_metrics.md` — 6 models × 12 stations, validation-based selection, implementation audit 11/11 PASS |
| 12 | Graph Transformer | PLANNED | Next stage — compare against LSTM R²≈0.789, not the flawed 0.998 |

## Methodology — Leakage-Free Evaluation

All reported metrics come from a **corrected, leakage-free setup**:

1. **Temporal audit:** every feature at time t uses only information available at
   or before t (verified feature-by-feature, see `temporal_leakage_audit.csv`).
2. **True forecasting setup:** features at hour t predict wind at hour t+1.
   The leakage that previously allowed R²=1.00 (Linear Regression) was removed:
   rolling windows no longer contain the target row, and the `ws_accel` feature
   (which directly contained the target) was dropped.
3. **Chronological splits** (no shuffle):
   - Train: Jan 2024 – Dec 2025
   - Validation: Jan 2026 – Mar 2026
   - Test: Apr 2026 – Jun 2026 (never seen by the model)
4. **Train-only preprocessing:** scalers and outlier clip thresholds are computed
   on training data only, then applied to validation/test.
5. **Missing-value gap audit:** raw data has zero missing values; forward-fill was
   never applied, so no long-gap distortion exists.

## Results (Corrected, Leakage-Free, LOCKED)

### 12-station baseline — mean over all 12 stations (test: Apr–Jun 2026)

**Protocol (audited, 11/11 PASS):** features at time t → wind at t+1; chronological
split (Train ≤ 2025-12-31, Val Jan–Mar 2026, Test Apr–Jun 2026); train-only
scalers; hyperparameters (DT `max_depth`, RF/GB `n_estimators`) and LSTM best
epoch selected on **validation**; selected classical models retrained on
Train+Validation; test evaluated once. Details: `reports/locked_baseline_metrics.md`.

| Model | MAE (km/h) | RMSE (km/h) | R² |
|-------|-----------|-------------|-----|
| **LSTM (24h window)** | **1.690** | **2.302** | **0.789** |
| Random Forest | 1.687 | 2.316 | 0.785 |
| Gradient Boosting | 1.691 | 2.320 | 0.784 |
| Linear Regression | 1.791 | 2.456 | 0.759 |
| Decision Tree | 1.856 | 2.564 | 0.737 |
| Persistence (ws[t]) | 1.936 | 2.713 | 0.705 |

**Defensible conclusion:** under the validated leak-free setup, the LSTM and the
ensemble models (RF/GB) outperform persistence (R² 0.705) by ~0.08–0.09 R² and
MAE ≈ 1.69 km/h. The LSTM wins best-per-station on 7/12 stations (e.g., Nagercoil
R² = 0.920) — with an aligned causal 24h window and validation-based best-epoch
selection, the temporal model is competitive with, and slightly ahead of, the
feature-engineered classical ensembles.

> Note: R² is **not** "accuracy". R²≈0.79 means the model explains ~79% of the
> variance in wind speed; MAE≈1.69 km/h means predictions are on average off by
> ~1.69 km/h. A perfect score of R²=1.00 is impossible for real forecasting.

### Per-station R² (test: Apr–Jun 2026)

| Station | Persistence | LR | DT | RF | GB | LSTM |
|---------|-------------|----|----|----|-----|------|
| Nagercoil | 0.889 | 0.904 | 0.904 | **0.922** | 0.920 | 0.920 |
| Tiruchirappalli | 0.799 | 0.830 | 0.807 | 0.850 | **0.851** | 0.847 |
| Thoothukkudi | 0.768 | 0.815 | 0.790 | **0.833** | 0.829 | 0.827 |
| Coimbatore | 0.771 | 0.810 | 0.784 | 0.819 | 0.829 | **0.831** |
| Thanjavur | 0.729 | 0.772 | 0.746 | 0.796 | 0.793 | **0.804** |
| Tirunelveli | 0.723 | 0.781 | 0.758 | 0.800 | 0.800 | **0.802** |
| Madurai | 0.702 | 0.755 | 0.745 | 0.784 | 0.787 | **0.793** |
| Chennai | 0.663 | 0.714 | 0.670 | 0.747 | 0.752 | **0.756** |
| Vellore | 0.673 | 0.719 | 0.705 | **0.762** | 0.754 | 0.757 |
| Erode | 0.623 | 0.703 | 0.682 | **0.731** | 0.729 | 0.726 |
| Salem | 0.556 | 0.649 | 0.623 | 0.684 | 0.676 | **0.700** |
| Dindigul | 0.561 | 0.654 | 0.631 | 0.692 | 0.693 | **0.700** |

Full per-station table: `data/processed/baseline_12_stations.csv`,
`data/processed/lstm_12_best.csv`, `data/processed/final_baseline_metrics.csv`.

### Graph Transformer — status

- **NOT yet implemented.** The implemented deep-learning model is a
  single-station LSTM; the Graph Transformer is the planned next stage.
- Foundations completed: station correlation matrix, distance matrix, lag
  correlations, adjacency structure, and distance-weighted neighbour features.
- **Correct benchmark for the Graph Transformer: LSTM R² ≈ 0.789 / MAE ≈ 1.69**
  (12-station mean, locked baseline — not 0.998, which came from the flawed
  setup and must not be used).

## How to Reproduce

```bash
pip install requests pandas numpy matplotlib seaborn scikit-learn torch joblib pyarrow

# Phase 1: Data collection (needs internet)
python collect_all.py

# Phases 2-4: Cleaning, EDA, Spatial analysis
python phases_2_4.py

# Phases 5-6: Feature engineering + Pattern discovery
python phases_5_6.py

# Issue 2+3 fix: train-only preprocessing + gap audit
python fix_cleaning.py

# Canonical leak-free feature set (audited) + train-only scalers
python build_features_leakfree.py
python save_scalers_all.py

# Final validation audit (16/16 PASS expected)
python final_audit_v3.py

# 12-station baseline: classical + LSTM (validation-based selection)
python baseline_12_stations.py
python train_lstm_all.py

# Baseline implementation audit + lock
python baseline_audit.py
python lock_baseline.py
```

## Next Steps

1. **Graph Transformer** — multi-station spatio-temporal model with attention
   over the station graph (adjacency from spatial correlations). Compare against
   LSTM R²≈0.789 / MAE≈1.69 (locked baseline).
2. Multi-horizon forecasting (3h/6h/24h ahead).
3. ERA5/IMD cross-validation of Open-Meteo data.
4. Jupyter notebooks + final report + PPT.