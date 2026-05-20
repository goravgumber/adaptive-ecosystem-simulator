import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT_DIR / ".env"
ML_ENV_FILE = ROOT_DIR / "ml-service.env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)

if ML_ENV_FILE.exists():
    load_dotenv(ML_ENV_FILE)

class Settings:
    ENVIRONMENT = os.getenv("NODE_ENV", "development")
    PORT = int(os.getenv("ML_SERVICE_PORT", 8000))
    MODEL_DIR = Path(os.getenv("ML_MODEL_DIR", ROOT_DIR / "models"))
    COLLAPSE_MODEL_FILE = Path(os.getenv("COLLAPSE_MODEL_FILE", MODEL_DIR / "collapse_predictor.pkl"))
    POPULATION_MODEL_FILE = Path(os.getenv("POPULATION_MODEL_FILE", MODEL_DIR / "population_forecaster.pkl"))
    LOG_DIR = Path(os.getenv("ML_LOG_DIR", ROOT_DIR / "logs"))
    STARTUP_TIMEOUT_SECONDS = int(os.getenv("ML_STARTUP_TIMEOUT_SECONDS", 15))
    MAX_RETRY_ATTEMPTS = int(os.getenv("ML_STARTUP_MAX_RETRIES", 3))
    RETRY_INTERVAL_SECONDS = int(os.getenv("ML_RETRY_INTERVAL_SECONDS", 5))
    MIN_PREDICTION_DATA_POINTS = int(os.getenv("MIN_PREDICTION_DATA_POINTS", 5))
    MIN_FORECAST_DATA_POINTS = int(os.getenv("MIN_FORECAST_DATA_POINTS", 20))
    MAX_FORECAST_STEPS = int(os.getenv("MAX_FORECAST_STEPS", 14))

settings = Settings()
