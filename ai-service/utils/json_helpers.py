from datetime import datetime, timezone
from typing import Any
import json

from models import PyObjectId


def serialize_datetime(dt: Any) -> str:
    """
    Serialize a datetime object into an ISO 8601 string with a 'Z' suffix
    to explicitly denote UTC time, satisfying frontend standard parsing.
    Handles naive datetimes by assuming UTC.
    """
    if isinstance(dt, str):
        try:
            # Handle string input, converting to datetime first
            dt_str = dt.replace("Z", "+00:00")
            parsed_dt = datetime.fromisoformat(dt_str)
            return serialize_datetime(parsed_dt)
        except ValueError:
            return dt

    if not isinstance(dt, datetime):
        # Fallback just in case
        return str(dt)
        
    # If naive (no tzinfo), assume UTC
    if dt.tzinfo is None:
        return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        
    # If aware, convert to UTC first
    dt_utc = dt.astimezone(timezone.utc)
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class CustomJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that handles datetime and PyObjectId.
    """

    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return serialize_datetime(obj)
        if isinstance(obj, PyObjectId):
            return str(obj)
        return super().default(obj)


def json_dumps(obj: Any, **kwargs) -> str:
    """
    Helper function to dump an object to JSON using the CustomJSONEncoder.
    """
    if "cls" not in kwargs:
        kwargs["cls"] = CustomJSONEncoder
    return json.dumps(obj, **kwargs)


