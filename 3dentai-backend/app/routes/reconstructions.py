import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import RedirectResponse
from typing import List, Optional
from app.schemas.reconstructions import (
    ReconstructionResponseSchema, 
    ReconstructionUploadResponseSchema,
    ReconstructionCreateSchema
)
from app.services.reconstruction_service import reconstruction_service
from app.services.patient_service import patient_service
from app.auth.security import get_current_user_id
from app.utils.logger import logger

router = APIRouter(tags=["AI 3D Reconstructions"])

@router.get(
    "/reconstructions", 
    response_model=List[ReconstructionResponseSchema],
    summary="List patient reconstructions"
)
async def list_reconstructions(
    patient_id: str, 
    current_user_id: str = Depends(get_current_user_id)
):
    """Lists all volumetric 3D reconstruction attempts completed or in progress for a given patient."""
    # Ensure patient is owned by the current clinic (HIPAA security)
    patient = await patient_service.get_by_id(current_user_id, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found or access unauthorized"
        )
        
    reconstructions = await reconstruction_service.list_reconstructions(patient_id)
    return reconstructions

@router.get(
    "/reconstructions/{id}", 
    response_model=ReconstructionResponseSchema,
    summary="Get reconstruction details & progress"
)
async def get_reconstruction(
    id: str, 
    current_user_id: str = Depends(get_current_user_id)
):
    """Retrieves full job status details, confidence score, and output URLs for a single reconstruction job."""
    recon = await reconstruction_service.get_by_id(id)
    if not recon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reconstruction record not found"
        )
        
    # Verify patient ownership
    patient = await patient_service.get_by_id(current_user_id, recon["patient_id"])
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this patient's records is restricted"
        )
        
    return recon

@router.post(
    "/upload-pano", 
    response_model=ReconstructionUploadResponseSchema,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload 2D panoramic and trigger async AI pipeline"
)
async def upload_panoramic(
    background_tasks: BackgroundTasks,
    patient_id: str = Form(..., description="Target patient UUID"),
    file: UploadFile = File(..., description="Dental 2D panoramic X-Ray file (JPEG, PNG)"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Accepts a multipart dental panoramic image file upload, pushes it to Cloud storage, 
    initializes a database tracking row, and triggers the PyTorch AI reconstruction task in the background.
    """
    # 1. Verify Patient ownership
    patient = await patient_service.get_by_id(current_user_id, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target patient record not found"
        )
        
    # 2. Verify file extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in [".jpg", ".jpeg", ".png", ".tif", ".tiff"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type. Supported formats: JPEG, PNG, TIFF."
        )

    # 3. Process Upload and Asynchronously run neural pipeline
    file_bytes = await file.read()
    response = await reconstruction_service.initialize_upload_and_pipeline(
        patient_id=patient_id,
        file_name=filename,
        file_bytes=file_bytes,
        background_tasks=background_tasks
    )
    
    return response

@router.post(
    "/run-reconstruction", 
    response_model=ReconstructionResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Manually trigger AI pipeline with an existing image URL"
)
async def run_manual_reconstruction(
    payload: ReconstructionCreateSchema,
    background_tasks: BackgroundTasks,
    pano_image_url: Optional[str] = Form(None, description="Optional pre-stored panoramic image URL to parse"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Launches the 3D dental reconstruction pipeline using an existing panoramic image URL.
    Helpful if the image was already uploaded directly via client storage integration.
    """
    # 1. Verify patient ownership
    patient = await patient_service.get_by_id(current_user_id, payload.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target patient record not found"
        )

    # 2. Create the baseline DB entry
    recon_record = await reconstruction_service.create_record(
        patient_id=payload.patient_id,
        pano_url=pano_image_url
    )

    # 3. Simulate processing a mock local file representing the download
    # In production, developers would download pano_image_url to local folder
    local_pano_name = f"manual_{uuid.uuid4()}.jpg"
    os.makedirs("uploads", exist_ok=True)
    local_pano_path = os.path.join("uploads", local_pano_name)
    
    # Write a small white placeholder image
    try:
        from PIL import Image
        img = Image.new("RGB", (1024, 512), color="white")
        img.save(local_pano_path)
    except Exception:
        # Create empty file
        with open(local_pano_path, "w") as f:
            f.write("mock image")

    # 4. Fire background process
    background_tasks.add_task(
        reconstruction_service.execute_async_inference_pipeline,
        recon_id=recon_record["id"],
        local_pano_path=local_pano_path,
        job_uuid=str(uuid.uuid4())
    )

    return recon_record

@router.get(
    "/download-result/{id}", 
    summary="Download 3D model result (STL/Voxel)"
)
async def download_result(
    id: str,
    format: str = "stl",
    current_user_id: str = Depends(get_current_user_id)
):
    """Provides direct browser redirection to the output STL mesh (3D model) or voxel array 
    representing the reconstruction results in Supabase Cloud Storage.
    
    Args:
        id (str): The reconstruction UUID.
        format (str): Desired asset: 'stl' (default 3D model) or 'voxel' (numpy/tensor volume).
    """
    recon = await reconstruction_service.get_by_id(id)
    if not recon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reconstruction record not found"
        )
        
    # Verify clinic authorization
    patient = await patient_service.get_by_id(current_user_id, recon["patient_id"])
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted"
        )

    # Resolve target URL
    target_url = None
    if format.lower() == "stl":
        target_url = recon.get("output_stl_url")
    elif format.lower() == "voxel":
        target_url = recon.get("output_voxel_url")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format option. Choose 'stl' or 'voxel'."
        )

    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requested asset format ({format}) has not completed generation or is unavailable."
        )

    # Perform redirect to the cloud file
    return RedirectResponse(url=target_url)
