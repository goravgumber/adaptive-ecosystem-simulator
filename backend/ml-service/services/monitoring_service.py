import platform
import sys
from datetime import datetime

from config.settings import settings
from utils.helpers import get_memory_usage
from utils.logger import logger


class MonitoringService:
    def __init__(self, prediction_service):
        self.prediction_service = prediction_service
        self.start_time = datetime.utcnow()

    def get_health_snapshot(self):
        model_status = self.prediction_service.get_status()
        uptime_seconds = (datetime.utcnow() - self.start_time).total_seconds()
        memory_usage = get_memory_usage()
        healthy = model_status.get("error") is None

        return {
            "service": "ml-service",
            "status": "pass" if healthy else "fail",
            "environment": settings.ENVIRONMENT,
            "uptimeSeconds": int(uptime_seconds),
            "startupTime": model_status.get("startupTime"),
            "models": model_status.get("models"),
            "trainingState": model_status.get("trainingState"),
            "error": model_status.get("error"),
            "memoryUsage": memory_usage,
            "pythonVersion": sys.version,
            "platform": platform.platform(),
            "modelDirectory": str(settings.MODEL_DIR),
        }
