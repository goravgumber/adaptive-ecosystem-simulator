import resource
from datetime import datetime


def get_memory_usage():
    usage = resource.getrusage(resource.RUSAGE_SELF)
    return {
        "maxRss": usage.ru_maxrss,
        "sharedMemory": usage.ru_ixrss,
        "unsharedData": usage.ru_idrss,
        "unsharedStack": usage.ru_isrss,
    }


def format_response(success, payload=None, error=None):
    response = {
        "success": success,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    if payload is not None:
        response["data"] = payload
    if error is not None:
        response["error"] = error
    return response
