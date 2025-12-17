from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.tag import Tag

class TicketBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pending"
    priority: str = "medium"

class TicketCreate(TicketBase):
    tag_ids: Optional[List[int]] = []

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    tag_ids: Optional[List[int]] = None

class Ticket(TicketBase):
    id: int
    created_at: datetime
    updated_at: datetime
    tags: List[Tag] = []

    class Config:
        from_attributes = True
