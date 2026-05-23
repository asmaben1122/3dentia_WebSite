from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.patients import (
    PatientCreateSchema, 
    PatientUpdateSchema, 
    PatientResponseSchema
)
from app.services.patient_service import patient_service
from app.auth.security import get_current_user_id
from app.utils.logger import logger

router = APIRouter(prefix="/patients", tags=["Patients CRM"])

@router.get(
    "", 
    response_model=List[PatientResponseSchema],
    summary="List all patients"
)
async def list_patients(current_user_id: str = Depends(get_current_user_id)):
    """Fetches a list of all patient records associated with the logged-in doctor's clinic."""
    patients = await patient_service.list_patients(current_user_id)
    return patients

@router.get(
    "/{id}", 
    response_model=PatientResponseSchema,
    summary="Fetch specific patient record"
)
async def get_patient(id: str, current_user_id: str = Depends(get_current_user_id)):
    """Retrieves detailed information for a single patient record by their UUID."""
    patient = await patient_service.get_by_id(current_user_id, id)
    if not patient:
        logger.warning(f"Patient {id} not found or unauthorized read attempted by user {current_user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found or access unauthorized"
        )
    return patient

@router.post(
    "", 
    response_model=PatientResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new patient record"
)
async def create_patient(
    payload: PatientCreateSchema, 
    current_user_id: str = Depends(get_current_user_id)
):
    """Initializes a new patient chart registered under the authenticated doctor/clinic profile."""
    patient = await patient_service.create(current_user_id, payload)
    return patient

@router.put(
    "/{id}", 
    response_model=PatientResponseSchema,
    summary="Update an existing patient record"
)
async def update_patient(
    id: str, 
    payload: PatientUpdateSchema, 
    current_user_id: str = Depends(get_current_user_id)
):
    """Updates one or more fields in a patient's chart, such as dental history notes."""
    patient = await patient_service.update(current_user_id, id, payload)
    return patient

@router.delete(
    "/{id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a patient record"
)
async def delete_patient(id: str, current_user_id: str = Depends(get_current_user_id)):
    """Permanently purges a patient record from the database.
    WARNING: This executes cascading deletion on all child 3D dental reconstructions.
    """
    success = await patient_service.delete(current_user_id, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not delete patient record. Ensure record exists and is under your authorization."
        )
    return None
