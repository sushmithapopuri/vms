from pydantic import BaseModel, EmailStr, field_validator
from enum import Enum
from typing import Optional
import phonenumbers

class UserRole(str, Enum):
    ADMIN = "admin"
    VISITOR = "visitor"
    EMPLOYEE = "employee"
    SECURITY = "security"

class UserAddress(BaseModel):
    street: str
    city: str
    state: str
    pincode: str

    @field_validator('pincode')
    @classmethod
    def validate_pincode(cls, v):
        if not v.isdigit() or len(v) != 6:
            raise ValueError('Pincode must be exactly 6 digits')
        return v

class UserBase(BaseModel):
    full_name: str
    phone_number: str
    email: Optional[EmailStr] = None
    address: UserAddress
    role: UserRole = UserRole.VISITOR
    is_verified: bool = False

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        try:
            # Assumes Indian numbers (+91) if no country code provided, but better to enforce E.164
            parsed = phonenumbers.parse(v, "IN")
            if not phonenumbers.is_valid_number(parsed):
                raise ValueError('Invalid phone number')
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except Exception:
            raise ValueError('Invalid phone number format. Use E.164 format (e.g., +919876543210)')

class UserCreate(BaseModel):
    full_name: str
    phone_number: str
    email: Optional[EmailStr] = None
    address: UserAddress
    role: Optional[UserRole] = UserRole.VISITOR
    face_image: Optional[str] = None  # Base64 data from frontend

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    address: Optional[dict] = None
    face_image: Optional[str] = None

class User(UserBase):
    id: int
    is_verified: bool = False
    password_reset_required: bool = False
    face_image_path: Optional[str] = None
    calendar_synced: bool = False
    calendar_url: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    password_reset_required: bool = False
    user_id: Optional[int] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None

class LoginRequest(BaseModel):
    phone_number: str

class LoginVerify(BaseModel):
    phone_number: str
    otp: str

class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str

class PasswordReset(BaseModel):
    email: EmailStr
    new_password: str

class FaceLoginRequest(BaseModel):
    phone_number: str
    face_image: str  # Base64 data from frontend

class OTPVerify(BaseModel):
    phone_number: str
    otp: str
