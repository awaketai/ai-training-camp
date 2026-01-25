from abc import ABC, abstractmethod
from typing import Optional


class ImageGeneratorInterface(ABC):
    """Abstract interface for image generation services."""

    @abstractmethod
    async def generate_image(
        self,
        prompt: str,
        style_image_bytes: Optional[bytes] = None
    ) -> bytes:
        """
        Generate an image from a text prompt.

        Args:
            prompt: Text description for image generation
            style_image_bytes: Optional reference style image

        Returns:
            Generated image as bytes

        Raises:
            ValueError: If generation fails
        """
        pass

    @abstractmethod
    async def generate_style_options(
        self,
        description: str,
        count: int = 2
    ) -> list[bytes]:
        """
        Generate multiple style option images.

        Args:
            description: Style description
            count: Number of images to generate

        Returns:
            List of generated images as bytes

        Raises:
            ValueError: If generation fails
        """
        pass
