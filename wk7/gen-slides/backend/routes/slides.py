from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from ..models import (
    SlidesResponse,
    UpdateSlideTextRequest,
    UpdateSlideResponse,
    ReorderSlidesRequest,
    ReorderResponse,
    AddSlideRequest,
    AddSlideResponse,
    SlideItem,
)
from ..services.slide_service import SlideService
from ..dependencies import get_slide_service


router = APIRouter(prefix="/api/slides", tags=["slides"])


@router.get("/{sid}", response_model=SlidesResponse)
async def get_slides(
    sid: str,
    slide_service: SlideService = Depends(get_slide_service)
):
    """Get all slides for a project."""
    try:
        style_image, slides = await slide_service.get_slides(sid)
        return SlidesResponse(
            sid=sid,
            style_image=style_image,
            slides=slides
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {sid} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{sid}/{slide_index}", response_model=UpdateSlideResponse)
async def update_slide_text(
    sid: str,
    slide_index: int,
    request: UpdateSlideTextRequest,
    slide_service: SlideService = Depends(get_slide_service)
):
    """Update the text of a slide."""
    try:
        result = await slide_service.update_slide_text(sid, slide_index, request.text)
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {sid} not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{sid}/reorder", response_model=ReorderResponse)
async def reorder_slides(
    sid: str,
    request: ReorderSlidesRequest,
    slide_service: SlideService = Depends(get_slide_service)
):
    """Reorder slides."""
    try:
        success = await slide_service.reorder_slides(sid, request.order)
        return ReorderResponse(success=success)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {sid} not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sid}/add", response_model=AddSlideResponse)
async def add_slide(
    sid: str,
    request: AddSlideRequest,
    slide_service: SlideService = Depends(get_slide_service)
):
    """Add a new slide at the specified position or at the end."""
    try:
        slide = await slide_service.add_slide(sid, request.text, request.position)
        return AddSlideResponse(success=True, slide=slide)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {sid} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
