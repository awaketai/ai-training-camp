from sqlalchemy import Column, Integer, ForeignKey
from app.db.session import Base

class TicketTag(Base):
    __tablename__ = "ticket_tags"

    ticket_id = Column(Integer, ForeignKey("tickets.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)
