from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from app.models.schema import TargetSchema, TargetSchemaCreate, TargetSchemaRead

router = APIRouter()

@router.post("/", response_model=TargetSchemaRead)
async def create_schema(
    schema: TargetSchemaCreate,
):
    db_schema = TargetSchema(**schema.dict())
    await db_schema.create()
    return db_schema

@router.get("/", response_model=list[TargetSchemaRead])
async def list_schemas():
    schemas = await TargetSchema.find_all().sort((TargetSchema.name, 1)).to_list()
    return schemas

    return schema

@router.delete("/{schema_id}")
async def delete_schema(schema_id: PydanticObjectId):
    schema = await TargetSchema.get(schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Schema not found")
    
    await schema.delete()
    return {"message": "Schema deleted successfully"}
