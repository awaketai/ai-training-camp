from sqlalchemy.orm import Session
from app.models.ticket import Ticket
from app.models.tag import Tag
from app.schemas.ticket import TicketCreate, TicketUpdate
from typing import List, Optional

def get_ticket(db: Session, ticket_id: int):
    return db.query(Ticket).filter(Ticket.id == ticket_id).first()

def get_tickets(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None, priority: Optional[str] = None, tag_id: Optional[int] = None):
    query = db.query(Ticket)
    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if tag_id:
        query = query.join(Ticket.tags).filter(Tag.id == tag_id)
    return query.offset(skip).limit(limit).all()

def create_ticket(db: Session, ticket: TicketCreate):
    db_ticket = Ticket(
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    
    if ticket.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(ticket.tag_ids)).all()
        db_ticket.tags = tags
        db.commit()
        db.refresh(db_ticket)
    
    return db_ticket

def update_ticket(db: Session, ticket_id: int, ticket: TicketUpdate):
    db_ticket = get_ticket(db, ticket_id)
    if not db_ticket:
        return None
    
    update_data = ticket.model_dump(exclude_unset=True)
    
    if 'tag_ids' in update_data:
        tag_ids = update_data.pop('tag_ids')
        tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
        db_ticket.tags = tags
    
    for field, value in update_data.items():
        setattr(db_ticket, field, value)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def delete_ticket(db: Session, ticket_id: int):
    db_ticket = get_ticket(db, ticket_id)
    if db_ticket:
        db.delete(db_ticket)
        db.commit()
    return db_ticket
