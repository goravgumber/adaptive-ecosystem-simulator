def validate_predict_collapse_request(payload):
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object")

    if "recentData" not in payload:
        raise ValueError("Missing required field: recentData")

    if not isinstance(payload["recentData"], list):
        raise ValueError("recentData must be a list of ecosystem snapshots")

    if len(payload["recentData"]) < 1:
        raise ValueError("recentData must contain at least one data point")

    return {
        "recentData": payload["recentData"],
        "steps": int(payload.get("steps", 5)),
    }


def validate_forecast_request(payload):
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object")

    if "timeSeries" not in payload:
        raise ValueError("Missing required field: timeSeries")

    if not isinstance(payload["timeSeries"], list):
        raise ValueError("timeSeries must be a list of population records")

    if len(payload["timeSeries"]) < 1:
        raise ValueError("timeSeries must contain at least one data point")

    steps = int(payload.get("steps", 7))
    if steps < 1:
        raise ValueError("steps must be a positive integer")

    return {
        "timeSeries": payload["timeSeries"],
        "steps": steps,
    }
