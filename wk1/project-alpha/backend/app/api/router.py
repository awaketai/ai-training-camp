from fastapi import APIRouter
from app.api.endpoints import tickets, tags

api_router = APIRouter(prefix="/api")

api_router.include_router(tickets.router)
api_router.include_router(tags.router)
