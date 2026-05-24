#!/usr/bin/env python3
import json
import os
import random
import sys
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config.settings import settings
from utils.logger import logger

try:
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Reshape
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logger.warning("TensorFlow not available; LSTM models disabled")

try:
    from statsmodels.tsa.arima.model import ARIMA
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False
    logger.warning("statsmodels not available; ARIMA baseline disabled")

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    try:
        import aioredis
        REDIS_AVAILABLE = True
    except ImportError:
        REDIS_AVAILABLE = False

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class EcosystemState(BaseModel):
    plants: float
    herbivores: float
    carnivores: float
    tick: int = 0
    history: list[dict] = []

class CollapseResponse(BaseModel):
    risk_score: float
    confidence: float
    horizon: int

class ForecastResponse(BaseModel):
    predictions: list[list[float]]
    model_version: str
    generated_at: str

class InsightRequest(BaseModel):
    plants: float
    herbivores: float
    carnivores: float
    tick: int = 0
    history: list = []

class DataIngestResponse(BaseModel):
    buffered: bool
    buffer_size: int

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Ecosystem ML Service", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

startup_time = datetime.now(timezone.utc)
model_version = 0
model_accuracy = 0.0
model_precision = 0.0
model_recall = 0.0
model_f1 = 0.0
last_trained = None

collapse_model = None
forecast_model = None
lstm_model = None

training_buffer: list[dict] = []

# ---------------------------------------------------------------------------
# Current-engine data generation (logistic + rescue effect)
# ---------------------------------------------------------------------------

def generate_current_engine_data(n_simulations: int = 500, n_steps: int = 200):
    """Generate training data using the same logistic + rescue effect engine
    as the live simulation service. Never truly collapses — reflects real system."""
    data = []
    for _ in range(n_simulations):
        R = random.uniform(0.3, 0.7)
        K = random.uniform(2000, 4000)
        BETA = random.uniform(0.0005, 0.002)
        DELTA = random.uniform(0.0005, 0.002)
        GAMMA = random.uniform(0.15, 0.35)
        EPSILON = random.uniform(0.0002, 0.001)
        MU = random.uniform(0.04, 0.12)
        DT = 0.05

        plants = random.uniform(500, 2000)
        herbivores = random.uniform(50, 500)
        carnivores = random.uniform(10, 100)

        MIN_P = 1
        MAX_P = 100000

        sim = []
        for _ in range(n_steps):
            dP = R * plants * (1 - plants / K) - BETA * plants * herbivores
            dH = DELTA * plants * herbivores - GAMMA * herbivores - EPSILON * herbivores * carnivores
            dC = EPSILON * herbivores * carnivores - MU * carnivores

            plants += dP * DT
            herbivores += dH * DT
            carnivores += dC * DT

            # Rescue effect (matches ecosystemEngine.js)
            if plants < 20:
                plants += 0.8 * (20 - plants) * DT
            if herbivores < 10:
                herbivores += 0.5 * (10 - herbivores) * DT
            if carnivores < 5:
                carnivores += 0.5 * (5 - carnivores) * DT

            plants = min(MAX_P, max(MIN_P, plants))
            herbivores = min(MAX_P, max(MIN_P, herbivores))
            carnivores = min(MAX_P, max(MIN_P, carnivores))

            sim.append([round(plants, 2), round(herbivores, 2), round(carnivores, 2)])
        data.append(sim)
    return np.array(data)

def prepare_lstm_sequences(data, window=20, horizon=7):
    X, y = [], []
    for sim in data:
        for i in range(len(sim) - window - horizon):
            X.append(sim[i:i + window])
            y.append(sim[i + window:i + window + horizon])
    return np.array(X), np.array(y)

def build_lstm_forecaster():
    if not TENSORFLOW_AVAILABLE:
        logger.warning("Cannot build LSTM: TensorFlow not available")
        return None
    model = Sequential([
        LSTM(64, input_shape=(20, 3), return_sequences=False),
        Dense(32, activation='relu'),
        Dense(21),
        Reshape((7, 3))
    ])
    model.compile(optimizer='adam', loss='mse')
    return model

# ---------------------------------------------------------------------------
# Feature extraction helpers
# ---------------------------------------------------------------------------

FEATURE_NAMES = [
    "plants_latest", "herbivores_latest", "carnivores_latest",
    "plants_mean", "herbivores_mean", "carnivores_mean",
    "plants_std", "herbivores_std", "carnivores_std",
    "plants_per_herbivore", "herbivores_per_carnivore"
]

def extract_collapse_features(data: np.ndarray):
    window = data[-5:]
    latest = window[-1]
    means = np.mean(window, axis=0)
    stds = np.std(window, axis=0)
    return [
        latest[0], latest[1], latest[2],
        means[0], means[1], means[2],
        stds[0], stds[1], stds[2],
        latest[0] / max(latest[1], 1),
        latest[1] / max(latest[2], 1)
    ]

def compute_accuracy(y_true, y_pred):
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    return acc, prec, rec, f1

# ---------------------------------------------------------------------------
# Model training
# ---------------------------------------------------------------------------

def train_models():
    global collapse_model, forecast_model, lstm_model
    global model_version, model_accuracy, model_precision, model_recall, model_f1, last_trained

    logger.info("Generating current-engine training data (logistic + rescue)...")
    engine_data = generate_current_engine_data(500, 200)

    # ---- LSTM forecaster ----
    if TENSORFLOW_AVAILABLE:
        try:
            logger.info("Training LSTM forecaster...")
            X, y = prepare_lstm_sequences(engine_data)
            lstm = build_lstm_forecaster()
            if lstm is not None:
                lstm.fit(X, y, epochs=10, batch_size=32, verbose=0, validation_split=0.1)
                lstm_model = lstm
                logger.info("LSTM forecaster trained")
        except Exception as e:
            logger.error(f"LSTM training failed: {e}")

    # ---- Random Forest collapse predictor ----
    if SKLEARN_AVAILABLE:
        try:
            logger.info("Training Random Forest collapse predictor on current engine...")
            X_list, y_list = [], []
            for sim in engine_data:
                for i in range(50, len(sim)):
                    features = extract_collapse_features(sim[:i])
                    current = sim[i]
                    # label: "collapse risk" = ecosystem distress level
                    # High risk if any species is near rescue threshold
                    near_rescue = (current[0] < 40 or current[1] < 20 or current[2] < 10)
                    # Imbalance risk: carnivores far exceeding herbivores, or herbivores far exceeding plants
                    herb_per_plant = current[1] / max(current[0], 1)
                    carn_per_herb = current[2] / max(current[1], 1)
                    imbalanced = (carn_per_herb > 0.5 or herb_per_plant > 0.5)
                    label = 1 if near_rescue or imbalanced else 0
                    X_list.append(features)
                    y_list.append(label)

            X_arr = np.array(X_list)
            y_arr = np.array(y_list)

            X_train, X_test, y_train, y_test = train_test_split(X_arr, y_arr, test_size=0.2, random_state=42)

            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)

            rf_model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
            rf_model.fit(X_train_scaled, y_train)

            # cross-validation
            cv_scores = cross_val_score(rf_model, X_train_scaled, y_train, cv=5, scoring='accuracy')
            logger.info(f"Cross-val accuracy scores: {cv_scores}")
            logger.info(f"Mean CV accuracy: {cv_scores.mean():.4f}")

            y_pred = rf_model.predict(X_test_scaled)
            acc, prec, rec, f1 = compute_accuracy(y_test, y_pred)

            # save feature importances
            feat_imp = dict(zip(FEATURE_NAMES, rf_model.feature_importances_.tolist()))
            with open(settings.MODEL_DIR / "feature_importance.json", "w") as f:
                json.dump(feat_imp, f)

            collapse_model = rf_model
            model_accuracy = acc
            model_precision = prec
            model_recall = rec
            model_f1 = f1

            joblib.dump(scaler, settings.MODEL_DIR / "collapse_scaler.pkl")
            logger.info(f"RF collapse predictor trained: acc={acc:.4f}, f1={f1:.4f}")
        except Exception as e:
            logger.error(f"RF training failed: {e}")

    # ---- Versioning ----
    metadata_path = settings.MODEL_DIR / "metadata.json"
    old_version = 0
    if metadata_path.exists():
        try:
            with open(metadata_path) as f:
                old_meta = json.load(f)
                old_version = old_meta.get("version", 0)
                old_acc = old_meta.get("accuracy", 0)
                if model_accuracy > old_acc:
                    model_version = old_version + 1
                else:
                    model_version = old_version
                    logger.info(f"New model did not improve, keeping v{old_version}")
        except Exception:
            model_version = 1
    else:
        model_version = 1

    last_trained = datetime.now(timezone.utc)
    save_models()

def save_models():
    if collapse_model is not None:
        joblib.dump(collapse_model, settings.MODEL_DIR / f"collapse_predictor_v{model_version}.pkl")
    if lstm_model is not None:
        joblib.dump(lstm_model, settings.MODEL_DIR / f"population_forecaster_v{model_version}.pkl")

    metadata = {
        "version": model_version,
        "accuracy": float(model_accuracy),
        "precision": float(model_precision),
        "recall": float(model_recall),
        "f1": float(model_f1),
        "trained_at": last_trained.isoformat() if last_trained else None
    }
    with open(settings.MODEL_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f)

def load_models():
    global collapse_model, lstm_model, model_version, model_accuracy, model_precision, model_recall, model_f1, last_trained

    metadata_path = settings.MODEL_DIR / "metadata.json"
    if not metadata_path.exists():
        logger.info("No existing models found; training new models...")
        train_models()
        return

    with open(metadata_path) as f:
        meta = json.load(f)
    model_version = meta.get("version", 0)
    model_accuracy = meta.get("accuracy", 0.0)
    model_precision = meta.get("precision", 0.0)
    model_recall = meta.get("recall", 0.0)
    model_f1 = meta.get("f1", 0.0)
    trained_str = meta.get("trained_at")
    last_trained = datetime.fromisoformat(trained_str) if trained_str else None

    collapse_path = settings.MODEL_DIR / f"collapse_predictor_v{model_version}.pkl"
    forecast_path = settings.MODEL_DIR / f"population_forecaster_v{model_version}.pkl"

    if collapse_path.exists():
        collapse_model = joblib.load(collapse_path)
        logger.info(f"Loaded collapse model v{model_version}")

    if forecast_path.exists():
        if TENSORFLOW_AVAILABLE:
            try:
                lstm_model = joblib.load(forecast_path)
                logger.info(f"Loaded forecast model v{model_version}")
            except Exception:
                logger.warning("Failed to load forecast model with joblib, may need keras serialization")
        else:
            logger.info("Forecast model found but TensorFlow not available — will use fallback")
    else:
        logger.info("No forecast model file found — forecast endpoint will use fallback")

    logger.info(f"Loaded model v{model_version} trained {trained_str}")

# ---------------------------------------------------------------------------
# ARIMA baseline
# ---------------------------------------------------------------------------

def arima_forecast(series, steps=7):
    if not STATSMODELS_AVAILABLE or len(series) < 3:
        return None
    try:
        model = ARIMA(series, order=(2, 1, 2))
        fitted = model.fit()
        return fitted.forecast(steps=steps).tolist()
    except Exception as e:
        logger.warning(f"ARIMA forecast failed: {e}")
        return None

# ---------------------------------------------------------------------------
# Startup event
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup():
    global startup_time
    startup_time = datetime.now(timezone.utc)
    load_models()

    if APSCHEDULER_AVAILABLE:
        scheduler = AsyncIOScheduler()
        @scheduler.scheduled_job("interval", hours=24)
        async def retrain_models():
            if len(training_buffer) < 200:
                logger.info(f"Buffer too small ({len(training_buffer)}), skipping retrain")
                return
            logger.info("Running scheduled retrain...")
            train_models()
        scheduler.start()
        logger.info("APScheduler started with 24h retrain interval")

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    uptime = (datetime.now(timezone.utc) - startup_time).total_seconds()
    return {
        "status": "ok",
        "model_loaded": collapse_model is not None or lstm_model is not None,
        "last_trained": last_trained.isoformat() if last_trained else None,
        "uptime_seconds": uptime
    }

@app.get("/models/info")
async def models_info():
    metadata_path = settings.MODEL_DIR / "metadata.json"
    if metadata_path.exists():
        with open(metadata_path) as f:
            return json.load(f)
    return {
        "version": None,
        "accuracy": None,
        "precision": None,
        "recall": None,
        "f1": None,
        "trained_at": None
    }

@app.post("/predict/collapse", response_model=CollapseResponse)
async def predict_collapse(state: EcosystemState):
    data = state.history if state.history else [{"plants": state.plants, "herbivores": state.herbivores, "carnivores": state.carnivores}]

    if len(data) < settings.MIN_PREDICTION_DATA_POINTS:
        raise HTTPException(status_code=400, detail=f"Need at least {settings.MIN_PREDICTION_DATA_POINTS} data points")

    if isinstance(data[0], dict):
        arr = np.array([[d["plants"], d["herbivores"], d["carnivores"]] for d in data])
    else:
        arr = np.array(data)

    features = extract_collapse_features(arr)

    if collapse_model is not None:
        scaler_path = settings.MODEL_DIR / "collapse_scaler.pkl"
        if scaler_path.exists():
            scaler = joblib.load(scaler_path)
            features_scaled = scaler.transform([features])
        else:
            features_scaled = [features]
        prob = float(collapse_model.predict_proba(features_scaled)[0][1])
        conf = float(np.max(collapse_model.predict_proba(features_scaled)[0]))
    else:
        prob, conf = fallback_collapse(arr)

    return CollapseResponse(risk_score=prob, confidence=conf, horizon=5)

@app.post("/predict/populations")
async def forecast_populations(state: EcosystemState):
    data = state.history if state.history else [[state.plants, state.herbivores, state.carnivores]]
    if isinstance(data[0], dict):
        arr = np.array([[d["plants"], d["herbivores"], d["carnivores"]] for d in data])
    else:
        arr = np.array(data)

    if len(arr) < settings.MIN_FORECAST_DATA_POINTS:
        raise HTTPException(status_code=400, detail=f"Need at least {settings.MIN_FORECAST_DATA_POINTS} data points")

    steps = min(7, settings.MAX_FORECAST_STEPS)
    predictions = []

    if lstm_model is not None and len(arr) >= 20:
        try:
            window = arr[-20:].reshape(1, 20, 3)
            pred = lstm_model.predict(window, verbose=0)
            predictions = pred[0].tolist()
        except Exception as e:
            logger.warning(f"LSTM forecast failed: {e}")

    if not predictions:
        predictions = fallback_forecast(arr, steps)

    return ForecastResponse(
        predictions=predictions[:steps],
        model_version=f"v{model_version}",
        generated_at=datetime.now(timezone.utc).isoformat()
    )

@app.post("/forecast/baseline")
async def forecast_baseline(state: EcosystemState):
    data = state.history if state.history else [[state.plants, state.herbivores, state.carnivores]]
    if isinstance(data[0], dict):
        arr = np.array([[d["plants"], d["herbivores"], d["carnivores"]] for d in data])
    else:
        arr = np.array(data)

    result = {}
    species = ["plants", "herbivores", "carnivores"]
    for i, name in enumerate(species):
        forecast = arima_forecast(arr[:, i], 7)
        if forecast is None:
            forecast = fallback_forecast(arr[:, i].reshape(-1, 1), 7)
        result[name] = forecast

    return {
        "predictions": result,
        "model": "ARIMA(2,1,2)",
        "note": "Baseline model, not the primary forecast",
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@app.post("/train/collapse")
async def train_collapse_endpoint():
    train_models()
    return {
        "success": True,
        "version": model_version,
        "accuracy": model_accuracy,
        "f1": model_f1,
        "trained_at": last_trained.isoformat() if last_trained else None
    }

@app.post("/insights")
async def insights(state: InsightRequest):
    OPENAI_API_KEY = os.getenv("OPENROUTER_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")

    insight_text = None
    model_used = "rule-based"
    cached = False

    if REDIS_AVAILABLE and OPENAI_API_KEY:
        try:
            r = aioredis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
            cache_key = f"insight:{hash(str(state.model_dump()))}"
            cached_val = await r.get(cache_key)
            if cached_val:
                return {
                    "insight": cached_val.decode(),
                    "model": "openrouter",
                    "cached": True,
                    "generated_at": datetime.now(timezone.utc).isoformat()
                }
        except Exception:
            pass

    if OPENAI_AVAILABLE:
        try:
            openai.api_key = OPENAI_API_KEY
            if OPENAI_API_KEY:
                openai.base_url = "https://openrouter.ai/api/v1"
            response = openai.chat.completions.create(
                model="openrouter/auto",
                messages=[
                    {"role": "system", "content": "You are an ecology expert analyzing a predator-prey simulation. Given population counts, explain what is happening in the ecosystem and predict what will likely happen in the next 10 steps. Be specific — reference the actual numbers provided. Maximum 3 sentences. No bullet points."},
                    {"role": "user", "content": f"Plants: {state.plants:.0f}, Herbivores: {state.herbivores:.0f}, Carnivores: {state.carnivores:.0f} at tick {state.tick}."}
                ],
                max_tokens=200
            )
            insight_text = response.choices[0].message.content.strip()
            model_used = "openrouter"

            if REDIS_AVAILABLE:
                try:
                    r = aioredis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
                    await r.setex(cache_key, 60, insight_text)
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"OpenAI insight failed: {e}")

    if not insight_text:
        if state.carnivores > state.herbivores * 0.5:
            insight_text = f"Warning: Predator overload detected. Carnivores ({state.carnivores:.0f}) exceed 50% of herbivores ({state.herbivores:.0f}). Collapse risk is high."
        elif state.herbivores < 50:
            insight_text = f"Warning: Herbivore population ({state.herbivores:.0f}) is critically low. Risk of herbivore collapse and subsequent carnivore starvation."
        elif state.plants > 5000:
            insight_text = f"Plant overgrowth detected ({state.plants:.0f}). Herbivore population may boom, followed by carnivore increase."
        else:
            insight_text = "Ecosystem is currently stable."

    return {
        "insight": insight_text,
        "model": model_used,
        "cached": cached,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@app.post("/data/ingest")
async def data_ingest(state: EcosystemState):
    training_buffer.append(state.model_dump())
    return DataIngestResponse(buffered=True, buffer_size=len(training_buffer))

@app.get("/")
async def root():
    return {
        "service": "Ecosystem ML Service",
        "version": "2.0.0",
        "status": "running"
    }

# ---------------------------------------------------------------------------
# Fallback helpers
# ---------------------------------------------------------------------------

def fallback_collapse(arr):
    latest = arr[-1]
    risk = 0.0
    conf = 0.5
    # Rescue thresholds: P<20, H<10, C<5
    near_rescue = (latest[0] < 40 or latest[1] < 20 or latest[2] < 10)
    if latest[0] < 20 or latest[1] < 10 or latest[2] < 5:
        risk = 0.85
        conf = 0.7
    elif near_rescue:
        risk = 0.55
        conf = 0.55
    else:
        # Use imbalance ratios for fine-grained risk
        herb_per_plant = latest[1] / max(latest[0], 1)
        carn_per_herb = latest[2] / max(latest[1], 1)
        if carn_per_herb > 0.5 or herb_per_plant > 0.5:
            risk = 0.35 + 0.3 * min(carn_per_herb, herb_per_plant)
            conf = 0.5
    return min(risk, 0.95), conf

def fallback_forecast(arr, steps):
    last = arr[-1]
    if len(arr) >= 5:
        trend = (arr[-1] - arr[-5]) / 4
    else:
        trend = np.array([0, 0, 0])
    preds = []
    for i in range(1, steps + 1):
        pred = np.maximum(0, last + trend * i)
        preds.append(pred.tolist() if hasattr(pred, 'tolist') else list(pred))
    return preds

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_SERVICE_PORT", "8000"))
    uvicorn.run("ml_service:app", host="0.0.0.0", port=port, reload=False)
