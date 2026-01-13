"""
Export API Endpoints
- Download job results in CSV, JSON, or Parquet format
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from beanie import PydanticObjectId
from pathlib import Path

from app.models.job import Job, JobStatus
from app.services.exporter import DataExporter, OUTPUT_DIR

router = APIRouter()

@router.get("/{job_id}/export")
async def export_job(
    job_id: PydanticObjectId,
    format: str = "csv",
):
    """Export job results in specified format"""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job not completed yet")
    
    # Check for existing export files
    base_path = OUTPUT_DIR / f"job_{job_id}"
    
    if format == "csv":
        file_path = Path(f"{base_path}.csv")
        media_type = "text/csv"
    elif format == "json":
        file_path = Path(f"{base_path}.json")
        media_type = "application/json"
    elif format == "parquet":
        file_path = Path(f"{base_path}.parquet")
        media_type = "application/octet-stream"
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use: csv, json, parquet")
    
    if not file_path.exists():
        # Re-export if file doesn't exist
        import polars as pl
        if job.output_path and Path(job.output_path).exists():
            df = pl.read_csv(job.output_path)
            # Use string ID for path generation inside DataExporter if needed
            exporter = DataExporter(df, str(job_id))
            if format == "csv":
                exporter.export_csv(job.validation_summary)
            elif format == "json":
                exporter.export_json(job.validation_summary)
            elif format == "parquet":
                exporter.export_parquet(job.validation_summary)
        else:
            raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(
        path=file_path,
        filename=f"{job.filename.rsplit('.', 1)[0]}_{format}.{format}",
        media_type=media_type
    )

@router.get("/{job_id}/errors")
async def get_job_errors(
    job_id: PydanticObjectId,
):
    """Get validation errors for a job"""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job_id": str(job_id),
        "total_errors": len(job.validation_errors or []),
        "validation_summary": job.validation_summary or {},
        "errors": job.validation_errors or []
    }

@router.get("/all/export-zip")
async def export_all_jobs(format: str = "csv"):
    """Export all completed jobs as a zip file in the specified format (csv, json, or parquet)"""
    from app.models.job import Job, JobStatus
    import polars as pl
    import zipfile
    import tempfile
    from pathlib import Path
    import os
    
    # Validate format
    if format not in ['csv', 'json', 'parquet']:
        raise HTTPException(status_code=400, detail="Invalid format. Use: csv, json, or parquet")
    
    # Get all completed jobs
    jobs = await Job.find(Job.status == JobStatus.COMPLETED).to_list()
    
    if not jobs:
        raise HTTPException(status_code=404, detail="No completed jobs found")
    
    # Create a temporary directory for the zip file
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        zip_path = temp_path / f"all_jobs_{format}.zip"
        
        # Create zip file
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for job in jobs:
                if not job.output_path or not Path(job.output_path).exists():
                    continue
                
                try:
                    # Read the processed data
                    df = pl.read_csv(job.output_path)
                    
                    # Get original filename without extension
                    original_name = job.filename.rsplit('.', 1)[0]
                    
                    # Create a folder name for this job
                    job_folder = f"{job.id}_{original_name}"
                    
                    # Export in the selected format only
                    if format == 'csv':
                        csv_temp = temp_path / f"{job_folder}_temp.csv"
                        df.write_csv(csv_temp)
                        zipf.write(csv_temp, f"{job_folder}/{original_name}.csv")
                        os.remove(csv_temp)
                    elif format == 'json':
                        json_temp = temp_path / f"{job_folder}_temp.json"
                        df.write_json(json_temp)
                        zipf.write(json_temp, f"{job_folder}/{original_name}.json")
                        os.remove(json_temp)
                    elif format == 'parquet':
                        parquet_temp = temp_path / f"{job_folder}_temp.parquet"
                        df.write_parquet(parquet_temp)
                        zipf.write(parquet_temp, f"{job_folder}/{original_name}.parquet")
                        os.remove(parquet_temp)
                    
                except Exception as e:
                    print(f"Failed to export job {job.id}: {e}")
                    continue
        
        # Return the zip file
        return FileResponse(
            path=zip_path,
            filename=f"all_jobs_{format}.zip",
            media_type="application/zip",
            background=None  # Keep file until response is sent
        )
