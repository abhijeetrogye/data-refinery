from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.job import Job
from app.models.schema import TargetSchema

async def init_db():
    client = AsyncIOMotorClient(settings.DATABASE_URL)
    await init_beanie(database=client.get_default_database(), document_models=[Job, TargetSchema])
