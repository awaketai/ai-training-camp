import asyncio
from typing import Optional
import google.genai as genai
from .interface import ImageGeneratorInterface


class GeminiImageGenerator(ImageGeneratorInterface):
    """Gemini-based image generation implementation."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash-exp-image-generation"):
        """
        Initialize Gemini image generator.

        Args:
            api_key: Gemini API key
            model: Model name for image generation
        """
        self.api_key = api_key
        self.model = model
        self.client = genai.Client(api_key=api_key)

    async def generate_image(
        self,
        prompt: str,
        style_image_bytes: Optional[bytes] = None
    ) -> bytes:
        """Generate an image using Gemini API."""
        enhanced_prompt = f"Generate a professional and visually appealing presentation slide image for the following content: {prompt}. The image should be suitable for a business or educational presentation."

        try:
            # Build request parts
            parts = [enhanced_prompt]

            if style_image_bytes:
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": style_image_bytes
                    }
                })
                parts.append("Please generate an image that follows a similar visual style to the reference image above.")

            # Call Gemini API
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=parts
            )

            # Extract image data from response
            if response and hasattr(response, 'candidates'):
                for candidate in response.candidates:
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'inline_data') and part.inline_data:
                                return part.inline_data.data

            raise ValueError("No image data in Gemini response")

        except Exception as e:
            raise ValueError(f"Gemini image generation failed: {str(e)}")

    async def generate_style_options(
        self,
        description: str,
        count: int = 2
    ) -> list[bytes]:
        """Generate multiple style option images."""
        prompt = f"""Create a professional presentation slide background image with this style: {description}.
Requirements:
- High quality, suitable for business or educational presentations
- Resolution: 1920x1080
- Clean, professional design
- Minimal text or no text
- Good contrast for readability"""

        images = []
        for i in range(count):
            variation_prompt = prompt + f" (Style variation {i+1})"
            try:
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model,
                    contents=[variation_prompt],
                )

                # Extract image data
                if response and hasattr(response, 'candidates'):
                    for candidate in response.candidates:
                        if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                            for part in candidate.content.parts:
                                if hasattr(part, 'inline_data') and part.inline_data:
                                    images.append(part.inline_data.data)
                                    break

            except Exception as e:
                raise ValueError(f"Gemini style generation failed (image {i+1}): {str(e)}")

        if len(images) != count:
            raise ValueError(f"Expected {count} images, got {len(images)}")

        return images
