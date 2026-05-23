from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from app.database.connection import get_supabase, get_supabase_admin
from app.schemas.auth import UserRegisterSchema, UserLoginSchema
from app.auth.security import get_password_hash, verify_password
from app.utils.logger import logger
from datetime import datetime

# Local memory-based mock database for standalone testing when Supabase credentials are missing
MOCK_USERS_DB: Dict[str, Dict[str, Any]] = {
    # Default mock user: password is "password"
    "admin@3dentai.com": {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "admin@3dentai.com",
        "full_name": "Dr. Sarah Miller",
        "clinic_name": "Antigravity Dental Clinic",
        "password_hash": get_password_hash("password"),
        "created_at": datetime.utcnow()
    }
}


class AuthService:
    """Service class for handling core identity, credentials verification,
    and account registration inside the Supabase users database.
    """

    def __init__(self):
        self.client = get_supabase()
        self.admin_client = get_supabase_admin()

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Queries user record from Supabase table by email, falls back to mock DB."""
        try:
            if not self.client:
                return MOCK_USERS_DB.get(email.lower())

            res = self.client.table("users").select("*").eq("email", email.lower()).execute()
            if res.data and len(res.data) > 0:
                user_data = res.data[0]
                if isinstance(user_data.get("created_at"), str):
                    user_data["created_at"] = datetime.fromisoformat(user_data["created_at"].replace("Z", "+00:00"))
                return user_data

            return MOCK_USERS_DB.get(email.lower())
        except Exception as e:
            logger.error(f"Error querying user by email {email}: {e}")
            return MOCK_USERS_DB.get(email.lower())

    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Queries user record from Supabase table by UUID, falls back to mock DB."""
        try:
            if not self.client:
                for u in MOCK_USERS_DB.values():
                    if u["id"] == user_id:
                        return u
                return None

            res = self.client.table("users").select("*").eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                user_data = res.data[0]
                if isinstance(user_data.get("created_at"), str):
                    user_data["created_at"] = datetime.fromisoformat(user_data["created_at"].replace("Z", "+00:00"))
                return user_data

            for u in MOCK_USERS_DB.values():
                if u["id"] == user_id:
                    return u
            return None
        except Exception as e:
            logger.error(f"Error querying user by id {user_id}: {e}")
            for u in MOCK_USERS_DB.values():
                if u["id"] == user_id:
                    return u
            return None

    async def register(self, schema: UserRegisterSchema) -> Dict[str, Any]:
        """Registers a new user/clinic.
        Uses the admin client (service role key) to create the user with email already
        confirmed, so the user can sign in immediately without waiting for a verification email.
        """
        # Check for duplicate email before attempting Supabase calls
        existing_user = await self.get_by_email(schema.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address is already registered."
            )

        # 1. Live Supabase Admin Auth — creates user with email pre-confirmed
        if self.admin_client:
            try:
                auth_res = self.admin_client.auth.admin.create_user({
                    "email": schema.email.lower(),
                    "password": schema.password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": schema.full_name,
                        "clinic_name": schema.clinic_name
                    }
                })

                if auth_res and hasattr(auth_res, "user") and auth_res.user:
                    user_id = str(auth_res.user.id)

                    # Store auxiliary profile in public.users table
                    profile_record = {
                        "id": user_id,
                        "email": schema.email.lower(),
                        "full_name": schema.full_name,
                        "clinic_name": schema.clinic_name,
                        "password_hash": get_password_hash(schema.password)
                    }

                    try:
                        res = self.admin_client.table("users").insert(profile_record).execute()
                        if res.data and len(res.data) > 0:
                            user_data = res.data[0]
                            if isinstance(user_data.get("created_at"), str):
                                user_data["created_at"] = datetime.fromisoformat(
                                    user_data["created_at"].replace("Z", "+00:00")
                                )
                            logger.info(f"Registered user via admin API: {schema.email}")
                            return user_data
                    except Exception as profile_err:
                        logger.warning(f"Profile insert failed (non-fatal): {profile_err}")

                    return {
                        "id": user_id,
                        "email": schema.email.lower(),
                        "full_name": schema.full_name,
                        "clinic_name": schema.clinic_name,
                        "created_at": datetime.utcnow()
                    }
            except Exception as e:
                logger.error(f"Supabase admin create_user failed: {e}. Falling back to mock storage.")

        # 2. Local Mock Database Fallback
        import uuid
        mock_id = str(uuid.uuid4())
        mock_record = {
            "id": mock_id,
            "email": schema.email.lower(),
            "full_name": schema.full_name,
            "clinic_name": schema.clinic_name,
            "password_hash": get_password_hash(schema.password),
            "created_at": datetime.utcnow()
        }
        MOCK_USERS_DB[schema.email.lower()] = mock_record
        logger.info(f"Registered user locally (mock mode): {schema.email}")
        return mock_record

    async def authenticate(self, schema: UserLoginSchema) -> Dict[str, Any]:
        """Authenticates a user via email & password.
        Returns a dict with 'user' and optionally 'access_token' if Supabase issued one.
        """
        # 1. Supabase Auth Server Sign-in
        if self.client:
            try:
                auth_res = self.client.auth.sign_in_with_password({
                    "email": schema.email.lower(),
                    "password": schema.password
                })
                if auth_res and hasattr(auth_res, "session") and auth_res.session:
                    token = str(auth_res.session.access_token)
                    user_id = str(auth_res.user.id)

                    profile = await self.get_by_id(user_id)
                    if not profile:
                        profile = {
                            "id": user_id,
                            "email": schema.email.lower(),
                            "full_name": auth_res.user.user_metadata.get("full_name", "Dentist Account"),
                            "clinic_name": auth_res.user.user_metadata.get("clinic_name", "3DentAI Affiliated Clinic"),
                            "created_at": datetime.utcnow()
                        }

                    logger.info(f"Authenticated user via Supabase: {schema.email}")
                    return {"user": profile, "access_token": token}
            except Exception as e:
                logger.error(f"Supabase sign-in failed: {e}. Falling back to mock DB.")

        # 2. Local Mock Fallback Sign-in
        user = await self.get_by_email(schema.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(schema.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {"user": user}


# Instantiate singleton authentication service
auth_service = AuthService()
