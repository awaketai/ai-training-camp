from .repositories.outline_repo import OutlineRepository
from .repositories.image_repo import ImageRepository
from .services.slide_service import SlideService
from .services.image_gen_service import ImageGenService
from .services.style_service import StyleService
from .config import settings


# Singleton instances
_outline_repo = OutlineRepository(base_dir=settings.slides_dir)
_image_repo = ImageRepository(base_dir=settings.slides_dir)
_slide_service = SlideService(outline_repo=_outline_repo, image_repo=_image_repo)
_image_gen_service = ImageGenService(outline_repo=_outline_repo, image_repo=_image_repo)
_style_service = StyleService(outline_repo=_outline_repo, image_repo=_image_repo)


def get_slide_service() -> SlideService:
    """Dependency injection for SlideService."""
    return _slide_service


def get_image_gen_service() -> ImageGenService:
    """Dependency injection for ImageGenService."""
    return _image_gen_service


def get_style_service() -> StyleService:
    """Dependency injection for StyleService."""
    return _style_service
