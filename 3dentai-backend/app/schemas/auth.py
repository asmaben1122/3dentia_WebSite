from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserRegisterSchema(BaseModel):
    email: EmailStr = Field(..., description="Unique email address for user registration")
    password: str = Field(..., min_length=6, description="User password (minimum 6 characters)")
    full_name: str = Field(..., description="Full legal name of the user/dentist")
    clinic_name: str = Field(..., description="Name of the registered dental clinic")

class UserLoginSchema(BaseModel):
    email: EmailStr = Field(..., description="Registered user email")
    password: str = Field(..., description="User password")

class UserResponseSchema(BaseModel):
    id: str = Field(..., description="Unique UUID representation of the user")
    email: EmailStr = Field(..., description="Registered email address")
    full_name: str = Field(..., description="Full name of the user")
    clinic_name: str = Field(..., description="Registered clinic name")
    created_at: datetime = Field(..., description="Account creation timestamp")

    class Config:
        from_attributes = True

class TokenSchema(BaseModel):
    access_token: str = Field(..., description="Encoded secure JWT access token")
    token_type: str = Field("bearer", description="Token authentication scheme")
    user: UserResponseSchema = Field(..., description="Authenticated user details")

class LogoutResponseSchema(BaseModel):
    success: bool = Field(True, description="Indicates if logout process completed successfully")
    message: str = Field("Session invalidated successfully", description="Status message")
