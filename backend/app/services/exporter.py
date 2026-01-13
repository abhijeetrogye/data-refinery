"""
Data Export Service
- CSV export
- JSON export
- Parquet export (ML-ready)
- Metadata inclusion
"""
import polars as pl
from pathlib import Path
from datetime import datetime
import json

OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

class DataExporter:
    def __init__(self, df: pl.DataFrame, job_id: int, schema_version: str = "1.0"):
        self.df = df
        self.job_id = job_id
        self.schema_version = schema_version
        self.timestamp = datetime.utcnow().isoformat()
    
    def _get_metadata(self, validation_summary: dict = None) -> dict:
        return {
            "job_id": self.job_id,
            "schema_version": self.schema_version,
            "processing_timestamp": self.timestamp,
            "total_rows": len(self.df),
            "columns": self.df.columns,
            "validation_summary": validation_summary or {}
        }
    
    def export_csv(self, validation_summary: dict = None) -> str:
        """Export as CSV with metadata sidecar file"""
        csv_path = OUTPUT_DIR / f"job_{self.job_id}.csv"
        meta_path = OUTPUT_DIR / f"job_{self.job_id}_metadata.json"
        
        self.df.write_csv(csv_path)
        
        with open(meta_path, "w") as f:
            json.dump(self._get_metadata(validation_summary), f, indent=2)
        
        return str(csv_path)
    
    def export_json(self, validation_summary: dict = None) -> str:
        """Export as JSON with embedded metadata"""
        json_path = OUTPUT_DIR / f"job_{self.job_id}.json"
        
        output = {
            "metadata": self._get_metadata(validation_summary),
            "data": self.df.to_dicts()
        }
        
        with open(json_path, "w") as f:
            json.dump(output, f, indent=2)
        
        return str(json_path)
    
    def export_parquet(self, validation_summary: dict = None) -> str:
        """Export as Parquet (ML-ready format)"""
        parquet_path = OUTPUT_DIR / f"job_{self.job_id}.parquet"
        meta_path = OUTPUT_DIR / f"job_{self.job_id}_parquet_metadata.json"
        
        self.df.write_parquet(parquet_path)
        
        with open(meta_path, "w") as f:
            json.dump(self._get_metadata(validation_summary), f, indent=2)
        
        return str(parquet_path)
    
    def export_all(self, validation_summary: dict = None) -> dict:
        """Export in all formats"""
        return {
            "csv": self.export_csv(validation_summary),
            "json": self.export_json(validation_summary),
            "parquet": self.export_parquet(validation_summary)
        }
