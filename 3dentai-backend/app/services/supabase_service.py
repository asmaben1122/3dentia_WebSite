import os
import mimetypes
from typing import Union, BinaryIO
from app.database.connection import get_supabase
from app.config import settings
from app.utils.logger import logger

class SupabaseStorageService:
    """Service class for interfacing with Supabase Object Storage.
    Supports uploading panoramic images, STL meshes, voxel files, and creating access URLs.
    """

    def __init__(self):
        self.client = get_supabase()

    def upload_file(
        self, 
        bucket_name: str, 
        file_name: str, 
        file_data: Union[bytes, BinaryIO], 
        content_type: str = None
    ) -> str:
        """Uploads a file to a designated Supabase storage bucket.
        Returns the public URL of the uploaded asset.
        """
        try:
            if not self.client:
                logger.warning(f"Supabase client not active. Mocking upload of {file_name} to {bucket_name}.")
                return f"https://mock-supabase-storage.local/{bucket_name}/{file_name}"

            # Auto-detect content type if not provided
            if not content_type:
                content_type, _ = mimetypes.guess_type(file_name)
                if not content_type:
                    content_type = "application/octet-stream"

            # Execute Supabase upload
            # Note: storage.from_().upload takes file path, bytes, or file-like object.
            # We enforce overwrite/upsert to prevent duplicate conflicts.
            res = self.client.storage.from_(bucket_name).upload(
                path=file_name,
                file=file_data,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            
            logger.info(f"Successfully uploaded file to Supabase storage: {bucket_name}/{file_name}")
            
            # Construct and return public URL
            return self.get_public_url(bucket_name, file_name)

        except Exception as e:
            logger.error(f"Failed uploading file {file_name} to bucket {bucket_name}: {e}")
            # In local sandbox, we can fall back to a mock URL to prevent absolute blocking
            fallback_url = f"{settings.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_name}"
            logger.warning(f"Returning fallback storage public URL: {fallback_url}")
            return fallback_url

    def get_public_url(self, bucket_name: str, file_name: str) -> str:
        """Retrieves the public URL for a storage asset."""
        try:
            if not self.client:
                return f"https://mock-supabase-storage.local/{bucket_name}/{file_name}"
            
            # Retrieve public URL from Supabase Storage client
            res = self.client.storage.from_(bucket_name).get_public_url(file_name)
            return res
        except Exception as e:
            logger.error(f"Error fetching public URL for {bucket_name}/{file_name}: {e}")
            return f"{settings.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_name}"

    def delete_file(self, bucket_name: str, file_name: str) -> bool:
        """Deletes an asset from a designated storage bucket."""
        try:
            if not self.client:
                logger.info(f"Mock delete of {file_name} from {bucket_name}")
                return True
                
            self.client.storage.from_(bucket_name).remove([file_name])
            logger.info(f"Successfully deleted {file_name} from bucket {bucket_name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting file {file_name} from bucket {bucket_name}: {e}")
            return False

# Export instantiated storage service
supabase_storage = SupabaseStorageService()
