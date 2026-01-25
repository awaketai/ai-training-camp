import asyncio
from typing import Optional
from uuid import uuid4
from ..repositories.outline_repo import OutlineRepository
from ..repositories.image_repo import ImageRepository
from ..utils.hash import compute_text_hash
from ..models.schemas import ImageStatusResponse
from ..image_generators import get_image_generator


class ImageGenService:
    """Service for generating slide images using configured image generator."""

    def __init__(self, outline_repo: OutlineRepository, image_repo: ImageRepository):
        self.outline_repo = outline_repo
        self.image_repo = image_repo
        self._tasks: dict[str, asyncio.Task] = {}
        self._task_mapping: dict[tuple[str, int], str] = {}  # (sid, slide_index) -> task_id
        self._task_status: dict[str, dict] = {}  # task_id -> {generating: bool, latest_hash: Optional[str]}

        # Get image generator from factory
        try:
            self.image_generator = get_image_generator()
        except Exception as e:
            print(f"Warning: Failed to initialize image generator: {e}")
            self.image_generator = None

    async def generate_slide_image(self, sid: str, slide_index: int) -> str:
        """Start generating an image for a slide. Returns task_id."""
        # Check if already generating for this slide
        task_key = (sid, slide_index)
        if task_key in self._task_mapping:
            existing_task_id = self._task_mapping[task_key]
            if existing_task_id in self._tasks and not self._tasks[existing_task_id].done():
                raise ValueError(f"Image generation already in progress for slide {slide_index}")

        # Create new task
        task_id = str(uuid4())
        self._task_mapping[task_key] = task_id
        self._task_status[task_id] = {"generating": True, "latest_hash": None}

        # Start async generation task
        task = asyncio.create_task(self._generate_image_task(sid, slide_index, task_id))
        self._tasks[task_id] = task

        return task_id

    async def get_generation_status(self, sid: str, slide_index: int) -> ImageStatusResponse:
        """Get the generation status for a slide."""
        task_key = (sid, slide_index)
        if task_key not in self._task_mapping:
            return ImageStatusResponse(generating=False, latest_hash=None)

        task_id = self._task_mapping[task_key]
        status = self._task_status.get(task_id, {"generating": False, "latest_hash": None})

        return ImageStatusResponse(
            generating=status["generating"],
            latest_hash=status["latest_hash"]
        )

    async def _generate_image_task(self, sid: str, slide_index: int, task_id: str):
        """Background task to generate an image."""
        try:
            # Get slide text
            outline = await self.outline_repo.get_outline(sid)
            slides = outline.get("slides", [])

            if slide_index < 0 or slide_index >= len(slides):
                raise ValueError(f"Slide index {slide_index} out of range")

            slide_text = slides[slide_index].get("text", "")
            if not slide_text:
                raise ValueError("Slide text is empty")

            # Get style image if exists
            style_image_bytes = None
            if await self.image_repo.style_image_exists(sid):
                style_path = self.image_repo.get_style_image_path(sid)
                style_image_bytes = await asyncio.to_thread(style_path.read_bytes)

            # Generate image using configured generator
            image_data = await self._call_image_generator(slide_text, style_image_bytes)

            # Compute hash and save image
            text_hash = compute_text_hash(slide_text)
            await self.image_repo.save_image(sid, text_hash, image_data)

            # Update slide current_image
            slides[slide_index]["current_image"] = text_hash
            await self.outline_repo.save_outline(sid, outline)

            # Update status
            self._task_status[task_id] = {"generating": False, "latest_hash": text_hash}

        except Exception as e:
            # Update status on error
            self._task_status[task_id] = {"generating": False, "latest_hash": None}
            print(f"Image generation error: {e}")
            raise e

    async def _call_image_generator(self, text: str, style_image_bytes: Optional[bytes] = None) -> bytes:
        """Call configured image generator to generate an image."""
        if not self.image_generator:
            raise ValueError("Image generator not configured")

        try:
            # Use image generator
            return await self.image_generator.generate_image(
                prompt=text,
                style_image_bytes=style_image_bytes
            )

        except Exception as e:
            # Create placeholder image on error
            print(f"Image generator error: {e}, creating placeholder")
            return await self._create_placeholder_image(text)

    async def _create_placeholder_image(self, text: str) -> bytes:
        """Create a simple placeholder image."""
        from PIL import Image, ImageDraw, ImageFont
        import io

        # Create a simple colored image as placeholder
        img = Image.new('RGB', (1920, 1080), color=(66, 135, 245))  # Blue
        draw = ImageDraw.Draw(img)

        # Add text
        display_text = text[:100] if len(text) > 100 else text
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 60)
        except:
            font = ImageFont.load_default()

        # Center text
        bbox = draw.textbbox((0, 0), display_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        position = ((1920 - text_width) // 2, (1080 - text_height) // 2)
        draw.text(position, display_text, fill=(255, 255, 255), font=font)

        # Save to bytes
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        return buffer.getvalue()

