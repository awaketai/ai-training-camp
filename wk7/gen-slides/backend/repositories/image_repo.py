import asyncio
from pathlib import Path
from typing import Optional


class ImageRepository:
    """Repository for managing slide images."""

    def __init__(self, base_dir: str = "./slides"):
        self.base_dir = Path(base_dir)

    def get_image_path(self, sid: str, hash_value: str) -> Path:
        """Get the path to an image file."""
        return self.base_dir / sid / "images" / f"{hash_value}.jpg"

    async def save_image(self, sid: str, hash_value: str, data: bytes) -> str:
        """Save an image file and return its hash."""
        image_dir = self.base_dir / sid / "images"
        await asyncio.to_thread(image_dir.mkdir, parents=True, exist_ok=True)

        image_path = self.get_image_path(sid, hash_value)
        await asyncio.to_thread(image_path.write_bytes, data)
        return hash_value

    async def list_images(self, sid: str) -> list[str]:
        """List all image hashes for a project."""
        image_dir = self.base_dir / sid / "images"

        if not await asyncio.to_thread(image_dir.exists):
            return []

        files = await asyncio.to_thread(list, image_dir.glob("*.jpg"))
        return [f.stem for f in files]

    async def image_exists(self, sid: str, hash_value: str) -> bool:
        """Check if an image exists."""
        image_path = self.get_image_path(sid, hash_value)
        return await asyncio.to_thread(image_path.exists)

    async def save_style_image(self, sid: str, data: bytes) -> str:
        """Save the style image for a project."""
        style_path = self.get_style_image_path(sid)
        await asyncio.to_thread(style_path.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(style_path.write_bytes, data)
        return "style.jpg"

    def get_style_image_path(self, sid: str) -> Path:
        """Get the path to the style image."""
        return self.base_dir / sid / "style.jpg"

    async def style_image_exists(self, sid: str) -> bool:
        """Check if a style image exists."""
        style_path = self.get_style_image_path(sid)
        return await asyncio.to_thread(style_path.exists)
