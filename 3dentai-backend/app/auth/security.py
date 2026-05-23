from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings

# Initialize hashing utility using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Flow token location in FastAPI Swagger UI
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_STR}/auth/login"
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against its hashed variant."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generates a secure salt and hash representation of a password."""
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Generates an encoded HS256 JWT access token for authentication."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {
        "exp": expire, 
        "sub": str(subject),
        "type": "access_token"
    }
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    """Decodes a JWT access token and extracts the subject (user_id)."""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        # Check token expiration and return subject
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """FastAPI route dependency ensuring a valid JWT exists in the request headers.
    Supports stateful Supabase verification first, and falls back to stateless local decoding.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Stateful Supabase Token Verification (if Supabase client is active)
    try:
        from app.database.connection import get_supabase
        supabase_client = get_supabase()
        if supabase_client is not None:
            # Validate JWT statefully against Supabase auth server
            user_response = supabase_client.auth.get_user(jwt=token)
            if user_response and hasattr(user_response, "user") and user_response.user:
                return str(user_response.user.id)
    except Exception:
        # Fall back to local stateless decoding if live check fails
        pass

    # 2. Stateless Local Fallback / Mock check
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_exception
        
    return user_id
