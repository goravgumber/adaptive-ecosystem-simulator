#!/usr/bin/env python3
import sys
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from config.settings import settings
from services.monitoring_service import MonitoringService
from services.prediction_service import PredictionService
from utils.logger import logger
from utils.validators import validate_forecast_request, validate_predict_collapse_request

app = Flask(__name__)
CORS(app)

prediction_service = PredictionService()
monitoring_service = MonitoringService(prediction_service)


@app.route('/health', methods=['GET'])
def health():
    health_snapshot = monitoring_service.get_health_snapshot()
    status_code = 200 if health_snapshot['models'] else 503
    return jsonify(health_snapshot), status_code


@app.route('/predict/collapse', methods=['POST'])
def predict_collapse():
    try:
        payload = validate_predict_collapse_request(request.get_json(force=True))
        result = prediction_service.predict_collapse(payload['recentData'], payload['steps'])
        return jsonify(result), 200 if result.get('success') else 400
    except Exception as exc:
        logger.error('Collapse prediction request failed: %s', exc, exc_info=True)
        return jsonify({'success': False, 'error': str(exc)}), 400


@app.route('/predict/populations', methods=['POST'])
def forecast_populations():
    try:
        payload = validate_forecast_request(request.get_json(force=True))
        result = prediction_service.forecast_populations(payload['timeSeries'], payload['steps'])
        return jsonify(result), 200 if result.get('success') else 400
    except Exception as exc:
        logger.error('Population forecast request failed: %s', exc, exc_info=True)
        return jsonify({'success': False, 'error': str(exc)}), 400


@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error('Internal ML service error: %s', error, exc_info=True)
    return jsonify({'success': False, 'error': 'Internal service error'}), 500


def run_server():
    initialized = prediction_service.initialize()
    if not initialized:
        logger.error('ML service initialization failed; exiting')
        sys.exit(1)

    logger.info('ML Service started successfully on port %s', settings.PORT)
    app.run(host='0.0.0.0', port=settings.PORT)


if __name__ == '__main__':
    run_server()
