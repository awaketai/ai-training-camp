# GenSlides 产品需求文档 (PRD)

## 概述

GenSlides 是一个本地运行的单页应用，用于生成和展示 AI 图片幻灯片。用户可以编辑文字内容，系统会使用 Gemini API 自动生成对应的图片，并支持全屏走马灯播放。

## 目标

1. **支持简报的 slides 生成，纯视觉方案** - 用户只需输入文字，系统自动生成视觉化的幻灯片
2. **图片生成可以并行处理** - slides 之间互不影响，当重新生成发生后，展示最新的一张图片
3. **支持走马灯播放** - 展示当前 slides 的全屏轮播效果

## 非目标

1. 导出成 pptx
2. 不使用数据库，不需要权限管理，整个 app 运行在本地

## 技术方案

### 技术栈

| 层级 | 技术选型 |
|------|----------|
| 后端 | Python + FastAPI + Google AI SDK (Gemini API) |
| 前端 | TypeScript + Tailwind CSS + Zustand |
| 存储 | 本地文件系统 |

### 文件存储结构

```
./slides/
├── <sid>/
│   ├── outline.yml          # 包含所有文字信息和风格图片引用
│   ├── style.jpg             # 用户选择的风格参考图片
│   └── images/
│       └── <blake3_hash>.jpg # 每个 slide 下面的某张图片
```

**outline.yml 结构:**
```yaml
style_image: style.jpg        # 风格参考图片路径（可选，首次打开时设置）
slides:
  - text: "Slide 1 的文字内容"
    current_image: "<blake3_hash>"  # 当前展示的图片 hash
  - text: "Slide 2 的文字内容"
    current_image: "<blake3_hash>"
```

### 图片生成与缓存策略

- 图片根据当前 slide 文字生成，保存路径为: `<sid>/images/<文字blake3>.jpg`
- 一个 slide 可以保存多张图片
- **风格参考**: 生成图片时，将 `style.jpg` 作为风格参考图片传给 Gemini API
- **重用策略**: 模型版本 + 文字 blake3 hash 一致的图片会重用
- **降级策略**: 如果新图片尚未生成完成，展示最新的一张图片，直到有新版本
- 用户可以切换预览不同版本的图片

## 用户界面设计

### 页面布局

```
┌──────────────────────────────────────────────────────────────────┐
│  Logo: GenSlides                                   [播放] 按钮    │
├───────────────────┬──────────────────────────────────────────────┤
│                   │                                              │
│  ┌─────────────┐  │                                              │
│  │   [缩略图]  │  │                                              │
│  │   Slide 1   │  │                                              │
│  │   文字内容  │  │                                              │
│  └─────────────┘  │         ┌────────────────────────┐           │
│                   │         │                        │           │
│  ┌─────────────┐  │         │                        │           │
│  │   [缩略图]  │  │         │    当前选中 Slide      │           │
│  │   Slide 2   │  │         │      大图预览区        │           │
│  │   文字内容  │  │         │                        │           │
│  └─────────────┘  │         │                        │           │
│                   │         └────────────────────────┘           │
│       ...         │                                              │
│                   │                                              │
│  ┌─────────────┐  │                                              │
│  │   [缩略图]  │  │                                              │
│  │   Slide N   │  │                                              │
│  │   文字内容  │  │                                              │
│  └─────────────┘  │                                              │
│                   │                                              │
│   (左侧边栏)      │              (右侧主内容区)                   │
└───────────────────┴──────────────────────────────────────────────┘
```

**布局说明:**
- **左侧边栏**: 垂直滚动的 slide 缩略图列表，每个卡片显示小图和文字
- **右侧主区域**: 当前选中 slide 的大图预览，居中显示

### URL 路由

- 访问地址: `http://localhost:3000/<sid>`
- 示例: `http://localhost:3000/hello-world` -> 加载 `./slides/hello-world` 目录下的 slides

### 交互设计

| 操作 | 行为 |
|------|------|
| 单击 slide | 选中该 slide，使其成为当前活动的 slide |
| 双击 slide | 进入编辑模式，可修改 slide 的文字内容 |
| 拖拽 slide | 选中并拖拽 slide 卡片可改变其在列表中的顺序 |
| 点击播放按钮 | 全屏从当前选中的 slide 开始播放走马灯 |
| ESC 键 | 退出全屏播放模式 |

### Slide 卡片展示（左侧边栏）

- 每个 slide 有一个唯一的 sid 在图片下面标注
- 缩略图显示 slide 的生成图片（小尺寸）
- 文字内容显示在缩略图下方
- 选中状态有视觉高亮效果（边框或背景色）
- 支持垂直滚动浏览所有 slides
- **支持拖拽排序**: 用户可以拖拽 slide 卡片改变顺序，拖拽时显示视觉反馈

### 预览区域（右侧主区域）

- 展示当前选中 slide 的大尺寸图片
- 图片居中显示，保持原比例
- 如果有多个版本的图片，可切换预览
- **生成按钮**: 当文字内容变化后，如果没有对应文本 hash 的图片，在预览图片下方显示「生成图片」按钮，用户点击后触发图片生成

### 风格设置弹窗（首次打开）

当首次打开一个 slides 项目且没有风格图片时，显示风格设置弹窗：

```
┌────────────────────────────────────────────────┐
│          设置幻灯片风格                         │
├────────────────────────────────────────────────┤
│                                                │
│  请输入风格描述文字：                           │
│  ┌──────────────────────────────────────────┐  │
│  │ 例如：简约商务风格、水彩插画风格...        │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│                [生成风格图片]                   │
│                                                │
│  ┌─────────────────┐  ┌─────────────────┐     │
│  │                 │  │                 │     │
│  │    风格 A       │  │    风格 B       │     │
│  │                 │  │                 │     │
│  └─────────────────┘  └─────────────────┘     │
│       [选择]              [选择]               │
│                                                │
└────────────────────────────────────────────────┘
```

**流程:**
1. 用户输入风格描述文字
2. 点击「生成风格图片」按钮
3. 系统调用 Gemini API 生成两张风格参考图片
4. 用户从两张图片中选择一张作为风格参考
5. 选中的图片保存为 `style.jpg`，并记录到 `outline.yml`
6. 后续生成 slide 图片时，将此风格图片作为参考

## API 设计

### 后端接口

#### 获取 slides 列表
```
GET /api/slides/<sid>
Response: {
  style_image: string | null,  # 风格图片路径
  slides: [{ id, text, images: [hash1, hash2, ...], current_image: string }]
}
```

#### 更新 slide 文字
```
PUT /api/slides/<sid>/<slide_index>
Body: { text: string }
Response: { success: boolean, has_image: boolean }
```

#### 更新 slides 顺序（拖拽排序）
```
PUT /api/slides/<sid>/reorder
Body: { order: [slide_index1, slide_index2, ...] }
Response: { success: boolean }
```

#### 获取图片
```
GET /api/slides/<sid>/images/<hash>.jpg
Response: image/jpeg
```

#### 生成图片 (触发异步生成)
```
POST /api/slides/<sid>/<slide_index>/generate
Response: { taskId: string }
```

#### 查询生成状态
```
GET /api/slides/<sid>/<slide_index>/status
Response: { generating: boolean, latestHash: string }
```

#### 生成风格图片
```
POST /api/slides/<sid>/style/generate
Body: { description: string }
Response: { images: [base64_image_a, base64_image_b] }
```

#### 选择风格图片
```
POST /api/slides/<sid>/style/select
Body: { image_index: 0 | 1 }
Response: { success: boolean, style_image: string }
```

## 前端状态管理 (Zustand)

```typescript
interface SlidesStore {
  // 状态
  slides: Slide[];
  currentSlideIndex: number;
  isPlaying: boolean;
  isFullscreen: boolean;
  styleImage: string | null;
  showStylePopup: boolean;
  styleOptions: [string, string] | null;  // 两张待选风格图片

  // 操作
  loadSlides: (sid: string) => Promise<void>;
  selectSlide: (index: number) => void;
  updateSlideText: (index: number, text: string) => Promise<void>;
  reorderSlides: (fromIndex: number, toIndex: number) => Promise<void>;
  generateImage: (index: number) => Promise<void>;
  startPlayback: () => void;
  stopPlayback: () => void;

  // 风格相关
  generateStyleOptions: (description: string) => Promise<void>;
  selectStyle: (optionIndex: 0 | 1) => Promise<void>;
}
```

## 走马灯播放模式

- 全屏展示当前选中的 slide 图片
- 自动轮播到下一张（可配置间隔时间，默认 5 秒）
- 支持键盘左右箭头手动切换
- 循环播放
- ESC 或点击退出全屏

## 项目结构

```
./
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── routes/
│   │   └── slides.py        # slides 相关路由
│   ├── services/
│   │   ├── image_gen.py     # 图片生成服务 (Gemini API)
│   │   └── storage.py       # 文件存储服务
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx         # 顶部导航栏（Logo + 播放按钮）
│   │   │   ├── Sidebar.tsx        # 左侧边栏容器（支持拖拽排序）
│   │   │   ├── SlideCard.tsx      # 侧边栏中的 slide 缩略图卡片
│   │   │   ├── PreviewArea.tsx    # 右侧大图预览区域（含生成按钮）
│   │   │   ├── StylePopup.tsx     # 风格设置弹窗
│   │   │   └── Carousel.tsx       # 全屏走马灯播放组件
│   │   ├── stores/
│   │   │   └── slidesStore.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── package.json
│   └── tsconfig.json
├── slides/                   # slides 数据目录
│   └── hello-world/          # 示例项目
│       ├── outline.yml
│       └── images/
└── README.md
```

## 开发里程碑

### Phase 1: 基础框架
- [ ] 搭建 FastAPI 后端框架
- [ ] 搭建 React + TypeScript 前端框架
- [ ] 实现文件存储读写

### Phase 2: 核心功能
- [ ] 实现 slides 列表展示
- [ ] 实现 slide 文字编辑
- [ ] 实现 slide 拖拽排序
- [ ] 集成 Gemini API 图片生成
- [ ] 实现生成按钮（文字变更时显示）

### Phase 3: 风格系统
- [ ] 实现风格设置弹窗
- [ ] 生成两张风格候选图片
- [ ] 保存用户选择的风格图片
- [ ] 图片生成时参考风格图片

### Phase 4: 播放功能
- [ ] 实现全屏走马灯播放
- [ ] 实现键盘控制
- [ ] 优化播放体验

### Phase 5: 优化完善
- [ ] 图片缓存与重用
- [ ] 加载状态与错误处理
- [ ] UI 美化与响应式设计
