from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import random
import os
import base64
from typing import Dict, List

from ..models.user import User, UserCreate, Token, UserRole, OTPVerify, LoginRequest, LoginVerify, FaceLoginRequest, StaffLoginRequest, PasswordReset
from ..core.database import get_db
from ..db.models import DBUser, DBOTP
from ..core.security import (
    create_access_token, 
    verify_password,
    get_password_hash,
    VISITOR_SESSION_MINUTES, 
    EMPLOYEE_SESSION_HOURS, 
    SECURITY_SESSION_HOURS,
    ADMIN_SESSION_HOURS
)

router = APIRouter()

FACE_IMAGES_DIR = "storage/faces"
os.makedirs(FACE_IMAGES_DIR, exist_ok=True)

def get_session_duration(role: str) -> timedelta:
    if role == UserRole.VISITOR:
        return timedelta(minutes=VISITOR_SESSION_MINUTES)
    elif role == UserRole.EMPLOYEE:
        return timedelta(hours=EMPLOYEE_SESSION_HOURS)
    elif role == UserRole.SECURITY:
        return timedelta(hours=SECURITY_SESSION_HOURS)
    elif role == UserRole.ADMIN:
        return timedelta(hours=ADMIN_SESSION_HOURS)
    return timedelta(minutes=15)

@router.post("/send-otp")
async def send_otp(phone_number: str, db: Session = Depends(get_db)):
    otp = str(random.randint(1000, 9999))
    
    otp_entry = db.query(DBOTP).filter(DBOTP.phone_number == phone_number).first()
    if otp_entry:
        otp_entry.otp = otp
        otp_entry.created_at = datetime.utcnow()
    else:
        otp_entry = DBOTP(phone_number=phone_number, otp=otp)
        db.add(otp_entry)
    
    db.commit()
    print(f"DEBUG: OTP for {phone_number} is {otp}")
    return {"message": "OTP sent successfully (Check console for mock OTP)"}

@router.post("/signup", response_model=User)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.phone_number == user.phone_number).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    image_path = None
    if user.face_image:
        try:
            header, encoded = user.face_image.split(",", 1)
            image_data = base64.b64decode(encoded)
            image_filename = f"{user.phone_number}_{random.randint(1000, 9999)}.jpg"
            image_path = os.path.join(FACE_IMAGES_DIR, image_filename)
            with open(image_path, "wb") as f:
                f.write(image_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid face image data: {str(e)}")

    new_user = DBUser(
        full_name=user.full_name,
        phone_number=user.phone_number,
        email=user.email,
        address=user.address.dict(),
        role=UserRole.VISITOR,
        is_verified=False,
        face_image_path=image_path
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login/request", status_code=status.HTTP_200_OK)
async def login_request(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.phone_number == data.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not registered")
    
    otp = str(random.randint(1000, 9999))
    otp_entry = db.query(DBOTP).filter(DBOTP.phone_number == data.phone_number).first()
    if otp_entry:
        otp_entry.otp = otp
        otp_entry.created_at = datetime.utcnow()
    else:
        otp_entry = DBOTP(phone_number=data.phone_number, otp=otp)
        db.add(otp_entry)
        
    db.commit()
    print(f"DEBUG: Login OTP for {data.phone_number} is {otp}")
    return {"message": "OTP sent successfully"}

@router.post("/login/verify", response_model=Token)
async def login_verify(data: LoginVerify, db: Session = Depends(get_db)):
    otp_entry = db.query(DBOTP).filter(DBOTP.phone_number == data.phone_number, DBOTP.otp == data.otp).first()
    if otp_entry:
        user = db.query(DBUser).filter(DBUser.phone_number == data.phone_number).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        db.delete(otp_entry)
        db.commit()
        
        access_token_expires = get_session_duration(user.role)
        access_token = create_access_token(
            data={"sub": user.phone_number, "role": user.role},
            expires_delta=access_token_expires
        )
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user_id": user.id,
            "full_name": user.full_name,
            "role": user.role
        }
    
    raise HTTPException(status_code=400, detail="Invalid OTP")

@router.post("/login/staff", response_model=Token)
async def login_staff(data: StaffLoginRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == data.email).first()
    if not user or user.role not in [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SECURITY]:
        raise HTTPException(status_code=401, detail="Invalid credentials or unauthorized role")
    
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token_expires = get_session_duration(user.role)
    access_token = create_access_token(
        data={"sub": user.phone_number, "role": user.role},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "password_reset_required": user.password_reset_required,
        "user_id": user.id,
        "full_name": user.full_name,
        "role": user.role
    }

@router.post("/reset-password")
async def reset_password(data: PasswordReset, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = get_password_hash(data.new_password)
    user.password_reset_required = False
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/login/face", response_model=Token)
async def login_face(data: FaceLoginRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.phone_number == data.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not registered")
    
    if not user.face_image_path:
        raise HTTPException(status_code=400, detail="Face identity not enrolled. Please login with OTP and update your profile.")
    
    if not data.face_image:
        raise HTTPException(status_code=400, detail="Face image capture required")

    # In a production app, we would use a library like face_recognition 
    # to compare data.face_image with the image at user.face_image_path.
    # For now, we simulate a successful match if an image is sent.
    
    access_token_expires = get_session_duration(user.role)
    access_token = create_access_token(
        data={"sub": user.phone_number, "role": user.role},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.id,
        "full_name": user.full_name,
        "role": user.role
    }
