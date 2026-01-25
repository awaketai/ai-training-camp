# Image Generation Architecture

GenSlides 使用**策略模式**实现灵活的图像生成架构，支持多个图像生成服务提供商。

## 架构设计

### 1. 抽象接口层 (`ImageGeneratorInterface`)

```python
class ImageGeneratorInterface(ABC):
    @abstractmethod
    async def generate_image(prompt: str, style_image_bytes: Optional[bytes]) -> bytes

    @abstractmethod
    async def generate_style_options(description: str, count: int) -> list[bytes]
```

### 2. 具体实现层

#### Gemini Generator (`GeminiImageGenerator`)
- 使用 Google Gemini API
- 模型：`gemini-2.0-flash-exp-image-generation`
- 支持风格参考图片

#### Qianwen Generator (`QianwenImageGenerator`)
- 使用阿里云通义千问 API (DashScope)
- 模型：`wanx-v1`, `wanx2-v1`
- 支持风格迁移（wanx2 模型）

### 3. 工厂层 (`ImageGeneratorFactory`)

根据配置自动创建对应的生成器实例：

```python
generator = ImageGeneratorFactory.create()  # 根据 IMAGE_GENERATOR_TYPE 选择
```

### 4. 服务层集成

`StyleService` 和 `ImageGenService` 通过依赖注入使用抽象接口：

```python
self.image_generator = get_image_generator()  # 单例模式
image_data = await self.image_generator.generate_image(prompt)
```

## 配置说明

### 方式 1: 使用 Gemini

```.env
IMAGE_GENERATOR_TYPE=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation
```

### 方式 2: 使用通义千问

```.env
IMAGE_GENERATOR_TYPE=qianwen
QIANWEN_API_KEY=your-dashscope-api-key
QIANWEN_IMAGE_MODEL=wanx-v1
```

## 支持的模型

### Gemini Models
- `gemini-2.0-flash-exp-image-generation` - 实验性图像生成模型

### Qianwen Models
- `wanx-v1` - 通义万相 1.0
- `wanx2-v1` - 通义万相 2.0 (支持风格参考)

## 如何添加新的生成器

1. 创建新类实现 `ImageGeneratorInterface`
2. 在 `factory.py` 中添加新的分支
3. 在 `config.py` 中添加相应配置
4. 在 `requirements.txt` 中添加依赖

示例：

```python
# new_generator.py
from .interface import ImageGeneratorInterface

class NewImageGenerator(ImageGeneratorInterface):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    async def generate_image(self, prompt: str, style_image_bytes: Optional[bytes]) -> bytes:
        # 实现图像生成逻辑
        pass

    async def generate_style_options(self, description: str, count: int) -> list[bytes]:
        # 实现风格生成逻辑
        pass

# factory.py
elif generator_type == "new_provider":
    return NewImageGenerator(
        api_key=settings.new_provider_api_key,
        model=settings.new_provider_model
    )
```

## 优势

1. **解耦合**: 服务层不依赖具体实现
2. **可扩展**: 轻松添加新的图像生成服务
3. **可测试**: 可以 mock 接口进行单元测试
4. **灵活配置**: 运行时动态切换提供商
5. **容错性**: 自动回退到占位图片

## API 文档

### Gemini API
- 文档: https://ai.google.dev/gemini-api/docs
- 获取 API Key: https://aistudio.google.com/app/apikey

### Qianwen API (DashScope)
- 文档: https://help.aliyun.com/zh/model-studio/developer-reference/api-details-9
- 控制台: https://bailian.console.aliyun.com/
- 获取 API Key: DashScope 控制台 > API-KEY 管理

## 依赖包

```bash
# Gemini
pip install google-genai

# Qianwen
pip install dashscope httpx

# 通用
pip install pillow  # 占位图片生成
```
