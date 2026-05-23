from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class PatientBaseSchema(BaseModel):
    patient_name: str = Field(..., description="Full legal name of the patient")
    age: int = Field(..., ge=0, description="Patient age in years")
    gender: str = Field(..., description="Patient gender (e.g. Male, Female, Other)")
    notes: Optional[str] = Field(None, description="Diagnostic dental notes, clinical histories")

class PatientCreateSchema(PatientBaseSchema):
    pass

class PatientUpdateSchema(BaseModel):
    patient_name: Optional[str] = Field(None, description="Updated legal name of the patient")
    age: Optional[int] = Field(None, ge=0, description="Updated patient age")
    gender: Optional[str] = Field(None, description="Updated patient gender")
    notes: Optional[str] = Field(None, description="Updated dental clinical notes")

class PatientResponseSchema(PatientBaseSchema):
    id: str = Field(..., description="Unique patient record UUID")
    user_id: str = Field(..., description="Owner clinician/dentist UUID reference")
    created_at: datetime = Field(..., description="Record creation timestamp")

    class Config:
        from_attributes = True
