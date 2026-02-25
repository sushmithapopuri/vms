from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt

# Session durations as requested
VISITOR_SESSION_MINUTES = 5
EMPLOYEE_SESSION_HOURS = 8
SECURITY_SESSION_HOURS = 8
ADMIN_SESSION_HOURS = 8

# In a real app, these should be in environment variables
SECRET_KEY = "super-secret-key-change-me"
ALGORITHM = "HS256"

import hashlib
import bcrypt

def get_password_hash(password: str):
    # Pre-hash with SHA-256 to avoid bcrypt length limits
    sha256_hash = hashlib.sha256(password.encode()).hexdigest().encode()
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(sha256_hash, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str):
    sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest().encode()
    return bcrypt.checkpw(sha256_hash, hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
