import sqlite3
import os
from app.core.database import engine, Base, DB_PATH
from app.db.models import DBUser
from app.core.security import get_password_hash
from app.models.user import UserRole
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, inspect

def migrate():
    print(f"Target Database: {DB_PATH}")
    
    # 1. Create tables if they don't exist
    print("Creating tables (if missing)...")
    Base.metadata.create_all(bind=engine)
    
    # 2. Handle Schema Updates (SQLite doesn't support migrations in create_all)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    
    updates = [
        ("calendar_synced", "BOOLEAN DEFAULT 0"),
        ("calendar_url", "TEXT")
    ]
    
    for col_name, col_type in updates:
        if col_name not in columns:
            print(f"Migration: Adding column '{col_name}' to 'users' table...")
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
        else:
            print(f"Skipping: Column '{col_name}' already exists.")
            
    conn.commit()
    conn.close()
    
    # 3. Seed Initial Data
    print("Checking seed data...")
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        admin = db.query(DBUser).filter(DBUser.role == UserRole.ADMIN).first()
        if not admin:
            print("Seeding: Initial Admin User...")
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
            print("Seeding Complete.")
        else:
            print("Skipping Seed: Admin already exists.")
    finally:
        db.close()

    print("Migration and Initialization completed successfully.")

if __name__ == "__main__":
    migrate()
