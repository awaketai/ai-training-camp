from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from ..models import GenerateStyleRequest, GenerateStyleResponse, SelectStyleRequest, SelectStyleResponse
from ..services.style_service import StyleService
from ..repositories.image_repo import ImageRepository
from ..dependencies import get_style_service
from ..config import settings


router = APIRouter(prefix="/api/slides", tags=["style"])

# Create image repository for file serving
_image_repo = ImageRepository(base_dir=settings.slides_dir)


@router.get("/{sid}/style")
async def get_style_image(sid: str):
    """Get the style image for a project."""
    style_path = _image_repo.get_style_image_path(sid)

    if not style_path.exists():
        raise HTTPException(status_code=404, detail="Style image not found")

    return FileResponse(style_path, media_type="image/jpeg")


@router.post("/{sid}/style/generate", response_model=GenerateStyleResponse)
async def generate_style_options(
    sid: str,
    request: GenerateStyleRequest,
    style_service: StyleService = Depends(get_style_service)
):
    """Generate style options based on description."""
    try:
        print(f"[DEBUG] Generating style for sid={sid}, description={request.description}")
        images = await style_service.generate_style_options(sid, request.description)
        print(f"[DEBUG] Generated {len(images)} images")
        return GenerateStyleResponse(images=images)
    except ValueError as e:
        print(f"[ERROR] ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        print(f"[ERROR] FileNotFoundError: {e}")
        raise HTTPException(status_code=404, detail=f"Project {sid} not found")
    except Exception as e:
        print(f"[ERROR] Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sid}/style/select", response_model=SelectStyleResponse)
async def select_style(
    sid: str,
    request: SelectStyleRequest,
    style_service: StyleService = Depends(get_style_service)
):
    """Select a style image from the generated options."""
    try:
        style_image = await style_service.select_style(sid, request.image_index)
        return SelectStyleResponse(success=True, style_image=style_image)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {sid} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
