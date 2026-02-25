from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..models.appointment import Appointment, AppointmentCreate, AppointmentStatus, AppointmentType
from ..core.database import get_db
from ..db.models import DBAppointment, DBUser
from ..models.user import UserRole
from pydantic import BaseModel
import base64
import os
import random

FACE_IMAGES_DIR = "storage/faces"
os.makedirs(FACE_IMAGES_DIR, exist_ok=True)

router = APIRouter()

class StatusUpdate(BaseModel):
    status: AppointmentStatus

class DurationUpdate(BaseModel):
    duration_minutes: int

@router.post("/book-for-visitor", response_model=Appointment)
async def employee_book_appointment(appointment: AppointmentCreate, employee_id: int, db: Session = Depends(get_db)):
    # Ensure naive comparison for safety with offset-aware inputs
    now = datetime.utcnow()
    scheduled_time = appointment.scheduled_time
    if scheduled_time.tzinfo is not None:
        scheduled_time = scheduled_time.astimezone(None).replace(tzinfo=None)
    
    if scheduled_time < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointments can only be booked for future dates"
        )
    
    visitor_id = appointment.visitor_id
    
    if not visitor_id and appointment.visitor_info:
        existing_visitor = db.query(DBUser).filter(DBUser.phone_number == appointment.visitor_info.phone_number).first()
        if existing_visitor:
            visitor_id = existing_visitor.id
        else:
            image_path = None
            if appointment.visitor_info.face_image:
                try:
                    header, encoded = appointment.visitor_info.face_image.split(",", 1)
                    image_data = base64.b64decode(encoded)
                    image_filename = f"visitor_{appointment.visitor_info.phone_number}_{random.randint(1000, 9999)}.jpg"
                    image_path = os.path.join(FACE_IMAGES_DIR, image_filename)
                    with open(image_path, "wb") as f:
                        f.write(image_data)
                except Exception as e:
                    print(f"Error saving visitor face image: {e}")

            new_visitor = DBUser(
                full_name=appointment.visitor_info.full_name,
                phone_number=appointment.visitor_info.phone_number,
                email=appointment.visitor_info.email,
                role=UserRole.VISITOR,
                is_verified=True, # Verified by staff
                address=appointment.visitor_info.address.dict(),
                face_image_path=image_path
            )
            db.add(new_visitor)
            db.commit()
            db.refresh(new_visitor)
            visitor_id = new_visitor.id
    
    if not visitor_id:
        raise HTTPException(status_code=400, detail="Visitor identification required")

    new_appt = DBAppointment(
        visitor_id=visitor_id,
        host_name=appointment.host_name,
        purpose=appointment.purpose,
        appointment_type=appointment.appointment_type,
        scheduled_time=appointment.scheduled_time,
        duration_minutes=appointment.duration_minutes,
        status=AppointmentStatus.ACCEPTED,
        created_at=datetime.utcnow()
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    
    # Populate visitor info for response
    visitor = db.query(DBUser).filter(DBUser.id == visitor_id).first()
    res = Appointment.from_orm(new_appt)
    if visitor:
        res.visitor_name = visitor.full_name
        res.visitor_phone = visitor.phone_number
    return res

@router.get("/my-schedule", response_model=List[Appointment])
async def get_employee_schedule(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(DBUser).filter(DBUser.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    appts = db.query(DBAppointment).filter(DBAppointment.host_name == employee.full_name).all()
    results = []
    for appt in appts:
        res = Appointment.from_orm(appt)
        if appt.visitor:
            res.visitor_name = appt.visitor.full_name
            res.visitor_phone = appt.visitor.phone_number
        results.append(res)
    return results

@router.patch("/appointments/{appointment_id}/status", response_model=Appointment)
async def update_appointment_status(appointment_id: int, update: StatusUpdate, employee_id: int, db: Session = Depends(get_db)):
    appt = db.query(DBAppointment).filter(DBAppointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appt.status = update.status
    db.commit()
    db.refresh(appt)
    return appt

@router.patch("/appointments/{appointment_id}/duration", response_model=Appointment)
async def update_appointment_duration(appointment_id: int, update: DurationUpdate, employee_id: int, db: Session = Depends(get_db)):
    appt = db.query(DBAppointment).filter(DBAppointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appt.duration_minutes = update.duration_minutes
    db.commit()
    db.refresh(appt)
    return appt

@router.post("/schedule/block", response_model=Appointment)
async def block_schedule(appointment: AppointmentCreate, employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(DBUser).filter(DBUser.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_appt = DBAppointment(
        visitor_id=None,
        host_name=employee.full_name,
        purpose=appointment.purpose or "Blocked Slot",
        appointment_type=AppointmentType.PRE_PLANNED,
        scheduled_time=appointment.scheduled_time,
        duration_minutes=appointment.duration_minutes or 60,
        status=AppointmentStatus.BLOCKED,
        created_at=datetime.utcnow()
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return new_appt

@router.post("/sync-calendar")
async def sync_employee_calendar(employee_id: int, calendar_url: Optional[str] = None, db: Session = Depends(get_db)):
    employee = db.query(DBUser).filter(DBUser.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.calendar_synced = True
    if calendar_url:
        employee.calendar_url = calendar_url
    
    db.commit()
    return {"message": "Calendar synced successfully", "calendar_synced": True}

@router.get("/visitor-list")
async def list_visitors(db: Session = Depends(get_db)):
    visitors = db.query(DBUser).filter(DBUser.role == UserRole.VISITOR).all()
    return [{"id": u.id, "full_name": u.full_name, "phone_number": u.phone_number} for u in visitors]
