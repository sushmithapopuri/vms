from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base
from ..models.user import UserRole
from ..models.appointment import AppointmentStatus, AppointmentType

class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    phone_number = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    address = Column(JSON)
    role = Column(String, default=UserRole.VISITOR)
    is_verified = Column(Boolean, default=False)
    password_reset_required = Column(Boolean, default=False)
    face_image_path = Column(String, nullable=True)
    calendar_synced = Column(Boolean, default=False)
    calendar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    appointments = relationship("DBAppointment", back_populates="visitor", foreign_keys="DBAppointment.visitor_id")

class DBAppointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    host_name = Column(String)
    purpose = Column(String)
    appointment_type = Column(String, default=AppointmentType.PRE_PLANNED)
    status = Column(String, default=AppointmentStatus.PENDING)
    scheduled_time = Column(DateTime)
    duration_minutes = Column(Integer, default=60)
    created_at = Column(DateTime, default=datetime.utcnow)
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)

    visitor = relationship("DBUser", back_populates="appointments", foreign_keys=[visitor_id])

class DBOTP(Base):
    __tablename__ = "otps"
    phone_number = Column(String, primary_key=True)
    otp = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
