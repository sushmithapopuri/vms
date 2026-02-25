from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.auth import router as auth_router
from .api.admin import router as admin_router
from .api.visitors import router as visitor_router
from .api.employees import router as employee_router
from .api.security import router as security_router
from .db import models
from .db.models import DBUser
from .core.database import SessionLocal, engine, Base
from .core.security import get_password_hash
from .models.user import UserRole

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Visitor Management System API",
    description="Backend for managing visitors in a facility",
    version="0.1.0"
)

@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(DBUser).filter(DBUser.role == UserRole.ADMIN).first()
        if not admin:
            admin_user = DBUser(
                full_name="System Admin",
                phone_number="+910000000000",
                email="admin@vms.com",
                hashed_password=get_password_hash("admin123"),
                address={"street": "Main St", "city": "HQ", "state": "TX", "pincode": "123456"},
                role=UserRole.ADMIN,
                is_verified=True,
                password_reset_required=False
            )
            db.add(admin_user)
            db.commit()
            print("Seeded initial admin user.")
    finally:
        db.close()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared Auth
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

# Role-based Routers
app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(visitor_router, prefix="/api/v1/visitors", tags=["visitors"])
app.include_router(employee_router, prefix="/api/v1/employees", tags=["employees"])
app.include_router(security_router, prefix="/api/v1/security", tags=["security"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Visitor Management System API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
