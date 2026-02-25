from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from typing import Optional, List

class AppointmentType(str, Enum):
    WALK_IN = "walk_in"
    PRE_PLANNED = "pre_planned"

class AppointmentStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"

class AppointmentBase(BaseModel):
    host_name: str
    purpose: str
    appointment_type: AppointmentType
    scheduled_time: datetime
    duration_minutes: int = 60 # Default 1 hour

from .user import UserAddress

class VisitorInfo(BaseModel):
    full_name: str
    phone_number: str
    email: Optional[str] = None
    address: UserAddress
    face_image: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    visitor_id: Optional[int] = None
    visitor_info: Optional[VisitorInfo] = None

class Appointment(AppointmentBase):
    id: int
    visitor_id: Optional[int] = None # Optional for BLOCKED slots
    visitor_name: Optional[str] = None
    visitor_phone: Optional[str] = None
    status: AppointmentStatus = AppointmentStatus.PENDING
    created_at: datetime = datetime.utcnow()

    class Config:
        from_attributes = True
