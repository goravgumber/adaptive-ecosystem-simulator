# ML Service

This directory contains the Python microservice for AI-powered predictions in the Adaptive Ecosystem Simulator.

## Architecture

- `app.py` — Flask entrypoint that exposes ML endpoints and health checks.
- `config/settings.py` — Environment-driven service configuration.
- `services/prediction_service.py` — Prediction logic and model loading.
- `services/training_service.py` — Training helper service for model persistence.
- `services/monitoring_service.py` — Health and runtime metadata for the Python service.
- `utils/logger.py` — Structured service logging with rotating file handlers.
- `utils/validators.py` — Request validation helpers.
- `utils/helpers.py` — Common utilities for responses and metrics.
- `models/` — Model artifacts and pickled serializers.
- `logs/` — Runtime logs and error logs.

## Setup

```bash
cd backend/ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

## Endpoints

- `GET /health` — ML service health and model status.
- `POST /predict/collapse` — Collapse risk prediction.
- `POST /predict/populations` — Population forecast.

## Notes

This service is intentionally designed for separation from the main Node.js backend. Use the Node backend's `services/aiService.js` to spawn and monitor this microservice.
