from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class VisitorBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    purpose: str
    host_name: str

class VisitorCreate(VisitorBase):
    pass

class Visitor(VisitorBase):
    id: int
    check_in_time: datetime
    check_out_time: Optional[datetime] = None

    class Config:
        from_attributes = True
