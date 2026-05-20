import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

from config.settings import settings
from utils.logger import logger


class TrainingService:
    def __init__(self):
        self.model_dir = settings.MODEL_DIR
        self.model_dir.mkdir(parents=True, exist_ok=True)

    def train_collapse_predictor(self, training_data):
        if len(training_data) < 30:
            return {
                "success": False,
                "message": "Not enough training data. At least 30 historical points are required.",
            }

        X, y = self._build_dataset(training_data)
        try:
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=12,
                random_state=42,
                n_jobs=-1,
            )
            model.fit(X_scaled, y)

            joblib.dump(model, settings.COLLAPSE_MODEL_FILE)
            joblib.dump(scaler, settings.MODEL_DIR / "collapse_scaler.pkl")

            logger.info("Collapse predictor trained and persisted to disk")

            return {
                "success": True,
                "samples": len(X),
                "modelPath": str(settings.COLLAPSE_MODEL_FILE),
            }
        except Exception as exc:
            logger.error("Training failure: %s", exc, exc_info=True)
            return {"success": False, "message": str(exc)}

    def _build_dataset(self, training_data):
        X = []
        y = []
        for sample in training_data:
            if "features" in sample and "label" in sample:
                X.append(sample["features"])
                y.append(sample["label"])

        return np.array(X), np.array(y)
