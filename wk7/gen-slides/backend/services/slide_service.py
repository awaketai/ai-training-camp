from typing import Optional
from ..repositories.outline_repo import OutlineRepository
from ..repositories.image_repo import ImageRepository
from ..utils.hash import compute_text_hash
from ..models.schemas import SlideItem, UpdateSlideResponse


class SlideService:
    """Service for managing slides."""

    def __init__(self, outline_repo: OutlineRepository, image_repo: ImageRepository):
        self.outline_repo = outline_repo
        self.image_repo = image_repo

    async def get_slides(self, sid: str) -> tuple[Optional[str], list[SlideItem]]:
        """Get all slides for a project."""
        outline = await self.outline_repo.get_outline(sid)

        style_image = outline.get("style_image")
        slides_data = outline.get("slides", [])

        slides = []
        for idx, slide_data in enumerate(slides_data):
            text = slide_data.get("text", "")
            current_image = slide_data.get("current_image")

            # Compute hash and check if matching image exists
            text_hash = compute_text_hash(text) if text else None
            has_matching_image = False
            if text_hash:
                has_matching_image = await self.image_repo.image_exists(sid, text_hash)

            # Get list of available images
            available_images = await self.image_repo.list_images(sid)

            slides.append(SlideItem(
                index=idx,
                text=text,
                images=available_images,
                current_image=current_image,
                has_matching_image=has_matching_image
            ))

        return style_image, slides

    async def update_slide_text(self, sid: str, slide_index: int, text: str) -> UpdateSlideResponse:
        """Update the text of a slide."""
        outline = await self.outline_repo.get_outline(sid)
        slides = outline.get("slides", [])

        if slide_index < 0 or slide_index >= len(slides):
            raise ValueError(f"Slide index {slide_index} out of range")

        # Update the text
        slides[slide_index]["text"] = text

        # Compute hash and check if matching image exists
        text_hash = compute_text_hash(text) if text else None
        has_image = False
        if text_hash:
            has_image = await self.image_repo.image_exists(sid, text_hash)
            if has_image:
                slides[slide_index]["current_image"] = text_hash
            else:
                slides[slide_index]["current_image"] = None
        else:
            slides[slide_index]["current_image"] = None

        # Save the updated outline
        await self.outline_repo.save_outline(sid, outline)

        return UpdateSlideResponse(success=True, has_image=has_image)

    async def reorder_slides(self, sid: str, order: list[int]) -> bool:
        """Reorder slides according to the provided order."""
        outline = await self.outline_repo.get_outline(sid)
        slides = outline.get("slides", [])

        # Validate order list
        if len(order) != len(slides):
            raise ValueError(f"Order list length {len(order)} does not match slides count {len(slides)}")

        if set(order) != set(range(len(slides))):
            raise ValueError("Order list must contain all slide indices exactly once")

        # Reorder slides
        new_slides = [slides[i] for i in order]
        outline["slides"] = new_slides

        # Save the updated outline
        await self.outline_repo.save_outline(sid, outline)

        return True

    async def add_slide(self, sid: str, text: str = "") -> SlideItem:
        """Add a new slide to the project."""
        outline = await self.outline_repo.get_outline(sid)
        slides = outline.get("slides", [])

        # Create new slide
        new_slide = {
            "text": text,
            "current_image": None
        }
        slides.append(new_slide)

        # Save the updated outline
        await self.outline_repo.save_outline(sid, outline)

        # Compute hash and check if matching image exists
        text_hash = compute_text_hash(text) if text else None
        has_matching_image = False
        if text_hash:
            has_matching_image = await self.image_repo.image_exists(sid, text_hash)

        # Get list of available images
        available_images = await self.image_repo.list_images(sid)

        return SlideItem(
            index=len(slides) - 1,
            text=text,
            images=available_images,
            current_image=None,
            has_matching_image=has_matching_image
        )
