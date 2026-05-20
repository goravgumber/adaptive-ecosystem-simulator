import json
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np

from config.settings import settings
from utils.logger import logger


class PredictionService:
    def __init__(self):
        self.model_dir = settings.MODEL_DIR
        self.collapse_model_path = settings.COLLAPSE_MODEL_FILE
        self.population_model_path = settings.POPULATION_MODEL_FILE
        self.models = {
            "collapse": None,
            "population": None,
        }
        self.model_status = {
            "collapse": False,
            "population": False,
        }
        self.training_state = "idle"
        self.startup_time = datetime.utcnow()
        self.health_error = None
        self.model_dir.mkdir(parents=True, exist_ok=True)

    def initialize(self):
        try:
            self.load_model("collapse")
            self.load_model("population")
            logger.info("ML model loading complete")
            return True
        except Exception as exc:
            self.health_error = str(exc)
            logger.error("Failed to initialize prediction service: %s", exc, exc_info=True)
            return False

    def load_model(self, model_key):
        if model_key == "collapse":
            model_path = self.collapse_model_path
        else:
            model_path = self.population_model_path

        if not model_path.exists():
            logger.warning("Model file not found: %s", model_path)
            self.model_status[model_key] = False
            return

        try:
            self.models[model_key] = joblib.load(model_path)
            self.model_status[model_key] = True
            logger.info("Loaded %s model from %s", model_key, model_path)
        except Exception as exc:
            self.model_status[model_key] = False
            logger.warning("Unable to load %s model: %s", model_key, exc, exc_info=True)

    def get_status(self):
        return {
            "service": "ml-service",
            "startupTime": self.startup_time.isoformat() + "Z",
            "environment": settings.ENVIRONMENT,
            "models": {
                "collapse": self.model_status["collapse"],
                "population": self.model_status["population"],
            },
            "trainingState": self.training_state,
            "error": self.health_error,
        }

    def predict_collapse(self, recent_data, steps=5):
        if len(recent_data) < settings.MIN_PREDICTION_DATA_POINTS:
            return {
                "success": False,
                "error": f"Insufficient data for collapse prediction: need at least {settings.MIN_PREDICTION_DATA_POINTS} points",
            }

        features = self._extract_collapse_features(recent_data)
        if self.model_status["collapse"] and self.models["collapse"] is not None:
            try:
                probability = float(self.models["collapse"].predict_proba([features])[0][1])
                confidence = float(max(self.models["collapse"].predict_proba([features])[0]))
                return {
                    "success": True,
                    "risk": probability,
                    "confidence": confidence,
                    "model": "collapse_predictor",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
            except Exception as exc:
                logger.warning("Collapse model prediction failed: %s", exc, exc_info=True)

        return self._fallback_collapse_prediction(recent_data)

    def forecast_populations(self, time_series, steps=7):
        if len(time_series) < settings.MIN_FORECAST_DATA_POINTS:
            return {
                "success": False,
                "error": f"Insufficient time-series data for forecasting: need at least {settings.MIN_FORECAST_DATA_POINTS} points",
            }

        if steps > settings.MAX_FORECAST_STEPS:
            steps = settings.MAX_FORECAST_STEPS

        if self.model_status["population"] and self.models["population"] is not None:
            try:
                forecast = self.models["population"].predict(np.array(time_series[-settings.MIN_FORECAST_DATA_POINTS:]))
                return {
                    "success": True,
                    "predictions": forecast.tolist() if hasattr(forecast, "tolist") else list(forecast),
                    "model": "population_forecaster",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
            except Exception as exc:
                logger.warning("Population forecasting failed: %s", exc, exc_info=True)

        return self._fallback_population_forecast(time_series, steps)

    def _extract_collapse_features(self, data):
        window = data[-5:]
        latest = window[-1]
        plant_values = [entry["plants"] for entry in window]
        herbivore_values = [entry["herbivores"] for entry in window]
        carnivore_values = [entry["carnivores"] for entry in window]

        return [
            latest["plants"],
            latest["herbivores"],
            latest["carnivores"],
            np.mean(plant_values),
            np.mean(herbivore_values),
            np.mean(carnivore_values),
            np.std(plant_values),
            np.std(herbivore_values),
            np.std(carnivore_values),
            latest["plants"] / max(latest["herbivores"], 1),
            latest["herbivores"] / max(latest["carnivores"], 1),
        ]

    def _fallback_collapse_prediction(self, data):
        latest = data[-1]
        risk = 0.2
        confidence = 0.45
        if latest["plants"] < 30 or latest["herbivores"] < 10 or latest["carnivores"] < 5:
            risk = 0.6
            confidence = 0.55
        if latest["plants"] < 10:
            risk = 0.86
            confidence = 0.75

        return {
            "success": True,
            "risk": risk,
            "confidence": confidence,
            "model": "heuristic_fallback",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    def _fallback_population_forecast(self, time_series, steps):
        base = time_series[-1]
        trend = self._calculate_trend(time_series[-5:])
        predictions = []
        for i in range(1, steps + 1):
            predictions.append(
                {
                    "step": base["step"] + i,
                    "plants": max(0, base["plants"] + trend["plants"] * i),
                    "herbivores": max(0, base["herbivores"] + trend["herbivores"] * i),
                    "carnivores": max(0, base["carnivores"] + trend["carnivores"] * i),
                }
            )

        return {
            "success": True,
            "predictions": predictions,
            "model": "heuristic_fallback",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    def _calculate_trend(self, window):
        first = window[0]
        last = window[-1]
        steps = max(1, len(window) - 1)
        return {
            "plants": (last["plants"] - first["plants"]) / steps,
            "herbivores": (last["herbivores"] - first["herbivores"]) / steps,
            "carnivores": (last["carnivores"] - first["carnivores"]) / steps,
        }
