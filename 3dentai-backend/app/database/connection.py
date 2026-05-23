from supabase import create_client, Client
from app.config import settings
from app.utils.logger import logger

_supabase_client: Client = None
_supabase_admin_client: Client = None


def get_supabase() -> Client:
    """Returns a singleton anon client for Supabase database & storage actions."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = settings.NEXT_PUBLIC_SUPABASE_URL
    key = settings.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if "placeholder" in url or "placeholder" in key:
        logger.warning(
            "⚠️ Using placeholder Supabase credentials. "
            "Database operations will use mock fallback until real credentials are set."
        )
        return None

    try:
        _supabase_client = create_client(url, key)
        logger.info("Successfully initialized Supabase client.")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase client: {e}")
        if settings.ENVIRONMENT == "production":
            raise e

    return _supabase_client


def get_supabase_admin() -> Client:
    """Returns a singleton service-role client for admin operations (user creation, bypasses RLS)."""
    global _supabase_admin_client
    if _supabase_admin_client is not None:
        return _supabase_admin_client

    url = settings.NEXT_PUBLIC_SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY

    if "placeholder" in url or "placeholder" in key:
        logger.warning("⚠️ Using placeholder service role credentials. Admin operations unavailable.")
        return None

    try:
        _supabase_admin_client = create_client(url, key)
        logger.info("Successfully initialized Supabase admin client.")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase admin client: {e}")
        if settings.ENVIRONMENT == "production":
            raise e

    return _supabase_admin_client


# Eagerly initialize at import time so startup errors surface immediately
supabase: Client = get_supabase()
