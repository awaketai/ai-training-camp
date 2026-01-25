from pydantic import BaseModel
from typing import Optional


class SlideItem(BaseModel):
    index: int
    text: str
    images: list[str]
    current_image: Optional[str]
    has_matching_image: bool


class UpdateSlideTextRequest(BaseModel):
    text: str


class ReorderSlidesRequest(BaseModel):
    order: list[int]


class GenerateStyleRequest(BaseModel):
    description: str


class SelectStyleRequest(BaseModel):
    image_index: int


class AddSlideRequest(BaseModel):
    text: str = ""


class SlidesResponse(BaseModel):
    sid: str
    style_image: Optional[str]
    slides: list[SlideItem]


class UpdateSlideResponse(BaseModel):
    success: bool
    has_image: bool


class ReorderResponse(BaseModel):
    success: bool


class GenerateImageResponse(BaseModel):
    task_id: str


class ImageStatusResponse(BaseModel):
    generating: bool
    latest_hash: Optional[str]


class GenerateStyleResponse(BaseModel):
    images: list[str]


class SelectStyleResponse(BaseModel):
    success: bool
    style_image: str


class AddSlideResponse(BaseModel):
    success: bool
    slide: SlideItem
