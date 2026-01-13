from typing import Optional
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

class TargetSchemaBase(BaseModel):
    name: str
    description: Optional[str] = None
    schema_def: dict = Field(default={}) # e.g. {"col_name": "type", "col2": "type"}

class TargetSchema(Document, TargetSchemaBase):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "target_schemas"

class TargetSchemaCreate(TargetSchemaBase):
    pass

class TargetSchemaRead(TargetSchemaBase):
    id: PydanticObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
