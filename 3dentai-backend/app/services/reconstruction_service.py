import os
import uuid
import shutil
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status, BackgroundTasks
from app.database.connection import get_supabase
from app.services.supabase_service import supabase_storage
from app.ai.inference import run_reconstruction
from app.utils.logger import logger
from datetime import datetime

# Local memory-based mock database for standalone testing when Supabase credentials are missing
MOCK_RECONSTRUCTIONS_DB: List[Dict[str, Any]] = [
    {
        "id": "99999999-9999-9999-9999-999999999999",
        "patient_id": "11111111-1111-1111-1111-111111111111",
        "pano_image_url": "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=600",
        "output_voxel_url": "https://mock-storage.3dentai.com/voxel-outputs/pano_demo_voxel.npy",
        "output_stl_url": "https://mock-storage.3dentai.com/stl-meshes/pano_demo.stl",
        "preview_url": "https://mock-storage.3dentai.com/reconstruction-previews/pano_demo_preview.jpg",
        "status": "completed",
        "confidence_score": 94.75,
        "created_at": datetime.utcnow()
    }
]

class ReconstructionService:
    """Service class managing volumetric 3D reconstruction pipelines.
    Triggers asynchronous inference runs and handles all Supabase Storage transfers.
    """

    def __init__(self):
        self.client = get_supabase()

    async def list_reconstructions(self, patient_id: str) -> List[Dict[str, Any]]:
        """Lists all reconstructions associated with a specific patient."""
        try:
            if not self.client:
                return [r for r in MOCK_RECONSTRUCTIONS_DB if r["patient_id"] == patient_id]

            res = self.client.table("reconstructions").select("*").eq("patient_id", patient_id).execute()
            
            # Format datetime
            for item in res.data:
                if isinstance(item.get("created_at"), str):
                    item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
                    
            return res.data
        except Exception as e:
            logger.error(f"Error listing reconstructions for patient {patient_id}: {e}")
            return [r for r in MOCK_RECONSTRUCTIONS_DB if r["patient_id"] == patient_id]

    async def get_by_id(self, recon_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a specific reconstruction record."""
        try:
            if not self.client:
                for r in MOCK_RECONSTRUCTIONS_DB:
                    if r["id"] == recon_id:
                        return r
                return None

            res = self.client.table("reconstructions").select("*").eq("id", recon_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                if isinstance(item.get("created_at"), str):
                    item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
                return item
                
            # Local mock check
            for r in MOCK_RECONSTRUCTIONS_DB:
                if r["id"] == recon_id:
                    return r
            return None
        except Exception as e:
            logger.error(f"Error fetching reconstruction {recon_id}: {e}")
            for r in MOCK_RECONSTRUCTIONS_DB:
                if r["id"] == recon_id:
                    return r
            return None

    async def create_record(self, patient_id: str, pano_url: str = None) -> Dict[str, Any]:
        """Initializes a new pending reconstruction record in the database."""
        record = {
            "patient_id": patient_id,
            "pano_image_url": pano_url,
            "status": "pending",
            "confidence_score": 0.00
        }

        try:
            if not self.client:
                new_id = str(uuid.uuid4())
                mock_record = {
                    "id": new_id,
                    **record,
                    "created_at": datetime.utcnow()
                }
                MOCK_RECONSTRUCTIONS_DB.append(mock_record)
                logger.info(f"Initialized reconstruction locally (Mock Mode): {new_id}")
                return mock_record

            res = self.client.table("reconstructions").insert(record).execute()
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database failed to register the reconstruction job."
                )
            
            item = res.data[0]
            if isinstance(item.get("created_at"), str):
                item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            return item
        except Exception as e:
            logger.error(f"Error registering reconstruction: {e}")
            # Mock fallback
            new_id = str(uuid.uuid4())
            mock_record = {
                "id": new_id,
                **record,
                "created_at": datetime.utcnow()
            }
            MOCK_RECONSTRUCTIONS_DB.append(mock_record)
            return mock_record

    async def update_record(self, recon_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Updates a reconstruction record with status, confidence, or output file URLs."""
        try:
            if not self.client:
                for r in MOCK_RECONSTRUCTIONS_DB:
                    if r["id"] == recon_id:
                        r.update(updates)
                        return r
                raise ValueError("Record not found in mock database")

            res = self.client.table("reconstructions").update(updates).eq("id", recon_id).execute()
            if not res.data:
                raise ValueError("No record updated in Supabase")
            
            item = res.data[0]
            if isinstance(item.get("created_at"), str):
                item["created_at"] = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            return item
        except Exception as e:
            logger.error(f"Error updating reconstruction record {recon_id}: {e}")
            for r in MOCK_RECONSTRUCTIONS_DB:
                if r["id"] == recon_id:
                    r.update(updates)
                    return r
            raise e

    async def initialize_upload_and_pipeline(
        self, 
        patient_id: str, 
        file_name: str, 
        file_bytes: bytes, 
        background_tasks: BackgroundTasks
    ) -> Dict[str, Any]:
        """Core endpoint sequence:
        1. Save image locally & to Supabase storage.
        2. Create database record.
        3. Dispatch background AI PyTorch reconstruction pipeline.
        """
        # Ensure temporary uploads directory exists
        os.makedirs("uploads", exist_ok=True)
        
        # Save temporary local copy for AI input
        job_uuid = str(uuid.uuid4())
        _, file_ext = os.path.splitext(file_name)
        if not file_ext:
            file_ext = ".jpg"
            
        local_pano_name = f"pano_{job_uuid}{file_ext}"
        local_pano_path = os.path.join("uploads", local_pano_name)
        
        with open(local_pano_path, "wb") as buffer:
            buffer.write(file_bytes)
            
        logger.info(f"Saved temporary local image upload to {local_pano_path}")

        # Upload panoramic image to Supabase Storage
        pano_cloud_url = supabase_storage.upload_file(
            bucket_name=settings.BUCKET_PANO_IMAGES,
            file_name=local_pano_name,
            file_data=file_bytes
        )

        # Create base reconstruction DB entry
        recon_record = await self.create_record(
            patient_id=patient_id, 
            pano_url=pano_cloud_url
        )
        
        recon_id = recon_record["id"]

        # Schedule async PyTorch model inference run in the background
        background_tasks.add_task(
            self.execute_async_inference_pipeline,
            recon_id=recon_id,
            local_pano_path=local_pano_path,
            job_uuid=job_uuid
        )

        return {
            "reconstruction_id": recon_id,
            "pano_image_url": pano_cloud_url,
            "status": "pending"
        }

    async def execute_async_inference_pipeline(
        self, 
        recon_id: str, 
        local_pano_path: str, 
        job_uuid: str
    ):
        """Asynchronous execution task running outside main thread.
        Preprocesses, infers, extracts mesh, uploads assets, and completes DB logs.
        """
        logger.info(f"⏳ Asynchronously initiating dental AI pipeline for Job UUID: {job_uuid} (DB ID: {recon_id})")
        
        try:
            # Step 1: Pre-processing state
            await self.update_record(recon_id, {"status": "preprocessing"})
            
            # Step 2: Inference execution (PyTorch volumetric mapping)
            # Run inference synchronously in this background worker thread
            await self.update_record(recon_id, {"status": "reconstructing"})
            
            results = run_reconstruction(local_pano_path)
            
            if results["status"] == "completed":
                logger.info(f"Finished local reconstruction calculations. Uploading outcomes to Supabase storage...")
                
                voxel_url = None
                stl_url = None
                preview_url = None
                
                # Upload predicted voxel arrays (.npy file)
                if results["voxel_path"] and os.path.exists(results["voxel_path"]):
                    voxel_filename = f"voxel_{job_uuid}.npy"
                    with open(results["voxel_path"], "rb") as f:
                        voxel_url = supabase_storage.upload_file(
                            bucket_name=settings.BUCKET_VOXEL_OUTPUTS,
                            file_name=voxel_filename,
                            file_data=f
                        )
                
                # Upload generated triangular STL mesh model (.stl file)
                if results["stl_path"] and os.path.exists(results["stl_path"]):
                    stl_filename = f"model_{job_uuid}.stl"
                    with open(results["stl_path"], "rb") as f:
                        stl_url = supabase_storage.upload_file(
                            bucket_name=settings.BUCKET_STL_MESHES,
                            file_name=stl_filename,
                            file_data=f
                        )
                        
                # Upload rendered 2D preview (.jpg preview)
                if results["preview_path"] and os.path.exists(results["preview_path"]):
                    preview_filename = f"preview_{job_uuid}.jpg"
                    with open(results["preview_path"], "rb") as f:
                        preview_url = supabase_storage.upload_file(
                            bucket_name=settings.BUCKET_PREVIEWS,
                            file_name=preview_filename,
                            file_data=f
                        )

                # Finalize DB transaction with success state
                await self.update_record(recon_id, {
                    "output_voxel_url": voxel_url,
                    "output_stl_url": stl_url,
                    "preview_url": preview_url,
                    "status": "completed",
                    "confidence_score": results["confidence_score"]
                })
                
                logger.info(f"🎉 Fully completed async AI pipeline for DB ID: {recon_id}.")
            else:
                # Mark failed pipeline
                await self.update_record(recon_id, {
                    "status": "failed",
                    "confidence_score": 0.00
                })
                logger.error(f"❌ Dental AI pipeline failed for DB ID: {recon_id}. Error: {results['error']}")
                
        except Exception as e:
            logger.error(f"❌ Uncaught exception during async dental AI processing: {e}")
            try:
                await self.update_record(recon_id, {
                    "status": "failed",
                    "confidence_score": 0.00
                })
            except Exception:
                pass
        finally:
            # Step 5: File Housekeeping / Cleanup
            # Delete temporary local file assets to preserve storage
            try:
                # Delete inputs
                if os.path.exists(local_pano_path):
                    os.remove(local_pano_path)
                # Delete intermediate/output products if they exist locally
                base_name = os.path.splitext(local_pano_path)[0]
                preprocessed_path = f"{base_name}_preprocessed{os.path.splitext(local_pano_path)[1]}"
                if os.path.exists(preprocessed_path):
                    os.remove(preprocessed_path)
                
                local_voxel = f"outputs/{os.path.basename(base_name)}_voxel.npy"
                if os.path.exists(local_voxel):
                    os.remove(local_voxel)
                    
                local_stl = f"outputs/{os.path.basename(base_name)}.stl"
                if os.path.exists(local_stl):
                    os.remove(local_stl)
                    
                local_preview = f"outputs/{os.path.basename(base_name)}_preview.jpg"
                if os.path.exists(local_preview):
                    os.remove(local_preview)
                    
                logger.info(f"🧹 Cleaned up temporary local files for job: {job_uuid}")
            except Exception as clean_err:
                logger.warning(f"Failed cleaning temporary directories: {clean_err}")

# Instantiate singleton reconstruction pipeline service
reconstruction_service = ReconstructionService()
