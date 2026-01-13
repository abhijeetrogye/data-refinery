import json
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, BackgroundTasks
from beanie import PydanticObjectId
from app.models.job import Job, JobCreate, JobRead, JobStatus, JobMappingUpdate
from app.models.schema import TargetSchema
from app.services.ingestor import save_upload_file

router = APIRouter()

@router.post("/upload", response_model=JobRead)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_type: str = Form("csv"),
    cleaning_config: str = Form(default='{"remove_duplicates": true, "fill_missing": true, "normalize_text": false, "smart_structure": true}'),
):
    print(f"Received upload request: {file.filename}, type={source_type}")
    # 1. Save file
    file_path = await save_upload_file(file)
    
    # Parse config
    try:
        config_dict = json.loads(cleaning_config)
    except:
        config_dict = {}

    # 2. Create Job Record
    job = Job(
        filename=file.filename,
        file_path=file_path,
        source_type=source_type,
        status=JobStatus.UPLOADED,
        cleaning_config=config_dict
    )
    await job.create()
    
    # NOTE: Processing is now triggered manually by the user via /process endpoint
    # to allow for "Start Processing" button in UI.
    
    return job

@router.post("/{job_id}/map", response_model=JobRead)
async def map_job_schema(
    job_id: PydanticObjectId,
    mapping_data: JobMappingUpdate,
):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Verify Target Schema exists
    target_schema = await TargetSchema.get(mapping_data.target_schema_id)
    if not target_schema:
        raise HTTPException(status_code=404, detail="Target schema not found")

    job.target_schema_id = mapping_data.target_schema_id
    job.field_mapping = mapping_data.field_mapping
    
    await job.save()
    return job

@router.get("/{job_id}", response_model=JobRead)
async def get_job_status(job_id: PydanticObjectId):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/", response_model=list[JobRead])
async def list_jobs():
    try:
        jobs = await Job.find_all().sort("-created_at").to_list()
        return jobs
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{job_id}/process", response_model=JobRead)
async def process_job(
    job_id: PydanticObjectId,
    background_tasks: BackgroundTasks,
):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Update status to QUEUED
    job.status = JobStatus.QUEUED
    await job.save()

    # Dispatch Background Task
    from app.services.processor import process_job_background
    background_tasks.add_task(
        process_job_background, 
        str(job.id), 
        job.file_path, 
        job.source_type or "csv", 
        job.cleaning_config or {}
    )
    
    return job

@router.delete("/{job_id}")
async def delete_job(job_id: PydanticObjectId):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete physical files before deleting job record
    import os
    files_deleted = []
    
    # Delete original uploaded file
    if job.file_path and os.path.exists(job.file_path):
        try:
            os.remove(job.file_path)
            files_deleted.append(job.file_path)
        except Exception as e:
            print(f"Failed to delete uploaded file {job.file_path}: {e}")
    
    # Delete processed output file
    if job.output_path and os.path.exists(job.output_path):
        try:
            os.remove(job.output_path)
            files_deleted.append(job.output_path)
        except Exception as e:
            print(f"Failed to delete output file {job.output_path}: {e}")
    
    # Delete the job from database
    await job.delete()
    
    return {
        "message": "Job deleted",
        "files_deleted": len(files_deleted),
        "deleted_files": files_deleted
    }



from app.models.job import Job
from beanie import PydanticObjectId
from pydantic import BaseModel
from typing import Optional

class RepairRequest(BaseModel):
    column: str
    instruction: Optional[str] = None

@router.post("/{job_id}/smart-repair")
async def repair_job_data(
    job_id: PydanticObjectId, 
    request: RepairRequest,
):
    """
    Apply AI-powered Smart Repair to a specific column
    """
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    target_path = job.output_path or job.file_path
    if not target_path:
        raise HTTPException(status_code=400, detail="No file to repair")

    try:
        from app.services.smart_repair import SmartRepairService
        import polars as pl
        import asyncio
        
        # Load Data
        df = pl.read_csv(target_path, ignore_errors=True)
        
        if request.column not in df.columns:
             raise HTTPException(status_code=400, detail=f"Column '{request.column}' not found")
             
        # Initialize Service
        repair_service = SmartRepairService()
        
        # Get values
        values = df[request.column].to_list()
        
        # Run AI Repair (network bound, properly async now)
        mapping = await repair_service.repair_column(values, request.column, request.instruction)
        
        if not mapping:
             return {"message": "AI could not suggest repairs or no changes needed", "changes": 0}
             
        # Apply changes
        new_df = repair_service.apply_repair(df, request.column, mapping)
        
        # Save
        if target_path.endswith('.csv'):
             new_df.write_csv(target_path)
             
        # Detect count of changed
        changes_count = len([k for k,v in mapping.items() if k != v])
        
        return {
            "message": "Smart Repair applied", 
            "column": request.column,
            "changes_applied": changes_count,
            "sample_fixes": dict(list(mapping.items())[:5])
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Smart Repair Failed: {str(e)}")


@router.get("/{job_id}/suggest-mappings")
async def suggest_field_mappings(
    job_id: PydanticObjectId,
    target_schema_id: PydanticObjectId,
):
    """Get AI-suggested field mappings with confidence scores"""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    target_schema = await TargetSchema.get(target_schema_id)
    if not target_schema:
        raise HTTPException(status_code=404, detail="Target schema not found")
    
    # Get source fields from inferred schema
    source_fields = job.inferred_schema or {}
    
    # Get target fields from schema definition
    target_fields = {}
    schema_def = target_schema.schema_def or {}
    if "properties" in schema_def:
        for field_name, field_def in schema_def["properties"].items():
            target_fields[field_name] = field_def.get("type", "string")
    
    # Use field matcher to generate suggestions
    from app.services.field_matcher import suggest_field_mappings
    suggestions = suggest_field_mappings(source_fields, target_fields)
    
    return {
        "job_id": str(job_id),
        "target_schema_id": str(target_schema_id),
        "suggestions": suggestions
    }

@router.get("/all/export-zip")
async def export_all_jobs_zip(format: str = "csv"):
    """
    Export all COMPLETED jobs as a single ZIP file.
    Format: 'csv' or 'json' or 'parquet'
    """
    import io
    import zipfile
    from fastapi.responses import StreamingResponse
    import os
    import polars as pl
    
    # Get all completed jobs
    jobs = await Job.find(Job.status == JobStatus.COMPLETED).to_list()
    
    if not jobs:
        raise HTTPException(status_code=404, detail="No completed jobs found to export")

    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for job in jobs:
            file_path = job.output_path or job.file_path
            
            if not file_path or not os.path.exists(file_path):
                continue
                
            # Determine archive name
            base_name = os.path.splitext(job.filename)[0]
            arcname = f"{base_name}_{job.id}.{format}"
            
            try:
                # Check if conversion is needed
                current_ext = os.path.splitext(file_path)[1].lower().replace('.', '')
                
                if current_ext == format:
                    # Direct copy if format matches
                    zip_file.write(file_path, arcname)
                else:
                    # Conversion needed
                    # Read into Polars
                    if current_ext == 'csv':
                        df = pl.read_csv(file_path, ignore_errors=True)
                    elif current_ext == 'json':
                        df = pl.read_json(file_path)
                    elif current_ext == 'parquet':
                        df = pl.read_parquet(file_path)
                    else:
                        # Fallback for unknown source: just copy as is
                        zip_file.write(file_path, f"{base_name}_{job.id}.{current_ext}")
                        continue

                    # Write to buffer in new format
                    if format == 'json':
                        # write_json returns a string, so write directly to zip
                        # Use row_oriented=True for standard [{},{}] format
                        json_str = df.write_json(row_oriented=True)
                        zip_file.writestr(arcname, json_str)
                    else:
                        with io.BytesIO() as f_buf:
                            if format == 'csv':
                                df.write_csv(f_buf)
                            elif format == 'parquet':
                                df.write_parquet(f_buf)
                            
                            # Add to zip
                            zip_file.writestr(arcname, f_buf.getvalue())
                        
            except Exception as e:
                print(f"Failed to export/convert job {job.id}: {e}")
                # Fallback: add original file with error note
                zip_file.write(file_path, f"ERROR_CONVERTING_{os.path.basename(file_path)}")
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename=all_jobs_{format}.zip"}
    )


from pydantic import BaseModel

class DBExportRequest(BaseModel):
    db_type: str  # 'postgresql' or 'mysql'
    connection_string: str
    table_name: str
    if_exists: str = 'replace'


@router.post("/{job_id}/export-to-db")
async def export_job_to_database(
    job_id: PydanticObjectId,
    export_request: DBExportRequest,
):
    """Export job data directly to a database table"""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job must be completed before export")
    
    if not job.output_path:
        raise HTTPException(status_code=400, detail="No output file available")
    
    # Load the processed data
    import polars as pl
    df = pl.read_csv(job.output_path)
    
    # Export to database
    from app.services.db_exporter import export_to_database
    result = await export_to_database(
        df,
        export_request.db_type,
        export_request.connection_string,
        export_request.table_name,
        export_request.if_exists
    )
    
    return result

@router.get("/{job_id}/data")
async def get_job_data(
    job_id: PydanticObjectId, 
    limit: int = 50,
    offset: int = 0,
    search: str = None,
):
    """Get preview data for a job (either processed or raw) with pagination and search"""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # helper to read data safely
    import polars as pl
    import os
    
    target_path = job.output_path or job.file_path
    if not os.path.exists(target_path):
        return {"columns": [], "data": [], "limit": limit, "offset": offset, "total": 0, "has_more": False, "message": "File not found"}
        
    import asyncio
    from functools import partial
    loop = asyncio.get_running_loop()

    try:
        # Read the entire file for search/pagination support
        if target_path.endswith('.csv'):
             read_csv_fn = partial(pl.read_csv, target_path, ignore_errors=True)
             df = await loop.run_in_executor(None, read_csv_fn)
        elif target_path.endswith('.json'):
             df = await loop.run_in_executor(None, pl.read_json, target_path)
        else:
             from app.services.ingestor import preview_dataframe
             preview_fn = partial(preview_dataframe, target_path, job.source_type or 'csv')
             preview_dict = await loop.run_in_executor(None, preview_fn)
             return {"columns": list(preview_dict.keys()), "data": [], "limit": limit, "offset": offset, "message": "Preview only available for CSV/JSON"}

        # Apply search filter if provided
        if search:
            # Search across all string columns
            search_lower = search.lower()
            filter_expr = None
            for col in df.columns:
                try:
                    # Try to convert column to string and search
                    col_expr = pl.col(col).cast(pl.Utf8).str.to_lowercase().str.contains(search_lower, literal=True)
                    if filter_expr is None:
                        filter_expr = col_expr
                    else:
                        filter_expr = filter_expr | col_expr
                except:
                    # Skip columns that can't be converted to string
                    continue
            
            if filter_expr is not None:
                df = df.filter(filter_expr)
        
        # Get total count after filtering
        total_rows = len(df)
        
        # Apply pagination
        df_page = df.slice(offset, limit)
        has_more = (offset + limit) < total_rows

        return {
            "columns": df.columns,
            "data": df_page.to_dicts(),
            "limit": limit,
            "offset": offset,
            "total": total_rows,
            "has_more": has_more,
            "source": "processed" if job.output_path else "raw"
        }
    except Exception as e:
        print(f"Error reading data preview: {e}")
        import traceback
        traceback.print_exc()
        return {"columns": [], "data": [], "error": str(e), "limit": limit, "offset": offset}


@router.post("/process-all")
async def process_all_jobs(
    background_tasks: BackgroundTasks,
):
    """Trigger processing for all jobs in 'uploaded' state"""
    jobs = await Job.find(Job.status == JobStatus.UPLOADED).to_list()
    
    count = 0
    from app.services.processor import process_job_background
    
    for job in jobs:
        # Update status
        job.status = JobStatus.QUEUED
        await job.save()
        
        # Dispatch task
        background_tasks.add_task(
            process_job_background, 
            str(job.id), 
            job.file_path, 
            job.source_type or "csv", 
            job.cleaning_config or {}
        )
        count += 1
    
    return {"message": f"Triggered processing for {count} jobs", "count": count}




@router.post("/{job_id}/auto-fix")
async def auto_fix_issues(
    job_id: PydanticObjectId,
):
    """Automatically fix detected validation issues using AI suggestions"""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.output_path and not job.file_path:
        raise HTTPException(status_code=400, detail="No file to fix")
    
    import polars as pl
    import os
    
    target_path = job.output_path or job.file_path
    
    try:
        # Read the data
        if target_path.endswith('.csv'):
            df = pl.read_csv(target_path, ignore_errors=True)
        elif target_path.endswith('.json'):
            df = pl.read_json(target_path)
        else:
            df = pl.read_csv(target_path, ignore_errors=True)
        
        fixes_applied = []
        validation_errors = job.validation_errors or []
        
        for error in validation_errors:
            error_type = error.get('error_type', '')
            column = error.get('column', '')
            
            if column not in df.columns:
                continue
                
            try:
                # Fix missing values
                if error_type == 'missing_value':
                    col_dtype = df[column].dtype
                    if col_dtype in [pl.Float64, pl.Int64, pl.Float32, pl.Int32]:
                        # Fill numeric with median
                        median_val = df[column].median()
                        df = df.with_columns(pl.col(column).fill_null(median_val))
                        fixes_applied.append(f"Filled missing values in '{column}' with median ({median_val})")
                    else:
                        # For text columns, use AI to infer best fill or just Mode
                        # If huge number of rows, AI might be slow, but let's try for "More Accuracy"
                        mode_val = df[column].mode().first() or "N/A"
                        df = df.with_columns(pl.col(column).fill_null(mode_val))
                        fixes_applied.append(f"Filled missing values in '{column}' with mode '{mode_val}'")
                
                # Fix type warnings - convert to numeric
                elif error_type == 'type_warning':
                    if 'numeric' in error.get('reason', '').lower():
                        df = df.with_columns(
                            pl.col(column).cast(pl.Float64, strict=False)
                        )
                        fixes_applied.append(f"Converted '{column}' to numeric type")

                # AI POWERED REPAIR for inconsistencies
                elif df[column].dtype == pl.Utf8:
                    # Use Gemini to find and fix inconsistencies in string columns
                    print(f"Applying AI Repair to '{column}' using Gemini...")
                    from app.services.smart_repair import SmartRepairService
                    repair_service = SmartRepairService()
                    
                    # Get sample of values (limit for speed/token cost)
                    # We pass the instruction to be smart about it
                    values = df[column].head(2000).to_list()
                    mapping = await repair_service.repair_column(values, column, "Fix inconsistent values (e.g. spelling, casing, abbreviations). Standardize similar concepts.")
                    
                    if mapping:
                        df = repair_service.apply_repair(df, column, mapping)
                        fixes_applied.append(f"AI repaired {len(mapping)} inconsistent variations in '{column}'")
                        
            except Exception as fix_error:
                fixes_applied.append(f"Could not auto-fix '{column}': {str(fix_error)}")
        
        # Save the fixed file
        fixed_path = target_path.replace('.csv', '_fixed.csv').replace('.json', '_fixed.json')
        if not fixed_path.endswith('_fixed.csv') and not fixed_path.endswith('_fixed.json'):
            fixed_path = target_path + '_fixed.csv'
        
        df.write_csv(fixed_path)
        
        # Update job with fixed path
        job.output_path = fixed_path
        job.validation_errors = []  # Clear errors after fix
        job.validation_summary = {
            "total_rows": len(df),
            "valid_rows": len(df),
            "invalid_rows": 0,
            "total_errors": 0,
            "fixes_applied": fixes_applied
        }
        await job.save()
        
        return {
            "message": f"Applied {len(fixes_applied)} fixes (with Gemini AI)",
            "fixes": fixes_applied,
            "fixed_file": fixed_path,
            "rows_fixed": len(df)
        }
        


    except Exception as e:
        print(f"Auto-fix error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DataUpdateRequest(BaseModel):

    row_index: int
    column: str
    value: str

class BatchUpdateRequest(BaseModel):
    updates: list[DataUpdateRequest]

@router.put("/{job_id}/data/update")
async def update_job_data(
    job_id: PydanticObjectId,
    update_request: BatchUpdateRequest,
):
    """
    Update specific cells in the job's data file.
    Does NOT support adding/removing rows yet, only in-place updates.
    """
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    target_path = job.output_path or job.file_path
    if not target_path:
        raise HTTPException(status_code=400, detail="No data file found")
        
    import polars as pl
    import os
    
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    try:
        # Load Data
        # Note: For very large files, this is inefficient. 
        # Production would use a database or chunked processing.
        if target_path.endswith('.csv'):
            df = pl.read_csv(target_path, ignore_errors=True)
        elif target_path.endswith('.json'):
            df = pl.read_json(target_path)
            # Polars read_json usually expects specific format, fallback might be needed
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format for editing")
            
        # Apply Updates
        # Polars is immutable, so we'll collect changes and recreate columns or use map_rows (slow)
        # Faster approach: Convert to Pandas or Arrow, update, convert back? 
        # Or use expressions if we can index by row number.
        
        # Simplest for now: Convert to dicts, update, recreate DF
        # Ideally we add a __row_id__ column if it doesn't exist to ensure stability
        
        data_dicts = df.to_dicts()
        
        updates_applied = 0
        for update in update_request.updates:
            if 0 <= update.row_index < len(data_dicts):
                if update.column in data_dicts[update.row_index]:
                    data_dicts[update.row_index][update.column] = update.value
                    updates_applied += 1
                    
        # Write back
        new_df = pl.DataFrame(data_dicts)
        
        if target_path.endswith('.csv'):
            new_df.write_csv(target_path)
        elif target_path.endswith('.json'):
            new_df.write_json(target_path)
            
        return {"message": f"Updated {updates_applied} cells", "success": True}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update data: {str(e)}")
