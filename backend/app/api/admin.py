from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import csv
import io
import os
import base64
import random
from fastapi.responses import StreamingResponse, FileResponse

from ..models.user import User, UserCreate, UserRole, UserUpdate
from ..models.appointment import Appointment
from ..core.database import get_db
from ..db.models import DBUser, DBAppointment
from ..core.security import get_password_hash

router = APIRouter()

FACE_IMAGES_DIR = "storage/faces"
os.makedirs(FACE_IMAGES_DIR, exist_ok=True)

@router.post("/create-user", response_model=User)
async def admin_create_user(user: UserCreate, admin_id: int, db: Session = Depends(get_db)): 
    admin = db.query(DBUser).filter(DBUser.id == admin_id).first()
    if not admin or admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create employees/security")

    existing = db.query(DBUser).filter(DBUser.phone_number == user.phone_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already registered")

    default_hashed = get_password_hash("admin123")

    image_path = None
    if user.face_image:
        try:
            header, encoded = user.face_image.split(",", 1)
            image_data = base64.b64decode(encoded)
            image_filename = f"staff_{user.phone_number}_{random.randint(1000, 9999)}.jpg"
            image_path = os.path.join(FACE_IMAGES_DIR, image_filename)
            with open(image_path, "wb") as f:
                f.write(image_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid face image data: {str(e)}")

    new_user = DBUser(
        full_name=user.full_name,
        phone_number=user.phone_number,
        email=user.email,
        hashed_password=default_hashed,
        address=user.address.dict(),
        role=user.role if user.role else UserRole.EMPLOYEE,
        is_verified=True,
        password_reset_required=True,
        face_image_path=image_path
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/appointments/all", response_model=List[Appointment])
async def get_all_appointments(db: Session = Depends(get_db)):
    appts = db.query(DBAppointment).all()
    results = []
    for appt in appts:
        res = Appointment.from_orm(appt)
        if appt.visitor:
            res.visitor_name = appt.visitor.full_name
            res.visitor_phone = appt.visitor.phone_number
        results.append(res)
    return results

@router.get("/users/employees")
async def list_employees(db: Session = Depends(get_db)):
    users = db.query(DBUser).filter(DBUser.role == UserRole.EMPLOYEE).all()
    return [{"id": u.id, "full_name": u.full_name, "phone_number": u.phone_number, "email": u.email} for u in users]

@router.get("/users/security")
async def list_security(db: Session = Depends(get_db)):
    users = db.query(DBUser).filter(DBUser.role == UserRole.SECURITY).all()
    return [{"id": u.id, "full_name": u.full_name, "phone_number": u.phone_number, "email": u.email} for u in users]

@router.get("/reports/stats")
async def get_system_stats(admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(DBUser).filter(DBUser.id == admin_id).first()
    if not admin or admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Unauthorized")

    total_visitors = db.query(DBUser).filter(DBUser.role == UserRole.VISITOR).count()
    total_employees = db.query(DBUser).filter(DBUser.role == UserRole.EMPLOYEE).count()
    pending_appts = db.query(DBAppointment).filter(DBAppointment.status == "pending").count()
    completed_appts = db.query(DBAppointment).filter(DBAppointment.status == "completed").count()

    return {
        "total_visitors": total_visitors,
        "total_employees": total_employees,
        "pending_appointments": pending_appts,
        "completed_appointments": completed_appts,
        "total_appointments": db.query(DBAppointment).count()
    }

@router.get("/reports/appointments/csv")
async def export_appointments_csv(admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(DBUser).filter(DBUser.id == admin_id).first()
    if not admin or admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Unauthorized")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Visitor ID", "Host Name", "Purpose", "Type", "Scheduled Time", "Duration (mins)", "Status", "Created At"])
    
    appts = db.query(DBAppointment).all()
    for appt in appts:
        writer.writerow([
            appt.id,
            appt.visitor_id,
            appt.host_name,
            appt.purpose,
            appt.appointment_type,
            appt.scheduled_time,
            appt.duration_minutes,
            appt.status,
            appt.created_at
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=appointments_report.csv"}
    )

@router.get("/users/all-staff")
async def list_all_staff(db: Session = Depends(get_db)):
    users = db.query(DBUser).filter(DBUser.role != UserRole.VISITOR).all()
    return [
        {
            "id": u.id, 
            "full_name": u.full_name, 
            "phone_number": u.phone_number, 
            "email": u.email,
            "role": u.role,
            "face_image_path": u.face_image_path
        }
        for u in users
    ]

@router.patch("/users/{user_id}", response_model=User)
async def update_user(user_id: int, update_data: UserUpdate, admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(DBUser).filter(DBUser.id == admin_id).first()
    if not admin or admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if key == "address":
            if user.address:
                new_address = dict(user.address)
                new_address.update(value)
                user.address = new_address
            else:
                user.address = value
        elif key == "face_image":
            try:
                header, encoded = value.split(",", 1)
                image_data = base64.b64decode(encoded)
                image_filename = f"staff_{user.phone_number}_{random.randint(1000, 9999)}.jpg"
                image_path = os.path.join(FACE_IMAGES_DIR, image_filename)
                with open(image_path, "wb") as f:
                    f.write(image_data)
                user.face_image_path = image_path
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid face image data: {str(e)}")
        else:
            setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user

@router.get("/proxy-image")
async def proxy_image(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)
