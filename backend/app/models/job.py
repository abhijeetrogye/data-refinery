from datetime import datetime
from typing import Optional, Any
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from enum import Enum

class JobStatus(str, Enum):
    UPLOADED = "uploaded"     # File saved, waiting for user to start processing
    QUEUED = "queued"
    PROCESSING = "processing"
    CLEANING = "cleaning"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"

class Job(Document):
    status: JobStatus = Field(default=JobStatus.QUEUED)
    filename: str
    file_path: str
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None  # When processing started
    completed_at: Optional[datetime] = None  # When processing completed
    
    # Metadata
    source_type: Optional[str] = None # csv, json, pdf, xlsx, xml
    total_rows: Optional[int] = 0
    processed_rows: Optional[int] = 0
    inferred_schema: Optional[dict] = Field(default={})
    cleaning_config: Optional[dict] = Field(default={})

    # Schema Mapping
    target_schema_id: Optional[PydanticObjectId] = None
    field_mapping: Optional[dict] = Field(default={})
    transformation_log: Optional[list] = Field(default=[])
    
    # Validation Results
    validation_errors: Optional[list] = Field(default=[])
    validation_summary: Optional[dict] = Field(default={})
    
    # Output
    output_path: Optional[str] = None
    
    class Settings:
        name = "jobs"
        use_state_management = True

class JobCreate(BaseModel):
    filename: str
    file_path: str
    source_type: str

class JobMappingUpdate(BaseModel):
    target_schema_id: PydanticObjectId
    field_mapping: dict

class JobRead(BaseModel):
    id: PydanticObjectId = Field(alias="_id", serialization_alias="id")
    status: JobStatus
    filename: str
    message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    source_type: Optional[str] = None
    total_rows: int
    processed_rows: int
    inferred_schema: Optional[dict] = {}
    target_schema_id: Optional[PydanticObjectId] = None
    field_mapping: Optional[dict] = {}
    transformation_log: Optional[list] = []
    validation_errors: Optional[list] = []
    validation_summary: Optional[dict] = {}
    output_path: Optional[str] = None
    
    # Computed progress fields
    @property
    def progress_percent(self) -> int:
        if self.total_rows and self.total_rows > 0:
            return min(100, int((self.processed_rows / self.total_rows) * 100))
        if self.status == JobStatus.COMPLETED:
            return 100
        if self.status == JobStatus.UPLOADED or self.status == JobStatus.QUEUED:
            return 0
        return 50  # Processing/Cleaning/Validating shows partial progress
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
