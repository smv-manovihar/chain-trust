from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: AsyncIOMotorClient = None

    @classmethod
    def connect(cls):
        logger.info("Connecting to MongoDB...")
        cls.client = AsyncIOMotorClient(settings.MONGO_URI)

    @classmethod
    def close(cls):
        if cls.client:
            logger.info("Closing MongoDB connection...")
            cls.client.close()

    @classmethod
    def get_db(cls):
        if cls.client is None:
            raise ConnectionError("Database not initialized")
        return cls.client[settings.MONGO_DB_NAME]