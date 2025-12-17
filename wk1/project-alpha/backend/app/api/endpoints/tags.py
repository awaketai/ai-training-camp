from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.tag import Tag, TagCreate, TagUpdate
from app.crud.tag import (
    get_tags,
    get_tag,
    create_tag,
    update_tag,
    delete_tag,
    get_tag_by_name
)

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("/", response_model=List[Tag])
def read_tags(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tags = get_tags(db, skip=skip, limit=limit)
    return tags

@router.get("/{tag_id}", response_model=Tag)
def read_tag(tag_id: int, db: Session = Depends(get_db)):
    db_tag = get_tag(db, tag_id)
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return db_tag

@router.post("/", response_model=Tag, status_code=201)
def create_new_tag(tag: TagCreate, db: Session = Depends(get_db)):
    db_tag = get_tag_by_name(db, name=tag.name)
    if db_tag:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")
    return create_tag(db=db, tag=tag)

@router.put("/{tag_id}", response_model=Tag)
def update_existing_tag(tag_id: int, tag: TagUpdate, db: Session = Depends(get_db)):
    db_tag = update_tag(db=db, tag_id=tag_id, tag=tag)
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return db_tag

@router.delete("/{tag_id}", response_model=Tag)
def delete_existing_tag(tag_id: int, db: Session = Depends(get_db)):
    db_tag = delete_tag(db=db, tag_id=tag_id)
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return db_tag
