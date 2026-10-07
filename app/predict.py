"""
WindWise - CPU-Friendly Graph Transformer Inference

Input:
    24 hours × 12 stations × 20 features

Output:
    Next-hour wind speed for 12 stations

This module performs inference only.
No training takes place.
"""

from __future__ import annotations

import os
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn


# ============================================================
# CPU SAFETY
# ============================================================

# Prevent PyTorch from occupying the entire laptop CPU.
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

DEVICE = torch.device("cpu")


# ============================================================
# PROJECT PATHS
# ============================================================

APP_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(APP_DIR)

MODELS = os.path.join(PROJECT_ROOT, "models")

GRAPH_DIR = os.path.join(
    PROJECT_ROOT,
    "data",
    "processed",
    "graph"
)

PROC_DIR = os.path.join(
    PROJECT_ROOT,
    "data",
    "processed"
)

MODEL_PATH = os.path.join(
    MODELS,
    "graph_transformer",
    "graph_transformer.pt"
)

FEATURE_FILE = os.path.join(
    PROC_DIR,
    "features_leakfree.csv"
)

ADJ_FILE = os.path.join(
    GRAPH_DIR,
    "adjacency_hybrid.csv"
)


# ============================================================
# CONFIGURATION
# ============================================================

STATIONS = [
    "Chennai",
    "Coimbatore",
    "Dindigul",
    "Erode",
    "Madurai",
    "Nagercoil",
    "Salem",
    "Thanjavur",
    "Thoothukkudi",
    "Tiruchirappalli",
    "Tirunelveli",
    "Vellore",
]

X_COLS = [
    "wind_speed_10m",
    "temperature_2m",
    "relative_humidity_2m",
    "surface_pressure",
    "precipitation",
    "cloud_cover",
    "wind_dir_sin",
    "wind_dir_cos",
    "ws_lag_1h",
    "ws_lag_3h",
    "ws_lag_6h",
    "ws_lag_24h",
    "ws_roll_3h",
    "ws_roll_6h",
    "ws_roll_24h",
    "ws_std_6h",
    "hour",
    "dayofweek",
    "is_weekend",
    "ws_neighbour_weighted",
]

SEQ_LEN = 24
N_FEATURES = 20
N_STATIONS = 12

HIDDEN = 48
N_HEADS = 4
N_LAYERS = 1


# ============================================================
# TEMPORAL TRANSFORMER
# ============================================================

class TemporalTransformer(nn.Module):

    def __init__(
        self,
        n_feat: int,
        hidden: int,
        n_heads: int,
        n_layers: int,
    ):
        super().__init__()

        self.proj = nn.Linear(
            n_feat,
            hidden
        )

        self.pos = nn.Parameter(
            torch.randn(1, SEQ_LEN, hidden) * 0.02
        )

        layer = nn.TransformerEncoderLayer(
            d_model=hidden,
            nhead=n_heads,
            dim_feedforward=hidden * 2,
            dropout=0.1,
            batch_first=True,
            activation="gelu",
        )

        self.transformer = nn.TransformerEncoder(
            layer,
            num_layers=n_layers,
        )

        self.norm = nn.LayerNorm(hidden)

    def forward(self, x):

        x = self.proj(x)

        x = x + self.pos

        x = self.transformer(x)

        x = self.norm(x)

        return x


# ============================================================
# SPATIAL GRAPH ATTENTION
# ============================================================

class SpatialGraphAttention(nn.Module):

    def __init__(
        self,
        hidden: int,
        n_heads: int,
    ):
        super().__init__()

        self.n_heads = n_heads

        self.d_k = hidden // n_heads

        self.W_q = nn.Linear(
            hidden,
            hidden
        )

        self.W_k = nn.Linear(
            hidden,
            hidden
        )

        self.W_v = nn.Linear(
            hidden,
            hidden
        )

        self.norm = nn.LayerNorm(hidden)

    def forward(self, x, adj):

        B, N, _ = x.shape

        Q = self.W_q(x).view(
            B,
            N,
            self.n_heads,
            self.d_k
        )

        K = self.W_k(x).view(
            B,
            N,
            self.n_heads,
            self.d_k
        )

        V = self.W_v(x).view(
            B,
            N,
            self.n_heads,
            self.d_k
        )

        scores = torch.einsum(
            "bnhd,bmhd->bnhm",
            Q,
            K
        )

        scores = scores / (self.d_k ** 0.5)

        # Graph mask
        mask = adj.unsqueeze(0).unsqueeze(2)

        scores = scores.masked_fill(
            mask == 0,
            float("-inf")
        )

        attention = torch.softmax(
            scores,
            dim=-1
        )

        out = torch.einsum(
            "bnhm,bmhd->bnhd",
            attention,
            V
        )

        out = out.reshape(
            B,
            N,
            self.n_heads * self.d_k
        )

        return self.norm(out + x)


# ============================================================
# GRAPH TRANSFORMER
# ============================================================

class GraphTransformer(nn.Module):

    def __init__(
        self,
        n_feat: int,
        hidden: int = 48,
        n_heads: int = 4,
        n_layers: int = 1,
    ):
        super().__init__()

        self.temporal = TemporalTransformer(
            n_feat,
            hidden,
            n_heads,
            n_layers,
        )

        self.spatial = SpatialGraphAttention(
            hidden,
            n_heads,
        )

        self.head = nn.Sequential(
            nn.Linear(
                hidden * 2,
                hidden
            ),

            nn.GELU(),

            nn.Dropout(0.1),

            nn.Linear(
                hidden,
                1
            ),
        )

    def forward(self, x, adj):

        B, T, N, F = x.shape

        # ----------------------------------------
        # Temporal representation
        # ----------------------------------------

        x_temporal = x.permute(
            0,
            2,
            1,
            3
        )

        x_temporal = x_temporal.reshape(
            B * N,
            T,
            F
        )

        x_temporal = self.temporal(
            x_temporal
        )

        # Last timestep representation
        x_temporal = x_temporal[:, -1, :]

        x_temporal = x_temporal.view(
            B,
            N,
            -1
        )

        # ----------------------------------------
        # Spatial representation
        # ----------------------------------------

        x_spatial = self.spatial(
            x_temporal,
            adj
        )

        # ----------------------------------------
        # Fusion
        # ----------------------------------------

        combined = torch.cat(
            [
                x_temporal,
                x_spatial,
            ],
            dim=-1
        )

        output = self.head(
            combined
        )

        return output.squeeze(-1)


# ============================================================
# ARTIFACT MANAGER
# ============================================================

@lru_cache(maxsize=1)
def load_artifacts():

    print("Loading WindWise inference artifacts...")

    # ----------------------------------------
    # Graph
    # ----------------------------------------

    adj_df = pd.read_csv(
        ADJ_FILE,
        index_col=0
    )

    # Ensure station order matches model
    adj_df = adj_df.loc[
        STATIONS,
        STATIONS
    ]

    adjacency = torch.tensor(
        adj_df.values,
        dtype=torch.float32,
        device=DEVICE,
    )

    # ----------------------------------------
    # Model
    # ----------------------------------------

    model = GraphTransformer(
        n_feat=N_FEATURES,
        hidden=HIDDEN,
        n_heads=N_HEADS,
        n_layers=N_LAYERS,
    )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=True,
    )

    model.load_state_dict(
        checkpoint
    )

    model.to(DEVICE)

    model.eval()

    # ----------------------------------------
    # Scalers
    # ----------------------------------------

    scalers = {}

    for station in STATIONS:

        scaler_path = os.path.join(
            MODELS,
            f"scaler_{station.lower()}.joblib"
        )

        scalers[station] = joblib.load(
            scaler_path
        )

    # ----------------------------------------
    # Frozen feature dataset
    # ----------------------------------------

    features = pd.read_csv(
        FEATURE_FILE,
        parse_dates=["time"],
    )

    features = features.sort_values(
        ["station", "time"]
    )

    parameter_count = sum(
        p.numel()
        for p in model.parameters()
    )

    print(
        f"Model loaded: {parameter_count:,} parameters"
    )

    print(
        f"Graph: {len(STATIONS)} stations"
    )

    print(
        f"Features: {len(X_COLS)}"
    )

    print(
        f"Sequence: {SEQ_LEN} hours"
    )

    print("CPU threads: 1")

    return model, adjacency, scalers, features


# ============================================================
# PREDICTION
# ============================================================

def predict_next_hour(features_dict):

    model, adjacency, scalers, _ = load_artifacts()

    # Validate stations
    missing = [
        s for s in STATIONS
        if s not in features_dict
    ]

    if missing:
        raise ValueError(
            f"Missing stations: {missing}"
        )

    # --------------------------------------------------------
    # Build input tensor
    # --------------------------------------------------------

    X = np.zeros(
        (
            1,
            SEQ_LEN,
            N_STATIONS,
            N_FEATURES,
        ),
        dtype=np.float32,
    )

    for station_idx, station in enumerate(STATIONS):

        raw = np.asarray(
            features_dict[station],
            dtype=np.float32,
        )

        if raw.shape != (
            SEQ_LEN,
            N_FEATURES,
        ):
            raise ValueError(
                f"{station}: expected "
                f"({SEQ_LEN}, {N_FEATURES}), "
                f"got {raw.shape}"
            )

        # IMPORTANT:
        # The same per-station feature scaler used during
        # training must be applied here.
        scaled = scalers[station].transform(
            raw
        )

        X[
            0,
            :,
            station_idx,
            :
        ] = scaled

    tensor = torch.from_numpy(X)

    # --------------------------------------------------------
    # CPU inference
    # --------------------------------------------------------

    with torch.inference_mode():

        prediction = model(
            tensor,
            adjacency,
        )

    prediction = prediction.cpu().numpy()[0]

    # Target was NOT scaled during training,
    # so no inverse_transform is required.

    return {
        station: round(
            float(prediction[i]),
            2
        )
        for i, station in enumerate(STATIONS)
    }


# ============================================================
# GET LATEST FROZEN DATA
# ============================================================

def get_latest_features():

    _, _, _, features = load_artifacts()

    result = {}

    latest_time = features["time"].max()

    for station in STATIONS:

        station_df = (
            features[
                features["station"] == station
            ]
            .sort_values("time")
            .tail(SEQ_LEN)
        )

        if len(station_df) != SEQ_LEN:

            raise ValueError(
                f"{station} does not have "
                f"{SEQ_LEN} complete rows."
            )

        result[station] = (
            station_df[X_COLS]
            .to_numpy(dtype=np.float32)
        )

    return result, latest_time


# ============================================================
# GRAPH INFO
# ============================================================

def get_graph_info():

    adj = pd.read_csv(
        os.path.join(
            GRAPH_DIR,
            "adjacency_hybrid.csv"
        ),
        index_col=0
    )

    coords = pd.read_csv(
        os.path.join(
            GRAPH_DIR,
            "station_coordinates.csv"
        )
    )

    edges = []

    for i, source in enumerate(STATIONS):

        for j, target in enumerate(STATIONS):

            if j <= i:
                continue

            weight = float(
                adj.loc[source, target]
            )

            if weight > 0:

                edges.append({
                    "source": source,
                    "target": target,
                    "weight": round(
                        weight,
                        4
                    )
                })

    stats = pd.read_csv(
        os.path.join(
            GRAPH_DIR,
            "graph_statistics.csv"
        )
    )

    edges_all_df = pd.read_csv(
        os.path.join(
            GRAPH_DIR,
            "edges_all.csv"
        )
    )

    return {
        "stations":
            coords.to_dict(
                orient="records"
            ),

        "edges":
            edges,

        "adjacency":
            adj.loc[
                STATIONS,
                STATIONS
            ].values.tolist(),

        "station_order":
            STATIONS,

        "statistics":
            stats.to_dict(
                orient="records"
            ),

        "edges_all":
            edges_all_df.to_dict(
                orient="records"
            ),
    }


# ============================================================
# METRICS
# ============================================================

def get_metrics():

    # Frozen project results (test Apr-Jun 2026, mean of 12 stations).
    # Sources:
    #   data/processed/final_baseline_metrics.csv
    #   data/processed/lstm_12_best.csv
    #   data/processed/gat/gat_results.csv (hybrid row)
    #   data/processed/graph_transformer/gt_results.csv
    return {
        "models": [
            {"name": "Persistence",
             "mae": 1.9356, "rmse": 2.7129, "r2": 0.7047,
             "family": "baseline"},
            {"name": "Linear Regression",
             "mae": 1.7907, "rmse": 2.4557, "r2": 0.7589,
             "family": "classical"},
            {"name": "Decision Tree",
             "mae": 1.8560, "rmse": 2.5640, "r2": 0.7371,
             "family": "classical"},
            {"name": "Random Forest",
             "mae": 1.6871, "rmse": 2.3157, "r2": 0.7850,
             "family": "classical"},
            {"name": "Gradient Boosting",
             "mae": 1.6909, "rmse": 2.3197, "r2": 0.7844,
             "family": "classical"},
            {"name": "LSTM",
             "mae": 1.6897, "rmse": 2.3015, "r2": 0.7887,
             "family": "deep"},
            {"name": "Hybrid GAT",
             "mae": 1.7127, "rmse": 2.3435, "r2": 0.8214,
             "family": "graph",
             "best": True,
             "note": "Best evaluated model by R^2"},
            {"name": "Graph Transformer (local CPU)",
             "mae": 1.9737, "rmse": 2.6340, "r2": 0.7744,
             "family": "graph",
             "params": 33073,
             "note": (
                 "CPU-constrained experimental model "
                 "(33,073 parameters)"
             )},
        ],
        "stations": len(STATIONS),
        "features": len(X_COLS),
        "window": SEQ_LEN,
        "horizon_hours": 1,
        "split": (
            "Train <= 2025-12-31 | "
            "Val 2026-01-01..2026-03-31 | "
            "Test 2026-04-01..2026-06-30"
        ),
    }


# ============================================================
# QUICK TEST
# ============================================================

if __name__ == "__main__":

    latest_features, timestamp = (
        get_latest_features()
    )

    predictions = predict_next_hour(
        latest_features
    )

    print()
    print(
        "Latest dataset timestamp:",
        timestamp
    )

    print()
    print("Next-hour predictions:")

    for station, value in predictions.items():

        print(
            f"{station:20s} {value:6.2f} km/h"
        )