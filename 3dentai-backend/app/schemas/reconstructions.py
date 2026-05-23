from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ReconstructionCreateSchema(BaseModel):
    patient_id: str = Field(..., description="UUID reference of the registered patient")

class ReconstructionResponseSchema(BaseModel):
    id: str = Field(..., description="Unique UUID representation of the 3D reconstruction")
    patient_id: str = Field(..., description="Associated patient ID reference")
    pano_image_url: Optional[str] = Field(None, description="Supabase public URL of the uploaded 2D panoramic image")
    output_voxel_url: Optional[str] = Field(None, description="Supabase public URL of the predicted 3D voxel density matrix")
    output_stl_url: Optional[str] = Field(None, description="Supabase public URL of the generated STL mesh file")
    preview_url: Optional[str] = Field(None, description="Supabase public URL of the 2D rendering preview")
    status: str = Field("pending", description="Reconstruction lifecycle state: pending, preprocessing, reconstructing, completed, failed")
    confidence_score: float = Field(0.00, description="Model calculation confidence probability in percentage")
    created_at: datetime = Field(..., description="Reconstruction job initiation timestamp")

    class Config:
        from_attributes = True

class ReconstructionUploadResponseSchema(BaseModel):
    reconstruction_id: str = Field(..., description="UUID of the initialized reconstruction task")
    pano_image_url: str = Field(..., description="Uploaded panoramic public access URL")
    status: str = Field("pending", description="Initial status of the task")
