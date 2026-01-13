import shutil
import os
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException
import polars as pl
import pandas as pd

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

async def save_upload_file(upload_file: UploadFile) -> str:
    MAX_FILE_SIZE = 500 * 1024 * 1024 # 500MB Limit
    
    try:
        file_path = UPLOAD_DIR / upload_file.filename
        
        # Write file in chunks to avoid memory issues
        # Increased chunk size to 10MB for maximum upload speed
        total_size = 0
        async with aiofiles.open(file_path, 'wb') as out_file:
            while content := await upload_file.read(10 * 1024 * 1024):  # 10MB chunks
                total_size += len(content)
                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail=f"File exceeds maximum limit of {MAX_FILE_SIZE/(1024*1024)}MB")
                await out_file.write(content)
        
        return str(file_path)
    except Exception as e:
        # Fallback if aiofiles not installed, though it should be.
        # If not, use standard open but it blocks the loop briefly.
        # Given "timeout", we prioritize async correctness.
        print(f"Error saving file: {e}")
        # Trying synchronous write as backup if aiofiles fails import (check imports first)
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

def preview_dataframe(file_path: str, source_type: str) -> dict:
    try:
        if source_type == "csv":
            df = pl.read_csv(file_path, ignore_errors=True, n_rows=100)
        elif source_type == "json":
            df = pl.read_json(file_path)
        elif source_type == "parquet":
            df = pl.read_parquet(file_path)
        elif source_type == "excel":
            # Polars excel support is via calamine or pandas, fallback to pandas for stability
            pdf = pd.read_excel(file_path, nrows=100)
            df = pl.from_pandas(pdf)
        else:
            raise ValueError("Unsupported format")
        
        return df.head(5).to_dict(as_series=False)
    except Exception as e:
        print(f"Error previewing file: {e}")
        return {}
