from fastapi import APIRouter
from app.api.api_v1.endpoints import jobs, schemas, exports, sources, analytics

api_router = APIRouter()
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(schemas.router, prefix="/schemas", tags=["schemas"])
api_router.include_router(exports.router, prefix="/jobs", tags=["exports"])
api_router.include_router(sources.router, prefix="/sources", tags=["sources"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
