from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..models.appointment import Appointment, AppointmentStatus
from ..core.database import get_db
from ..db.models import DBAppointment, DBUser

router = APIRouter()

@router.get("/daily-appointments", response_model=List[Appointment])
async def get_daily_appointments(db: Session = Depends(get_db)):
    appts = db.query(DBAppointment).filter(DBAppointment.status.in_([AppointmentStatus.ACCEPTED, AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED])).all()
    results = []
    for appt in appts:
        res = Appointment.from_orm(appt)
        if appt.visitor:
            res.visitor_name = appt.visitor.full_name
            res.visitor_phone = appt.visitor.phone_number
        results.append(res)
    return results

@router.get("/recent-activity", response_model=List[Appointment])
async def get_recent_activity(db: Session = Depends(get_db)):
    appts = db.query(DBAppointment).filter(
        DBAppointment.status.in_([AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED, AppointmentStatus.REJECTED])
    ).order_by(DBAppointment.id.desc()).limit(10).all()
    
    results = []
    for appt in appts:
        res = Appointment.from_orm(appt)
        if appt.visitor:
            res.visitor_name = appt.visitor.full_name
            res.visitor_phone = appt.visitor.phone_number
        results.append(res)
    return results

@router.post("/check-in/{appointment_id}")
async def security_check_in(appointment_id: int, db: Session = Depends(get_db)):
    appt = db.query(DBAppointment).filter(DBAppointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appt.status != AppointmentStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Appointment must be accepted before check-in")
    
    appt.status = AppointmentStatus.CHECKED_IN
    appt.check_in_time = datetime.utcnow()
    db.commit()
    return {"message": "Visitor checked in successfully"}

@router.post("/check-out/{appointment_id}")
async def security_check_out(appointment_id: int, db: Session = Depends(get_db)):
    appt = db.query(DBAppointment).filter(DBAppointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appt.status != AppointmentStatus.CHECKED_IN:
        raise HTTPException(status_code=400, detail="Visitor is not checked in")
    
    appt.status = AppointmentStatus.COMPLETED
    appt.check_out_time = datetime.utcnow()
    db.commit()
    return {"message": "Visitor checked out successfully"}

@router.get("/visitor-profile/{phone_number}")
async def get_visitor_profile(phone_number: str, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.phone_number == phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Visitor not found")
    
    history = db.query(DBAppointment).filter(DBAppointment.visitor_id == user.id).all()
    history_res = []
    for appt in history:
        res = Appointment.from_orm(appt)
        res.visitor_name = user.full_name
        res.visitor_phone = user.phone_number
        history_res.append(res)
    
    return {
        "profile": {
            "full_name": user.full_name,
            "phone_number": user.phone_number,
            "email": user.email,
            "is_verified": user.is_verified,
            "address": user.address,
            "role": user.role
        },
        "appointment_history": history_res
    }

@router.post("/verify-identity")
async def verify_visitor_identity(phone_number: str, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.phone_number == phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Visitor not found in system")
    
    return {
        "full_name": user.full_name,
        "is_verified": user.is_verified,
        "has_face_id": user.face_image_path is not None
    }
