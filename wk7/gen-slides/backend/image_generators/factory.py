from .interface import ImageGeneratorInterface
from .gemini_generator import GeminiImageGenerator
from .qianwen_generator import QianwenImageGenerator
from ..config import settings


class ImageGeneratorFactory:
    """Factory for creating image generator instances based on configuration."""

    @staticmethod
    def create() -> ImageGeneratorInterface:
        """
        Create an image generator based on configuration.

        Returns:
            ImageGeneratorInterface implementation

        Raises:
            ValueError: If image_generator_type is invalid or API key is missing
        """
        generator_type = settings.image_generator_type.lower()

        if generator_type == "gemini":
            if not settings.gemini_api_key:
                raise ValueError("Gemini API key not configured")

            return GeminiImageGenerator(
                api_key=settings.gemini_api_key,
                model=settings.gemini_image_model
            )

        elif generator_type == "qianwen":
            if not settings.qianwen_api_key:
                raise ValueError("Qianwen API key not configured")

            return QianwenImageGenerator(
                api_key=settings.qianwen_api_key,
                model=settings.qianwen_image_model
            )

        else:
            raise ValueError(
                f"Invalid image_generator_type: {generator_type}. "
                f"Supported types: gemini, qianwen"
            )


# Singleton instance
_generator_instance: ImageGeneratorInterface = None


def get_image_generator() -> ImageGeneratorInterface:
    """
    Get the singleton image generator instance.

    Returns:
        ImageGeneratorInterface implementation
    """
    global _generator_instance

    if _generator_instance is None:
        _generator_instance = ImageGeneratorFactory.create()

    return _generator_instance
