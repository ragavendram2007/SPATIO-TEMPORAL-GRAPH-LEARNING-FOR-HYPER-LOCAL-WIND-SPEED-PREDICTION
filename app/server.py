"""
WindWise FastAPI Backend

CPU-only, inference-only.
Lazy-loads artifacts on first request and caches them.
Never reads CSVs per request (uses the cached features DataFrame).
Never trains anything.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from predict import (
    STATIONS,
    X_COLS,
    load_artifacts,
    predict_next_hour,
    get_latest_features,
    get_graph_info,
    get_metrics,
)

APP_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(APP_DIR)

app = FastAPI(
    title="WindWise API",
    version="1.0",
    description=(
        "Next-hour wind speed forecasting for "
        "12 Tamil Nadu stations. "
        "Inference only - no training."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _find_station(name: str):

    for station in STATIONS:

        if station.lower() == name.lower():

            return station

    return None


# ============================================================
# GET /  and  GET /health
# ============================================================

@app.get("/")
def root():

    return {
        "application": "WindWise",
        "description": (
            "Spatio-Temporal Wind Speed Analysis "
            "& Forecasting"
        ),
        "status": "running",
        "endpoints": [
            "/stations",
            "/station/{name}",
            "/predict",
            "/graph",
            "/metrics",
            "/health",
            "/docs",
        ],
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "WindWise API",
        "device": "CPU",
    }


# ============================================================
# GET /stations
# ============================================================

@app.get("/stations")
def stations():

    _, _, _, features = load_artifacts()

    latest = features["time"].max()

    return {
        "stations": STATIONS,
        "count": len(STATIONS),
        "latest_timestamp": str(latest),
    }


# ============================================================
# GET /station/{name}
# ============================================================

@app.get("/station/{name}")
def station_history(name: str):

    station = _find_station(name)

    if station is None:

        return {"error": f"Station '{name}' not found"}

    _, _, _, features = load_artifacts()

    df = (
        features[features["station"] == station]
        .sort_values("time")
        .tail(48)
    )

    records = []

    for _, row in df.iterrows():

        records.append({
            "time": row["time"].isoformat(),
            "wind_speed": round(
                float(row["wind_speed_10m"]),
                2
            ),
            "temperature": round(
                float(row["temperature_2m"]),
                2
            ),
            "humidity": round(
                float(row["relative_humidity_2m"]),
                2
            ),
            "pressure": round(
                float(row["surface_pressure"]),
                2
            ),
            "cloud_cover": round(
                float(row["cloud_cover"]),
                2
            ),
            "precipitation": round(
                float(row["precipitation"]),
                2
            ),
        })

    return {
        "station": station,
        "history": records,
    }


# ============================================================
# GET /graph
# ============================================================

@app.get("/graph")
def graph():

    return get_graph_info()


# ============================================================
# GET /metrics
# ============================================================

@app.get("/metrics")
def metrics():

    return get_metrics()


# ============================================================
# GET /predict
# ============================================================

@app.get("/predict")
def predict():

    features_dict, timestamp = get_latest_features()

    predictions = predict_next_hour(features_dict)

    return {
        "predictions": predictions,
        "unit": "km/h",
        "input_timestamp": str(timestamp),
        "window_hours": 24,
        "model": (
            "Graph Transformer "
            "(33,073 parameters, hybrid graph)"
        ),
    }


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
    )
