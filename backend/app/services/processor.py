import polars as pl
from datetime import datetime
from beanie import PydanticObjectId
from app.models.job import Job, JobStatus
from app.services.inference import infer_schema
from app.services.cleaner import DataCleaner
from app.services.validator import DataValidator
from app.services.exporter import DataExporter


def read_file_to_df(file_path: str, source_type: str) -> pl.DataFrame:
    if source_type == 'csv':
        # Try to detect encoding with minimal sample for maximum speed
        try:
            import chardet
            with open(file_path, 'rb') as rawdata:
                result = chardet.detect(rawdata.read(5000))  # Reduced to 5KB for instant detection
            encoding = result['encoding'] or 'utf-8'
        except ImportError:
            encoding = 'utf-8' # Default if chardet missing

        # Special handling for potentially binary/corrupt files that might be detected as something else
        if not encoding:
            encoding = 'utf-8'
            
        encodings_to_try = [encoding, 'utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        
        # Remove duplicates while preserving order
        seen = set()
        unique_encodings = [x for x in encodings_to_try if not (x in seen or seen.add(x))]

        for enc in unique_encodings:
            try:
                # Limit to 1M rows for safety
                return pl.read_csv(file_path, ignore_errors=True, encoding=enc, n_rows=1000000)
            except Exception:
                continue
        
        # If all else fails, try pandas (more robust) or fallback
        try:
            import pandas as pd
            pdf = pd.read_csv(file_path, encoding='latin-1', on_bad_lines='skip', nrows=1000000)
            return pl.from_pandas(pdf)
        except Exception:
             # Last resort: just read it and ignore everything bad
            return pl.read_csv(file_path, ignore_errors=True, n_rows=10000)

    elif source_type == 'json':
        return pl.read_json(file_path)
    elif source_type == 'parquet':
        return pl.read_parquet(file_path)
    elif source_type in ['xlsx', 'excel']:
        return pl.read_excel(file_path)
    elif source_type == 'xml':
        import xmltodict
        with open(file_path, 'r', encoding='utf-8') as f:
            data = xmltodict.parse(f.read())
            # Attempt to find the main data list
            for key in data:
                if isinstance(data[key], dict):
                    for subkey in data[key]:
                        if isinstance(data[key][subkey], list):
                            return pl.DataFrame(data[key][subkey])
        return pl.DataFrame({})
    elif source_type == 'pdf':
        from app.services.pdf_processor import process_pdf
        return process_pdf(file_path)
    elif source_type == 'txt':
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = [line.strip() for line in f.readlines() if line.strip()]
        except UnicodeDecodeError:
             with open(file_path, 'r', encoding='latin-1') as f:
                lines = [line.strip() for line in f.readlines() if line.strip()]
        return pl.DataFrame({"text": lines, "line_number": range(1, len(lines) + 1)})
    
    return pl.DataFrame({})



# Dedicated executor for heavy processing tasks - increased for maximum speed
from concurrent.futures import ThreadPoolExecutor
processing_executor = ThreadPoolExecutor(max_workers=4)  # Reduced to 4 to prevent CPU thrashing

async def process_job_background(job_id: str, file_path: str, source_type: str, config_dict: dict):
    print(f"Background: Processing job {job_id}...")
    
    # job_id is string from background task args
    job = await Job.get(PydanticObjectId(job_id))
    if not job:
        return

    try:
        # Step 1: PROCESSING - Load Data
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.utcnow()
        await job.save()

        # Run blocking I/O and CPU bound tasks in executor
        import asyncio
        from functools import partial
        
        loop = asyncio.get_running_loop()
        
        # Read file (blocking I/O)
        df = await loop.run_in_executor(processing_executor, read_file_to_df, file_path, source_type)
        
        original_rows = len(df)
        job.total_rows = original_rows
        await job.save()
        
        # Step 2: CLEANING
        job.status = JobStatus.CLEANING
        await job.save()
        
        # Cleaning (CPU bound)
        cleaner = DataCleaner(df, config_dict)
        df, logs = await loop.run_in_executor(processing_executor, cleaner.clean)
        
        job.transformation_log = logs
        
        # Step 3: VALIDATING
        job.status = JobStatus.VALIDATING
        await job.save()
        
        # Get target schema if mapped
        target_schema = None
        if job.target_schema_id:
            from app.models.schema import TargetSchema
            schema_obj = await TargetSchema.get(job.target_schema_id)
            if schema_obj:
                target_schema = schema_obj.schema_def
        
        # Validation (CPU bound)
        validator = DataValidator(df, target_schema)
        # define wrapper for validation as it returns tuple
        def run_validation():
            v_df, v_err = validator.validate()
            v_sum = validator.get_summary()
            return v_df, v_err, v_sum
            
        valid_df, errors, validation_summary = await loop.run_in_executor(processing_executor, run_validation)
        
        # Step 4: EXPORT - Save cleaned data
        # Use string ID for exporter
        exporter = DataExporter(valid_df, str(job_id))
        output_path = await loop.run_in_executor(processing_executor, exporter.export_csv, validation_summary)
        
        # Update job with results
        job.processed_rows = len(valid_df)
        job.inferred_schema = infer_schema(df)
        job.validation_errors = errors[:100]  # Limit stored errors
        job.validation_summary = validation_summary
        job.output_path = str(output_path)
        job.status = JobStatus.COMPLETED
        job.completed_at = datetime.utcnow()
        job.message = f"Processed {original_rows} rows. Valid: {len(valid_df)}. Errors: {len(errors)}. Removed {cleaner.stats['removed_duplicates']} duplicates."
        
        await job.save()
        print(f"Background: Job {job_id} completed. Output: {output_path}")
        
    except Exception as e:
        import traceback
        print(f"Background: Job {job_id} failed: {e}")
        traceback.print_exc()
        job.status = JobStatus.FAILED
        job.message = str(e)
        job.completed_at = datetime.utcnow()
        await job.save()
