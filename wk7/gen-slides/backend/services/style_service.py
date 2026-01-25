import asyncio
import base64
from typing import Optional
from ..repositories.outline_repo import OutlineRepository
from ..repositories.image_repo import ImageRepository
from ..image_generators import get_image_generator


class StyleService:
    """Service for managing presentation styles."""

    def __init__(self, outline_repo: OutlineRepository, image_repo: ImageRepository):
        self.outline_repo = outline_repo
        self.image_repo = image_repo
        self._pending_styles: dict[str, list[bytes]] = {}

        # Get image generator from factory
        try:
            self.image_generator = get_image_generator()
        except Exception as e:
            print(f"Warning: Failed to initialize image generator: {e}")
            self.image_generator = None

    async def generate_style_options(self, sid: str, description: str) -> list[str]:
        """Generate 2 style image options based on description.

        Returns base64-encoded image strings for frontend preview.
        """
        if not self.image_generator:
            raise ValueError("Image generator not configured")

        try:
            # Use image generator to create style images
            style_images = await self.image_generator.generate_style_options(
                description=description,
                count=2
            )

            # Convert to base64 for frontend
            style_images_b64 = []
            for image_data in style_images:
                image_b64 = base64.b64encode(image_data).decode('utf-8')
                style_images_b64.append(f"data:image/jpeg;base64,{image_b64}")

            # Cache the raw image data for later selection
            self._pending_styles[sid] = style_images

            return style_images_b64

        except Exception as e:
            # Fallback: generate placeholder images
            print(f"Image generation failed: {e}, using placeholder")
            style_images_b64 = []
            placeholder_images = []

            for i in range(2):
                placeholder_image = await self._create_placeholder_image(description, i)
                image_b64 = base64.b64encode(placeholder_image).decode('utf-8')
                style_images_b64.append(f"data:image/png;base64,{image_b64}")
                placeholder_images.append(placeholder_image)

            # Cache placeholders
            self._pending_styles[sid] = placeholder_images

            return style_images_b64

    async def _create_placeholder_image(self, description: str, index: int) -> bytes:
        """Create a simple placeholder image."""
        from PIL import Image, ImageDraw, ImageFont
        import io

        # Create a simple colored image as placeholder
        colors = [
            (66, 135, 245),  # Blue
            (52, 168, 83),   # Green
        ]

        img = Image.new('RGB', (1920, 1080), color=colors[index % 2])
        draw = ImageDraw.Draw(img)

        # Add text
        text = f"Style {index + 1}\n{description[:50]}"
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 60)
        except:
            font = ImageFont.load_default()

        # Center text
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        position = ((1920 - text_width) // 2, (1080 - text_height) // 2)
        draw.text(position, text, fill=(255, 255, 255), font=font)

        # Save to bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()

    async def select_style(self, sid: str, image_index: int) -> str:
        """Select a style image from the generated options."""
        if sid not in self._pending_styles:
            raise ValueError("No pending style options for this project")

        pending = self._pending_styles[sid]
        if image_index < 0 or image_index >= len(pending):
            raise ValueError(f"Invalid image index {image_index}")

        # Save the selected style image
        selected_image = pending[image_index]
        style_filename = await self.image_repo.save_style_image(sid, selected_image)

        # Update outline
        outline = await self.outline_repo.get_outline(sid)
        outline["style_image"] = style_filename
        await self.outline_repo.save_outline(sid, outline)

        # Clear pending styles
        del self._pending_styles[sid]

        return style_filename

    async def has_style(self, sid: str) -> bool:
        """Check if a project has a style image."""
        return await self.image_repo.style_image_exists(sid)
