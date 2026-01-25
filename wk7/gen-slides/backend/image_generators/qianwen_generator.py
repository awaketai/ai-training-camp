import asyncio
import base64
from typing import Optional
import httpx
from .interface import ImageGeneratorInterface


class QianwenImageGenerator(ImageGeneratorInterface):
    """Qianwen (通义千问) image generation implementation."""

    def __init__(self, api_key: str, model: str = "wanx-v1"):
        """
        Initialize Qianwen image generator.

        Args:
            api_key: Alibaba Cloud API key (DashScope API key)
            model: Model name for image generation (wanx-v1, wanx2-v1, wan2.6-t2i, etc.)
        """
        self.api_key = api_key
        self.model = model

        # Initialize DashScope
        try:
            import dashscope
            dashscope.api_key = api_key
            self.dashscope = dashscope
        except ImportError:
            raise ImportError("dashscope package not installed. Run: pip install dashscope")

    async def generate_image(
        self,
        prompt: str,
        style_image_bytes: Optional[bytes] = None
    ) -> bytes:
        """Generate an image using Qianwen API."""
        from dashscope import MultiModalConversation

        enhanced_prompt = f"专业的演示文稿幻灯片图片：{prompt}。适合商业或教育演示，高质量，专业设计。"

        try:
            # Prepare messages format for MultiModalConversation API
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"text": enhanced_prompt}
                    ]
                }
            ]

            # Add style reference image if provided
            # Note: t2i (text-to-image) models don't support image input
            if style_image_bytes and "t2i" not in self.model.lower():
                style_b64 = base64.b64encode(style_image_bytes).decode('utf-8')
                messages[0]["content"].insert(0, {
                    "image": f"data:image/jpeg;base64,{style_b64}"
                })
                messages[0]["content"][1]["text"] = f"请参考这个风格生成图片。{enhanced_prompt}"
            elif style_image_bytes:
                # For t2i models, describe style in text instead
                print(f"[Qianwen] t2i model detected, style image will be ignored (t2i models only accept text)")
                messages[0]["content"][0]["text"] = f"{enhanced_prompt}"

            # Call Qianwen API using MultiModalConversation.call
            response = await asyncio.to_thread(
                MultiModalConversation.call,
                model=self.model,
                messages=messages
            )

            # Check response
            if response.status_code == 200:
                # Parse response: output.choices[0].message.content[0].image
                if hasattr(response, 'output') and response.output:
                    choices = response.output.get('choices', [])
                    if choices and len(choices) > 0:
                        message = choices[0].get('message', {})
                        content = message.get('content', [])

                        # Find image in content
                        for item in content:
                            if isinstance(item, dict) and 'image' in item:
                                image_url = item['image']

                                # Download image from URL
                                print(f"[Qianwen] Downloading image from: {image_url[:80]}...")
                                async with httpx.AsyncClient(timeout=30.0) as client:
                                    img_response = await client.get(image_url)
                                    if img_response.status_code == 200:
                                        print(f"[Qianwen] Successfully downloaded image: {len(img_response.content)} bytes")
                                        return img_response.content
                                    else:
                                        raise ValueError(f"Failed to download image: HTTP {img_response.status_code}")

            # If we get here, parsing failed
            error_msg = response.message if hasattr(response, 'message') else 'Unknown error'
            raise ValueError(f"Qianwen API error: {error_msg}")

        except Exception as e:
            print(f"[Qianwen] Error: {e}")
            raise ValueError(f"Qianwen image generation failed: {str(e)}")

    async def generate_style_options(
        self,
        description: str,
        count: int = 2
    ) -> list[bytes]:
        """Generate multiple style option images."""
        from dashscope import MultiModalConversation

        prompt = f"""创建专业的演示文稿幻灯片背景图片，风格：{description}。
要求：
- 高质量，适合商业或教育演示
- 简洁专业的设计
- 无文字或最少文字
- 良好的对比度以便阅读"""

        images = []

        # Generate images one by one (Qianwen doesn't support batch in single call)
        for i in range(count):
            try:
                variation_prompt = f"{prompt}\n风格变体 {i+1}"

                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"text": variation_prompt}
                        ]
                    }
                ]

                response = await asyncio.to_thread(
                    MultiModalConversation.call,
                    model=self.model,
                    messages=messages
                )

                if response.status_code == 200:
                    choices = response.output.get('choices', [])
                    if choices and len(choices) > 0:
                        message = choices[0].get('message', {})
                        content = message.get('content', [])

                        for item in content:
                            if isinstance(item, dict) and 'image' in item:
                                image_url = item['image']

                                # Download image
                                print(f"[Qianwen] Downloading style image {i+1} from: {image_url[:80]}...")
                                async with httpx.AsyncClient(timeout=30.0) as client:
                                    img_response = await client.get(image_url)
                                    if img_response.status_code == 200:
                                        images.append(img_response.content)
                                        print(f"[Qianwen] Style image {i+1} downloaded: {len(img_response.content)} bytes")
                                        break

            except Exception as e:
                print(f"[Qianwen] Error generating style image {i+1}: {e}")
                raise ValueError(f"Qianwen style generation failed (image {i+1}): {str(e)}")

        if len(images) != count:
            raise ValueError(f"Expected {count} images, got {len(images)}")

        return images
