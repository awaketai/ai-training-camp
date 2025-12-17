from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.schemas.ticket import Ticket, TicketCreate, TicketUpdate
from app.crud.ticket import (
    get_tickets,
    get_ticket,
    create_ticket,
    update_ticket,
    delete_ticket
)

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.get("/", response_model=List[Ticket])
def read_tickets(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by ticket status"),
    priority: Optional[str] = Query(None, description="Filter by ticket priority"),
    tag_id: Optional[int] = Query(None, description="Filter by tag ID"),
    db: Session = Depends(get_db)
):
    tickets = get_tickets(db, skip=skip, limit=limit, status=status, priority=priority, tag_id=tag_id)
    return tickets

@router.get("/{ticket_id}", response_model=Ticket)
def read_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = get_ticket(db, ticket_id)
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket

@router.post("/", response_model=Ticket, status_code=201)
def create_new_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    return create_ticket(db=db, ticket=ticket)

@router.put("/{ticket_id}", response_model=Ticket)
def update_existing_ticket(ticket_id: int, ticket: TicketUpdate, db: Session = Depends(get_db)):
    db_ticket = update_ticket(db=db, ticket_id=ticket_id, ticket=ticket)
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket

@router.delete("/{ticket_id}", response_model=Ticket)
def delete_existing_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = delete_ticket(db=db, ticket_id=ticket_id)
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket
