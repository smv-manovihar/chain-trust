from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

_client_cache = None
_db_cache = None


def get_db():
    global _client_cache, _db_cache
    if _db_cache is None:
        _client_cache = AsyncIOMotorClient(settings.MONGO_URI)
        _db_cache = _client_cache["ChainTrust"]
    return _db_cache
