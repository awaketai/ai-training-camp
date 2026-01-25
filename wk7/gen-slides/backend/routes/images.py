from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from ..models import GenerateImageResponse, ImageStatusResponse
from ..services.image_gen_service import ImageGenService
from ..repositories.image_repo import ImageRepository
from ..dependencies import get_image_gen_service
from ..config import settings


router = APIRouter(prefix="/api/slides", tags=["images"])

# Create image repository for file serving
_image_repo = ImageRepository(base_dir=settings.slides_dir)


@router.get("/{sid}/images/{hash}.jpg")
async def get_image(sid: str, hash: str):
    """Get an image file."""
    image_path = _image_repo.get_image_path(sid, hash)

    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image {hash} not found")

    return FileResponse(image_path, media_type="image/jpeg")


@router.post("/{sid}/{slide_index}/generate", response_model=GenerateImageResponse)
async def generate_image(
    sid: str,
    slide_index: int,
    image_gen_service: ImageGenService = Depends(get_image_gen_service)
):
    """Generate an image for a slide."""
    try:
        task_id = await image_gen_service.generate_slide_image(sid, slide_index)
        return GenerateImageResponse(task_id=task_id)
    except ValueError as e:
        if "already in progress" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {sid} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sid}/{slide_index}/status", response_model=ImageStatusResponse)
async def get_generation_status(
    sid: str,
    slide_index: int,
    image_gen_service: ImageGenService = Depends(get_image_gen_service)
):
    """Get the generation status for a slide."""
    try:
        status = await image_gen_service.get_generation_status(sid, slide_index)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
