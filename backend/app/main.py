from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

app = FastAPI(
    title="Data Refinery API",
    description="API for ingesting, cleaning, and structuring data.",
    version="0.1.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Compression Middleware for faster data transfer
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses > 1KB

from app.api.api_v1.api import api_router
from app.core.config import settings

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def on_startup():
    print("Starting up Data Refinery API...")
    from app.core.database import init_db
    try:
        await init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Database initialization failed: {e}")

@app.get("/")
def read_root():
    return {"message": "Welcome to Data Refinery API", "status": "active"}

@app.get("/health")
def health_check():
    return {"status": "ok"}