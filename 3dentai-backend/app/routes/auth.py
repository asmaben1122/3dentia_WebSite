from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app.schemas.auth import (
    UserRegisterSchema, 
    UserLoginSchema, 
    UserResponseSchema, 
    TokenSchema,
    LogoutResponseSchema
)
from app.services.auth_service import auth_service
from app.auth.security import create_access_token, get_current_user_id
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register", 
    response_model=UserResponseSchema, 
    status_code=status.HTTP_201_CREATED,
    summary="Register a new clinic account"
)
async def register(payload: UserRegisterSchema):
    """Registers a new clinic/dentist account and creates a user profile inside PostgreSQL."""
    user = await auth_service.register(payload)
    return user

@router.post(
    "/login", 
    response_model=TokenSchema,
    summary="Authenticate user and obtain JWT token"
)
async def login(payload: UserLoginSchema):
    """Authenticates a user via JSON payload and yields a security JWT token."""
    auth_result = await auth_service.authenticate(payload)
    user = auth_result["user"]
    access_token = auth_result.get("access_token")
    
    if not access_token:
        # Generate access token locally for mock databases
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user["id"], 
            expires_delta=access_token_expires
        )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post(
    "/login/oauth2", 
    response_model=TokenSchema,
    include_in_schema=False  # Hidden, used internally by Swagger UI /Authorize button
)
async def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 password flow integration, allowing OpenAPI/Swagger to authorize properly."""
    login_payload = UserLoginSchema(email=form_data.username, password=form_data.password)
    auth_result = await auth_service.authenticate(login_payload)
    user = auth_result["user"]
    access_token = auth_result.get("access_token")
    
    if not access_token:
        access_token = create_access_token(subject=user["id"])
        
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post(
    "/logout", 
    response_model=LogoutResponseSchema,
    summary="Logout session"
)
async def logout(current_user_id: str = Depends(get_current_user_id)):
    """Logs out the active user session. Since JWT is stateless, we provide a confirmation 
    response. The React frontend should discard the token locally.
    """
    return {
        "success": True,
        "message": "User session closed successfully. Discard authorization token."
    }

@router.get(
    "/me", 
    response_model=UserResponseSchema,
    summary="Retrieve current user profile"
)
async def read_current_user(current_user_id: str = Depends(get_current_user_id)):
    """Decodes the JWT access token and yields full metadata of the active clinic/dentist."""
    user = await auth_service.get_by_id(current_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    return user
