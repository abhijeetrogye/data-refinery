"""
API Source Ingestion Endpoint
- Fetch data from external REST APIs
- Convert response to DataFrame
- Process like any other source
"""
import json
import httpx
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from pathlib import Path

from app.models.job import Job, JobStatus, JobRead

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class APISourceRequest(BaseModel):
    url: str
    method: str = "GET"
    headers: dict = {}
    body: dict = {}
    data_path: str = ""  # JSONPath-like path to data array, e.g., "results" or "data.items"

@router.post("/ingest", response_model=JobRead)
async def ingest_from_api(
    request: APISourceRequest,
    background_tasks: BackgroundTasks,
):
    """Ingest data from an external REST API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if request.method.upper() == "GET":
                response = await client.get(request.url, headers=request.headers)
            else:
                response = await client.post(request.url, headers=request.headers, json=request.body)
            
            response.raise_for_status()
            data = response.json()
            
            # Navigate to data path if specified
            if request.data_path:
                for key in request.data_path.split("."):
                    if isinstance(data, dict) and key in data:
                        data = data[key]
                    else:
                        raise HTTPException(status_code=400, detail=f"Data path '{request.data_path}' not found in response")
            
            # Ensure data is a list
            if isinstance(data, dict):
                data = [data]
            elif not isinstance(data, list):
                raise HTTPException(status_code=400, detail="Response data must be an array or object")
            
            # Save as JSON file
            filename = f"api_source_{hash(request.url) % 10000}.json"
            file_path = UPLOAD_DIR / filename
            with open(file_path, "w") as f:
                json.dump(data, f)
            
            # Create Job
            job = Job(
                filename=f"API: {request.url[:50]}...",
                file_path=str(file_path),
                source_type="json",
                status=JobStatus.UPLOADED
            )
            await job.create()
            
            return job
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch from API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DatabaseSourceRequest(BaseModel):
    connection_string: str  # Mock - in real app, this would be parsed
    query: str
    db_type: str = "postgresql"  # postgresql, mysql, sqlite

@router.post("/database", response_model=JobRead)
async def ingest_from_database(
    request: DatabaseSourceRequest,
):
    """Mock database ingestion - generates sample data"""
    # In a real implementation, you would:
    # 1. Parse connection string
    # 2. Connect to database
    # 3. Execute query
    # 4. Convert to DataFrame
    
    # For demo, generate mock data
    mock_data = [
        {"id": i, "name": f"User_{i}", "email": f"user{i}@example.com", "age": 20 + (i % 50)}
        for i in range(1, 101)
    ]
    
    filename = f"db_source_{hash(request.query) % 10000}.json"
    file_path = UPLOAD_DIR / filename
    with open(file_path, "w") as f:
        json.dump(mock_data, f)
    
    job = Job(
        filename=f"DB: {request.db_type} query",
        file_path=str(file_path),
        source_type="json",
        status=JobStatus.UPLOADED
    )
    await job.create()
    
    return job
