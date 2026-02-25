from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..models.appointment import Appointment, AppointmentCreate, AppointmentStatus
from ..core.database import get_db
from ..db.models import DBAppointment

router = APIRouter()

@router.post("/appointments", response_model=Appointment)
async def create_my_appointment(appointment: AppointmentCreate, visitor_id: int, db: Session = Depends(get_db)):
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
    
    new_appt = DBAppointment(
        visitor_id=visitor_id,
        host_name=appointment.host_name,
        purpose=appointment.purpose,
        appointment_type=appointment.appointment_type,
        scheduled_time=appointment.scheduled_time,
        duration_minutes=appointment.duration_minutes,
        status=AppointmentStatus.PENDING,
        created_at=datetime.utcnow()
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return new_appt

@router.get("/appointments", response_model=List[Appointment])
async def get_my_appointments(visitor_id: int, db: Session = Depends(get_db)):
    appts = db.query(DBAppointment).filter(DBAppointment.visitor_id == visitor_id).all()
    results = []
    for appt in appts:
        res = Appointment.from_orm(appt)
        if appt.visitor:
            res.visitor_name = appt.visitor.full_name
            res.visitor_phone = appt.visitor.phone_number
        results.append(res)
    return results

@router.get("/host-schedule", response_model=List[Appointment])
async def get_host_schedule(host_name: str, db: Session = Depends(get_db)):
    return db.query(DBAppointment).filter(
        DBAppointment.host_name == host_name,
        DBAppointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED])
    ).all()
