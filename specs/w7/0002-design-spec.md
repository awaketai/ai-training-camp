# GenSlides 技术设计文档

## 1. 系统架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        浏览器 (SPA)                                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Zustand   │  │ React    │  │ Tailwind │  │  dnd-kit (拖拽)   │  │
│  │  Store     │  │ 组件树   │  │  CSS     │  │                   │  │
│  └─────┬─────┘  └────┬─────┘  └──────────┘  └───────────────────┘  │
│        │              │                                              │
│        └──────┬───────┘                                              │
│               │ HTTP (fetch)                                         │
└───────────────┼──────────────────────────────────────────────────────┘
                │
┌───────────────┼──────────────────────────────────────────────────────┐
│               ▼           FastAPI 后端                                │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                    API Layer (routes/)                        │     │
│  │   slides_router  ──  style_router  ──  images_router         │     │
│  └──────────────────────────┬──────────────────────────────────┘     │
│                             │                                        │
│  ┌──────────────────────────┼──────────────────────────────────┐     │
│  │                 Service Layer (services/)                     │     │
│  │   SlideService  ──  ImageGenService  ──  StyleService        │     │
│  └──────────────────────────┬──────────────────────────────────┘     │
│                             │                                        │
│  ┌──────────────────────────┼──────────────────────────────────┐     │
│  │                Storage Layer (storage/)                       │     │
│  │   OutlineRepository  ──  ImageRepository                     │     │
│  └──────────────────────────┬──────────────────────────────────┘     │
│                             │                                        │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   本地文件系统        │
                   │   ./slides/<sid>/    │
                   └─────────────────────┘
```

## 2. 项目目录结构

```
genslides/
├── backend/
│   ├── main.py                     # FastAPI 应用入口、CORS 配置、路由挂载
│   ├── config.py                   # 配置管理（Gemini API Key、端口等）
│   ├── routes/                     # API 层：HTTP 请求/响应处理
│   │   ├── __init__.py
│   │   ├── slides.py               # slides CRUD 路由
│   │   ├── images.py               # 图片获取与生成路由
│   │   └── style.py                # 风格图片生成与选择路由
│   ├── services/                   # 业务层：核心业务逻辑
│   │   ├── __init__.py
│   │   ├── slide_service.py        # slide 管理业务逻辑
│   │   ├── image_gen_service.py    # 图片生成业务逻辑（调用 Gemini API）
│   │   └── style_service.py        # 风格管理业务逻辑
│   ├── storage/                    # 存储层：文件系统读写
│   │   ├── __init__.py
│   │   ├── outline_repo.py         # outline.yml 读写
│   │   └── image_repo.py           # 图片文件读写
│   ├── models/                     # 数据模型定义
│   │   ├── __init__.py
│   │   └── schemas.py              # Pydantic 请求/响应模型
│   ├── utils/                      # 工具函数
│   │   ├── __init__.py
│   │   └── hash.py                 # blake3 hash 计算
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx                # 应用入口
│       ├── App.tsx                 # 根组件、路由配置
│       ├── api/                    # API 调用封装
│       │   ├── client.ts           # HTTP 客户端基础配置
│       │   ├── slides.ts           # slides 相关 API 调用
│       │   ├── images.ts           # 图片相关 API 调用
│       │   └── style.ts            # 风格相关 API 调用
│       ├── components/             # UI 组件
│       │   ├── Header.tsx          # 顶部导航栏
│       │   ├── Sidebar.tsx         # 左侧边栏（拖拽容器）
│       │   ├── SlideCard.tsx       # slide 缩略图卡片
│       │   ├── PreviewArea.tsx     # 右侧预览区域
│       │   ├── StylePopup.tsx      # 风格设置弹窗
│       │   └── Carousel.tsx        # 全屏走马灯
│       ├── stores/                 # 状态管理
│       │   └── slidesStore.ts      # Zustand store
│       ├── types/                  # TypeScript 类型定义
│       │   └── index.ts
│       └── styles/
│           └── globals.css         # 全局样式 + Tailwind 导入
├── slides/                         # 数据存储目录
│   └── hello-world/                # 示例项目
│       ├── outline.yml
│       ├── style.jpg
│       └── images/
│           └── <blake3_hash>.jpg
└── .env                            # 环境变量（GEMINI_API_KEY）
```

## 3. 后端设计

### 3.1 数据模型 (`models/schemas.py`)

```python
from pydantic import BaseModel
from typing import Optional

# ─── 基础实体 ───

class SlideItem(BaseModel):
    """单个 slide 的数据结构"""
    index: int                          # slide 在列表中的位置索引
    text: str                           # slide 的文字内容
    images: list[str]                   # 该 slide 所有图片的 blake3 hash 列表
    current_image: Optional[str]        # 当前展示的图片 hash（可能为空）
    has_matching_image: bool            # 当前文字是否有对应 hash 的图片

# ─── 请求模型 ───

class UpdateSlideTextRequest(BaseModel):
    text: str

class ReorderSlidesRequest(BaseModel):
    order: list[int]                    # 新的 slide 索引顺序

class GenerateStyleRequest(BaseModel):
    description: str                    # 风格描述文字

class SelectStyleRequest(BaseModel):
    image_index: int                    # 0 或 1，选择哪张风格图片

class AddSlideRequest(BaseModel):
    text: str = ""                      # 新 slide 的文字内容（可选）

# ─── 响应模型 ───

class SlidesResponse(BaseModel):
    """获取 slides 列表的响应"""
    sid: str
    style_image: Optional[str]          # 风格图片 URL（null 表示未设置）
    slides: list[SlideItem]

class UpdateSlideResponse(BaseModel):
    success: bool
    has_image: bool                     # 更新后是否有对应 hash 的图片

class ReorderResponse(BaseModel):
    success: bool

class GenerateImageResponse(BaseModel):
    task_id: str                        # 异步任务 ID

class ImageStatusResponse(BaseModel):
    generating: bool                    # 是否正在生成中
    latest_hash: Optional[str]          # 最新生成的图片 hash

class GenerateStyleResponse(BaseModel):
    images: list[str]                   # 两张图片的 base64 编码

class SelectStyleResponse(BaseModel):
    success: bool
    style_image: str                    # 选中的风格图片 URL

class AddSlideResponse(BaseModel):
    success: bool
    slide: SlideItem
```

### 3.2 存储层 (`storage/`)

#### `storage/outline_repo.py`

负责 `outline.yml` 文件的读写操作，不包含业务逻辑。

```python
class OutlineRepository:
    """outline.yml 文件读写"""

    def __init__(self, base_dir: str = "./slides"):
        self.base_dir = base_dir

    def get_outline(self, sid: str) -> dict:
        """读取 outline.yml 并返回原始 dict"""

    def save_outline(self, sid: str, data: dict) -> None:
        """将 dict 写入 outline.yml"""

    def exists(self, sid: str) -> bool:
        """检查指定 sid 的项目是否存在"""

    def create_project(self, sid: str) -> None:
        """创建新项目目录和空 outline.yml"""
```

#### `storage/image_repo.py`

负责图片文件的读写操作。

```python
class ImageRepository:
    """图片文件读写"""

    def __init__(self, base_dir: str = "./slides"):
        self.base_dir = base_dir

    def get_image_path(self, sid: str, hash: str) -> Path:
        """获取图片的文件系统路径"""

    def save_image(self, sid: str, hash: str, data: bytes) -> str:
        """保存图片文件，返回文件路径"""

    def list_images(self, sid: str) -> list[str]:
        """列出项目下所有图片 hash"""

    def image_exists(self, sid: str, hash: str) -> bool:
        """检查指定 hash 的图片是否存在"""

    def save_style_image(self, sid: str, data: bytes) -> str:
        """保存风格图片为 style.jpg"""

    def get_style_image_path(self, sid: str) -> Optional[Path]:
        """获取风格图片路径，不存在返回 None"""
```

### 3.3 业务层 (`services/`)

#### `services/slide_service.py`

```python
class SlideService:
    """Slide 管理业务逻辑"""

    def __init__(self, outline_repo: OutlineRepository, image_repo: ImageRepository):
        self.outline_repo = outline_repo
        self.image_repo = image_repo

    def get_slides(self, sid: str) -> SlidesResponse:
        """
        获取项目的所有 slides 信息
        - 读取 outline.yml
        - 补充每个 slide 的图片列表和匹配状态
        """

    def update_slide_text(self, sid: str, slide_index: int, text: str) -> UpdateSlideResponse:
        """
        更新 slide 文字
        - 计算新文字的 blake3 hash
        - 检查是否已有对应图片
        - 更新 outline.yml
        """

    def reorder_slides(self, sid: str, order: list[int]) -> ReorderResponse:
        """
        重新排列 slides 顺序
        - 验证 order 数组合法性
        - 更新 outline.yml 中 slides 顺序
        """

    def add_slide(self, sid: str, text: str = "") -> AddSlideResponse:
        """
        添加新 slide
        - 追加到 outline.yml 的 slides 列表
        """
```

#### `services/image_gen_service.py`

```python
import asyncio
from google import genai

class ImageGenService:
    """图片生成业务逻辑（调用 Gemini API）"""

    def __init__(self, image_repo: ImageRepository, outline_repo: OutlineRepository):
        self.image_repo = image_repo
        self.outline_repo = outline_repo
        self._tasks: dict[str, asyncio.Task] = {}  # 异步生成任务追踪

    async def generate_slide_image(self, sid: str, slide_index: int) -> str:
        """
        触发异步图片生成
        - 读取 slide 文字和风格图片
        - 调用 Gemini API 生成图片
        - 保存图片并更新 outline.yml
        - 返回 task_id
        """

    def get_generation_status(self, sid: str, slide_index: int) -> ImageStatusResponse:
        """
        查询生成状态
        - 检查对应 task 是否完成
        - 返回最新的图片 hash
        """

    async def _call_gemini_api(self, prompt: str, style_image: Optional[bytes] = None) -> bytes:
        """
        调用 Gemini API 生成图片
        - 构建 prompt（包含文字内容）
        - 如有风格图片，作为参考传入
        - 返回生成的图片 bytes
        """
```

#### `services/style_service.py`

```python
class StyleService:
    """风格管理业务逻辑"""

    def __init__(self, image_repo: ImageRepository, outline_repo: OutlineRepository):
        self.image_repo = image_repo
        self.outline_repo = outline_repo
        self._pending_styles: dict[str, list[bytes]] = {}  # 待选风格图片缓存

    async def generate_style_options(self, sid: str, description: str) -> GenerateStyleResponse:
        """
        生成两张风格候选图片
        - 调用 Gemini API 生成两张风格图片
        - 缓存到内存中等待用户选择
        - 返回 base64 编码的图片
        """

    def select_style(self, sid: str, image_index: int) -> SelectStyleResponse:
        """
        用户选择风格图片
        - 从缓存中取出对应图片
        - 保存为 style.jpg
        - 更新 outline.yml
        """

    def has_style(self, sid: str) -> bool:
        """检查项目是否已设置风格图片"""
```

### 3.4 API 层 (`routes/`)

#### `routes/slides.py`

```python
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/api/slides")

@router.get("/{sid}")
async def get_slides(sid: str) -> SlidesResponse:
    """获取项目的 slides 列表"""

@router.put("/{sid}/{slide_index}")
async def update_slide_text(sid: str, slide_index: int, body: UpdateSlideTextRequest) -> UpdateSlideResponse:
    """更新 slide 的文字内容"""

@router.put("/{sid}/reorder")
async def reorder_slides(sid: str, body: ReorderSlidesRequest) -> ReorderResponse:
    """拖拽排序 slides"""

@router.post("/{sid}/add")
async def add_slide(sid: str, body: AddSlideRequest) -> AddSlideResponse:
    """添加新 slide"""
```

#### `routes/images.py`

```python
from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/slides")

@router.get("/{sid}/images/{hash}.jpg")
async def get_image(sid: str, hash: str) -> FileResponse:
    """获取指定 hash 的图片文件"""

@router.post("/{sid}/{slide_index}/generate")
async def generate_image(sid: str, slide_index: int) -> GenerateImageResponse:
    """触发异步图片生成"""

@router.get("/{sid}/{slide_index}/status")
async def get_generation_status(sid: str, slide_index: int) -> ImageStatusResponse:
    """查询图片生成状态"""
```

#### `routes/style.py`

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/slides")

@router.get("/{sid}/style")
async def get_style_image(sid: str) -> FileResponse:
    """获取风格图片"""

@router.post("/{sid}/style/generate")
async def generate_style(sid: str, body: GenerateStyleRequest) -> GenerateStyleResponse:
    """生成两张风格候选图片"""

@router.post("/{sid}/style/select")
async def select_style(sid: str, body: SelectStyleRequest) -> SelectStyleResponse:
    """选择风格图片"""
```

### 3.5 应用入口 (`main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="GenSlides API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite 开发服务器
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载路由
app.include_router(slides_router)
app.include_router(images_router)
app.include_router(style_router)
```

### 3.6 配置管理 (`config.py`)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    gemini_api_key: str
    slides_dir: str = "./slides"
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()
```

## 4. 前端设计

### 4.1 TypeScript 类型定义 (`types/index.ts`)

```typescript
// ─── 基础实体 ───

export interface Slide {
  index: number;
  text: string;
  images: string[];          // 所有图片 hash
  current_image: string | null;
  has_matching_image: boolean;
}

export interface SlidesData {
  sid: string;
  style_image: string | null;
  slides: Slide[];
}

// ─── API 请求类型 ───

export interface UpdateSlideTextRequest {
  text: string;
}

export interface ReorderSlidesRequest {
  order: number[];
}

export interface GenerateStyleRequest {
  description: string;
}

export interface SelectStyleRequest {
  image_index: 0 | 1;
}

export interface AddSlideRequest {
  text?: string;
}

// ─── API 响应类型 ───

export interface UpdateSlideResponse {
  success: boolean;
  has_image: boolean;
}

export interface ReorderResponse {
  success: boolean;
}

export interface GenerateImageResponse {
  task_id: string;
}

export interface ImageStatusResponse {
  generating: boolean;
  latest_hash: string | null;
}

export interface GenerateStyleResponse {
  images: [string, string];  // base64 encoded
}

export interface SelectStyleResponse {
  success: boolean;
  style_image: string;
}

export interface AddSlideResponse {
  success: boolean;
  slide: Slide;
}
```

### 4.2 API 调用层 (`api/`)

#### `api/client.ts`

```typescript
const BASE_URL = "http://localhost:8000/api";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export function imageUrl(sid: string, hash: string): string {
  return `${BASE_URL}/slides/${sid}/images/${hash}.jpg`;
}

export function styleImageUrl(sid: string): string {
  return `${BASE_URL}/slides/${sid}/style`;
}
```

#### `api/slides.ts`

```typescript
import { apiGet, apiPut, apiPost } from "./client";
import type {
  SlidesData,
  UpdateSlideTextRequest,
  UpdateSlideResponse,
  ReorderSlidesRequest,
  ReorderResponse,
  AddSlideRequest,
  AddSlideResponse,
} from "../types";

export async function fetchSlides(sid: string): Promise<SlidesData> {
  return apiGet<SlidesData>(`/slides/${sid}`);
}

export async function updateSlideText(
  sid: string,
  slideIndex: number,
  text: string
): Promise<UpdateSlideResponse> {
  return apiPut<UpdateSlideResponse>(`/slides/${sid}/${slideIndex}`, { text });
}

export async function reorderSlides(
  sid: string,
  order: number[]
): Promise<ReorderResponse> {
  return apiPut<ReorderResponse>(`/slides/${sid}/reorder`, { order });
}

export async function addSlide(
  sid: string,
  text: string = ""
): Promise<AddSlideResponse> {
  return apiPost<AddSlideResponse>(`/slides/${sid}/add`, { text });
}
```

#### `api/images.ts`

```typescript
import { apiGet, apiPost } from "./client";
import type { GenerateImageResponse, ImageStatusResponse } from "../types";

export async function generateImage(
  sid: string,
  slideIndex: number
): Promise<GenerateImageResponse> {
  return apiPost<GenerateImageResponse>(`/slides/${sid}/${slideIndex}/generate`, {});
}

export async function getImageStatus(
  sid: string,
  slideIndex: number
): Promise<ImageStatusResponse> {
  return apiGet<ImageStatusResponse>(`/slides/${sid}/${slideIndex}/status`);
}
```

#### `api/style.ts`

```typescript
import { apiPost } from "./client";
import type {
  GenerateStyleRequest,
  GenerateStyleResponse,
  SelectStyleRequest,
  SelectStyleResponse,
} from "../types";

export async function generateStyleOptions(
  sid: string,
  description: string
): Promise<GenerateStyleResponse> {
  return apiPost<GenerateStyleResponse>(`/slides/${sid}/style/generate`, { description });
}

export async function selectStyle(
  sid: string,
  imageIndex: 0 | 1
): Promise<SelectStyleResponse> {
  return apiPost<SelectStyleResponse>(`/slides/${sid}/style/select`, { image_index: imageIndex });
}
```

### 4.3 状态管理 (`stores/slidesStore.ts`)

```typescript
import { create } from "zustand";
import type { Slide } from "../types";
import * as slidesApi from "../api/slides";
import * as imagesApi from "../api/images";
import * as styleApi from "../api/style";

interface SlidesState {
  // ─── 状态 ───
  sid: string;
  slides: Slide[];
  currentSlideIndex: number;
  isPlaying: boolean;
  styleImage: string | null;
  showStylePopup: boolean;
  styleOptions: [string, string] | null;
  generatingSlides: Set<number>;        // 正在生成图片的 slide 索引集合
  styleGenerating: boolean;

  // ─── Slide 操作 ───
  loadSlides: (sid: string) => Promise<void>;
  selectSlide: (index: number) => void;
  updateSlideText: (index: number, text: string) => Promise<void>;
  reorderSlides: (fromIndex: number, toIndex: number) => Promise<void>;
  addSlide: (text?: string) => Promise<void>;

  // ─── 图片生成 ───
  generateImage: (index: number) => Promise<void>;
  pollImageStatus: (index: number) => Promise<void>;

  // ─── 风格 ───
  generateStyleOptions: (description: string) => Promise<void>;
  selectStyle: (optionIndex: 0 | 1) => Promise<void>;
  dismissStylePopup: () => void;

  // ─── 播放 ───
  startPlayback: () => void;
  stopPlayback: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
}
```

### 4.4 组件设计

#### `App.tsx`

```
根据 URL path 提取 sid，加载 slides 数据。
若 styleImage 为 null，显示 StylePopup。
```

#### `Header.tsx`

| Props | 类型 | 说明 |
|-------|------|------|
| onPlay | () => void | 点击播放按钮回调 |

#### `Sidebar.tsx`

| Props | 类型 | 说明 |
|-------|------|------|
| slides | Slide[] | slide 列表 |
| currentIndex | number | 当前选中索引 |
| onSelect | (index: number) => void | 选中回调 |
| onReorder | (from: number, to: number) => void | 拖拽排序回调 |
| onTextUpdate | (index: number, text: string) => void | 文字编辑回调 |

使用 `@dnd-kit/core` + `@dnd-kit/sortable` 实现拖拽排序。

#### `SlideCard.tsx`

| Props | 类型 | 说明 |
|-------|------|------|
| slide | Slide | slide 数据 |
| isSelected | boolean | 是否选中 |
| onSelect | () => void | 单击选中 |
| onTextUpdate | (text: string) => void | 双击编辑完成回调 |

状态：
- 默认模式：显示缩略图 + 文字
- 编辑模式（双击触发）：文字区域变为 textarea

#### `PreviewArea.tsx`

| Props | 类型 | 说明 |
|-------|------|------|
| slide | Slide \| null | 当前选中的 slide |
| sid | string | 项目 ID |
| isGenerating | boolean | 是否正在生成 |
| onGenerate | () => void | 点击生成按钮回调 |

展示逻辑：
1. 有 `current_image` → 显示大图
2. `has_matching_image === false` → 图片下方显示「生成图片」按钮
3. `isGenerating === true` → 按钮变为 loading 状态

#### `StylePopup.tsx`

| Props | 类型 | 说明 |
|-------|------|------|
| visible | boolean | 是否显示 |
| styleOptions | [string, string] \| null | 候选图片 (base64) |
| isGenerating | boolean | 正在生成中 |
| onGenerate | (description: string) => void | 生成风格图片 |
| onSelect | (index: 0 \| 1) => void | 选择风格 |

#### `Carousel.tsx`

| Props | 类型 | 说明 |
|-------|------|------|
| slides | Slide[] | slide 列表 |
| startIndex | number | 起始 slide 索引 |
| sid | string | 项目 ID |
| onExit | () => void | 退出播放回调 |

功能：
- 全屏模式 (Fullscreen API)
- 自动轮播（5 秒间隔）
- 键盘监听：←/→ 手动切换，ESC 退出
- 循环播放

## 5. API 接口完整定义

### 5.1 Slides 接口

#### `GET /api/slides/{sid}`

获取项目的 slides 列表和元信息。

**Response 200:**
```json
{
  "sid": "hello-world",
  "style_image": "/api/slides/hello-world/style",
  "slides": [
    {
      "index": 0,
      "text": "开场白",
      "images": ["a1b2c3d4", "e5f6g7h8"],
      "current_image": "a1b2c3d4",
      "has_matching_image": true
    }
  ]
}
```

**Response 404:**
```json
{ "detail": "Project not found" }
```

---

#### `PUT /api/slides/{sid}/{slide_index}`

更新指定 slide 的文字内容。

**Request Body:**
```json
{ "text": "新的文字内容" }
```

**Response 200:**
```json
{ "success": true, "has_image": false }
```

**Response 404:**
```json
{ "detail": "Slide not found" }
```

---

#### `PUT /api/slides/{sid}/reorder`

重新排列 slides 顺序。

**Request Body:**
```json
{ "order": [2, 0, 1, 3] }
```

**Response 200:**
```json
{ "success": true }
```

**Response 400:**
```json
{ "detail": "Invalid order: length mismatch or invalid indices" }
```

---

#### `POST /api/slides/{sid}/add`

添加新 slide。

**Request Body:**
```json
{ "text": "新 slide 的内容" }
```

**Response 200:**
```json
{
  "success": true,
  "slide": {
    "index": 3,
    "text": "新 slide 的内容",
    "images": [],
    "current_image": null,
    "has_matching_image": false
  }
}
```

---

### 5.2 图片接口

#### `GET /api/slides/{sid}/images/{hash}.jpg`

获取指定 hash 的图片文件。

**Response 200:** `image/jpeg` 二进制流

**Response 404:**
```json
{ "detail": "Image not found" }
```

---

#### `POST /api/slides/{sid}/{slide_index}/generate`

触发异步图片生成任务。

**Response 200:**
```json
{ "task_id": "uuid-string" }
```

**Response 409:**
```json
{ "detail": "Image generation already in progress" }
```

---

#### `GET /api/slides/{sid}/{slide_index}/status`

查询图片生成状态。

**Response 200:**
```json
{ "generating": true, "latest_hash": null }
```

生成完成后：
```json
{ "generating": false, "latest_hash": "a1b2c3d4" }
```

---

### 5.3 风格接口

#### `GET /api/slides/{sid}/style`

获取项目的风格图片。

**Response 200:** `image/jpeg` 二进制流

**Response 404:**
```json
{ "detail": "Style image not set" }
```

---

#### `POST /api/slides/{sid}/style/generate`

生成两张风格候选图片。

**Request Body:**
```json
{ "description": "简约商务风格，深蓝色调" }
```

**Response 200:**
```json
{ "images": ["base64_encoded_image_a...", "base64_encoded_image_b..."] }
```

---

#### `POST /api/slides/{sid}/style/select`

从候选中选择风格图片。

**Request Body:**
```json
{ "image_index": 0 }
```

**Response 200:**
```json
{ "success": true, "style_image": "/api/slides/hello-world/style" }
```

**Response 400:**
```json
{ "detail": "No pending style options. Generate first." }
```

## 6. 文件存储格式

### 6.1 `outline.yml`

```yaml
style_image: style.jpg              # 风格图片文件名（null 或缺省表示未设置）
slides:
  - text: "第一页：公司简介"
    current_image: "a1b2c3d4e5f6"   # 当前展示的图片 blake3 hash
  - text: "第二页：产品亮点"
    current_image: "f7g8h9i0j1k2"
  - text: "第三页：团队介绍"
    current_image: null              # 尚未生成图片
```

### 6.2 图片命名规则

- 路径: `./slides/<sid>/images/<blake3_hash>.jpg`
- `blake3_hash` = `blake3(slide_text)` 的前 16 位十六进制字符
- 风格图片: `./slides/<sid>/style.jpg`

### 6.3 Hash 计算 (`utils/hash.py`)

```python
import blake3

def compute_text_hash(text: str) -> str:
    """计算文字的 blake3 hash，返回前 16 位 hex"""
    return blake3.blake3(text.encode("utf-8")).hexdigest()[:16]
```

## 7. 异步图片生成流程

```
前端                         后端                          Gemini API
  │                           │                              │
  │  POST /{sid}/{idx}/gen    │                              │
  ├──────────────────────────►│                              │
  │                           │  创建 asyncio.Task           │
  │  { task_id: "xxx" }      │                              │
  │◄──────────────────────────┤                              │
  │                           │                              │
  │  GET /{sid}/{idx}/status  │                              │
  ├──────────────────────────►│                              │
  │  { generating: true }     │                              │
  │◄──────────────────────────┤                              │
  │                           │  读取 style.jpg + text       │
  │                           ├─────────────────────────────►│
  │                           │                              │
  │                           │  image bytes                 │
  │                           │◄─────────────────────────────┤
  │                           │                              │
  │                           │  保存图片 + 更新 outline     │
  │                           │                              │
  │  GET /{sid}/{idx}/status  │                              │
  ├──────────────────────────►│                              │
  │  { generating: false,     │                              │
  │    latest_hash: "abc" }   │                              │
  │◄──────────────────────────┤                              │
  │                           │                              │
```

前端轮询策略：
- 触发生成后，每 2 秒轮询一次 status 接口
- `generating === false` 时停止轮询，刷新图片显示

## 8. 依赖清单

### 后端 (`requirements.txt`)

```
fastapi>=0.128.0
uvicorn>=0.40.0
pyyaml>=6.0.3
blake3>=1.0.8
google-genai>=1.60.0
pydantic>=2.12.5
pydantic-settings>=2.12.0
python-multipart>=0.0.21
```

### 前端 (`package.json` 关键依赖)

```json
{
  "dependencies": {
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "zustand": "^5.0.10",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "@vitejs/plugin-react": "^5.1.2",
    "tailwindcss": "^4.1.18",
    "@tailwindcss/vite": "^4.1.18",
    "@types/react": "^19.2.3",
    "@types/react-dom": "^19.2.3"
  }
}
```

> **注意:** Tailwind CSS v4 使用 `@tailwindcss/vite` 插件，不再需要 `postcss`、`autoprefixer` 和 `tailwind.config.ts`。只需在 CSS 中 `@import "tailwindcss"` 即可。
