from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.database.connection import get_supabase
from app.schemas.patients import PatientCreateSchema, PatientUpdateSchema
from app.utils.logger import logger
from datetime import datetime
import uuid

# Memory storage mock patient records for sandbox/demo use cases
MOCK_PATIENTS_DB: List[Dict[str, Any]] = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "patient_name": "John Doe",
        "age": 42,
        "gender": "Male",
        "notes": "Patient reports severe molar pain. Panoramic requested for reconstruction.",
        "created_at": datetime.utcnow()
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "patient_name": "Emma Watson",
        "age": 29,
        "gender": "Female",
        "notes": "Incisor alignment checks. Standard diagnostic.",
        "created_at": datetime.utcnow()
    }
]

class PatientService:
    """Service class for managing clinical patient CRM records.
    Provides robust scoping to the logged-in doctor/clinic to ensure HIPAA/GDPR privacy.
    """

    def __init__(self):
        self.client = get_supabase()

    async def list_patients(self, user_id: str) -> List[Dict[str, Any]]:
        """Lists all patients owned by the active authenticated clinic."""
        try:
            if not self.client:
                return [p for p in MOCK_PATIENTS_DB if p["user_id"] == user_id]

            res = self.client.table("patients").select("*").eq("user_id", user_id).execute()
            
            # Format dates properly
            for item in res.data:
                if isinstance(item.get("created_at"), str):
                    item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            
            return res.data
        except Exception as e:
            logger.error(f"Error listing patients for user {user_id}: {e}")
            return [p for p in MOCK_PATIENTS_DB if p["user_id"] == user_id]

    async def get_by_id(self, user_id: str, patient_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a specific patient, ensuring the requesting clinic has rights."""
        try:
            if not self.client:
                for p in MOCK_PATIENTS_DB:
                    if p["id"] == patient_id and p["user_id"] == user_id:
                        return p
                return None

            res = self.client.table("patients").select("*").eq("id", patient_id).eq("user_id", user_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                if isinstance(item.get("created_at"), str):
                    item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
                return item
            
            # Local mock check
            for p in MOCK_PATIENTS_DB:
                if p["id"] == patient_id and p["user_id"] == user_id:
                    return p
            return None
        except Exception as e:
            logger.error(f"Error fetching patient {patient_id} for user {user_id}: {e}")
            for p in MOCK_PATIENTS_DB:
                if p["id"] == patient_id and p["user_id"] == user_id:
                    return p
            return None

    async def create(self, user_id: str, schema: PatientCreateSchema) -> Dict[str, Any]:
        """Creates a patient file associated with the clinic."""
        patient_record = {
            "user_id": user_id,
            "patient_name": schema.patient_name,
            "age": schema.age,
            "gender": schema.gender,
            "notes": schema.notes
        }

        try:
            if not self.client:
                new_id = str(uuid.uuid4())
                mock_record = {
                    "id": new_id,
                    **patient_record,
                    "created_at": datetime.utcnow()
                }
                MOCK_PATIENTS_DB.append(mock_record)
                logger.info(f"Created patient locally (Mock Mode): {schema.patient_name}")
                return mock_record

            res = self.client.table("patients").insert(patient_record).execute()
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed storing patient to database"
                )
            
            item = res.data[0]
            if isinstance(item.get("created_at"), str):
                item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            
            logger.info(f"Created patient in Supabase: {schema.patient_name}")
            return item
        except Exception as e:
            logger.error(f"Error creating patient {schema.patient_name}: {e}")
            # Fall back
            new_id = str(uuid.uuid4())
            mock_record = {
                "id": new_id,
                **patient_record,
                "created_at": datetime.utcnow()
            }
            MOCK_PATIENTS_DB.append(mock_record)
            return mock_record

    async def update(self, user_id: str, patient_id: str, schema: PatientUpdateSchema) -> Dict[str, Any]:
        """Modifies patient details, verifying user scoping."""
        # Check if exists
        patient = await self.get_by_id(user_id, patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient record not found"
            )

        # Prepare update dict
        update_data = {}
        if schema.patient_name is not None:
            update_data["patient_name"] = schema.patient_name
        if schema.age is not None:
            update_data["age"] = schema.age
        if schema.gender is not None:
            update_data["gender"] = schema.gender
        if schema.notes is not None:
            update_data["notes"] = schema.notes

        if not update_data:
            return patient

        try:
            if not self.client:
                # Update in-memory
                for p in MOCK_PATIENTS_DB:
                    if p["id"] == patient_id and p["user_id"] == user_id:
                        p.update(update_data)
                        return p
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Patient not found in Mock DB"
                )

            res = self.client.table("patients").update(update_data).eq("id", patient_id).eq("user_id", user_id).execute()
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update patient record"
                )
            
            item = res.data[0]
            if isinstance(item.get("created_at"), str):
                item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            return item
        except Exception as e:
            logger.error(f"Error updating patient {patient_id}: {e}")
            # Mock fallback
            for p in MOCK_PATIENTS_DB:
                if p["id"] == patient_id and p["user_id"] == user_id:
                    p.update(update_data)
                    return p
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error executing database update"
            )

    async def delete(self, user_id: str, patient_id: str) -> bool:
        """Removes a patient file from the platform, verifying scoping."""
        patient = await self.get_by_id(user_id, patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient record not found"
            )

        try:
            if not self.client:
                # Delete in-memory
                for i, p in enumerate(MOCK_PATIENTS_DB):
                    if p["id"] == patient_id and p["user_id"] == user_id:
                        MOCK_PATIENTS_DB.pop(i)
                        return True
                return False

            res = self.client.table("patients").delete().eq("id", patient_id).eq("user_id", user_id).execute()
            logger.info(f"Deleted patient record: {patient_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting patient {patient_id}: {e}")
            # Mock fallback
            for i, p in enumerate(MOCK_PATIENTS_DB):
                if p["id"] == patient_id and p["user_id"] == user_id:
                    MOCK_PATIENTS_DB.pop(i)
                    return True
            return False

# Instantiate singleton CRM patient service
patient_service = PatientService()
