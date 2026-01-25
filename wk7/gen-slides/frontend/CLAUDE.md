# Frontend CLAUDE.md - GenSlides 前端开发规范

## 技术栈

- React 19.2+
- TypeScript 5.9+
- Vite 7.3+
- Tailwind CSS 4.1+ (via @tailwindcss/vite)
- Zustand 5.0+
- @dnd-kit/core 6.3+ / @dnd-kit/sortable 10.0+

## 架构设计原则

### SOLID

- **单一职责 (SRP)**: 每个模块只负责一件事
  - `api/` 只做 HTTP 请求封装，不包含 UI 逻辑
  - `stores/` 只做状态管理和业务逻辑编排
  - `components/` 只做 UI 渲染和事件绑定
  - `types/` 只做类型定义
- **开闭原则 (OCP)**: 新增组件不修改已有组件代码
- **里氏替换 (LSP)**: 组件通过 Props 接口定义行为约束
- **接口隔离 (ISP)**: Props 接口最小化，每个组件只接收它需要的数据
- **依赖反转 (DIP)**: 组件通过 Props 回调和 store hooks 获取依赖，不直接导入具体实现

### YAGNI

- 不引入路由库（React Router），单页应用从 URL path 提取 sid 即可
- 不引入表单库，slide 文字编辑只需 textarea + onChange
- 不引入 CSS-in-JS，Tailwind utility classes 足够
- 不引入国际化库，固定中文界面
- 不引入测试框架，除非明确需要

### KISS

- 状态管理使用单一 Zustand store，不过度拆分
- API 调用使用原生 fetch 封装，不引入 axios 或 react-query
- 拖拽使用 @dnd-kit，不自行实现
- 全屏使用浏览器 Fullscreen API，不引入第三方库

## 代码组织结构

```
frontend/src/
├── main.tsx            # React 根挂载
├── App.tsx             # 顶层布局、sid 提取、StylePopup 控制
├── api/                # API 层 - 纯函数，无状态
│   ├── client.ts       # fetch 封装（baseUrl、错误处理）
│   ├── slides.ts       # slides 相关请求
│   ├── images.ts       # 图片相关请求
│   └── style.ts        # 风格相关请求
├── components/         # UI 组件 - 纯展示 + 事件绑定
│   ├── Header.tsx      # Logo + 播放按钮
│   ├── Sidebar.tsx     # 左侧列表容器（DndContext）
│   ├── SlideCard.tsx   # 单个 slide 卡片（可拖拽、可编辑）
│   ├── PreviewArea.tsx # 右侧大图预览 + 生成按钮
│   ├── StylePopup.tsx  # 风格设置弹窗
│   └── Carousel.tsx    # 全屏走马灯播放
├── stores/             # 状态管理 - 业务逻辑中枢
│   └── slidesStore.ts  # 全局状态 + actions
├── types/              # 类型定义
│   └── index.ts        # 所有 interface/type
└── styles/
    └── globals.css     # @import "tailwindcss" + 全局样式
```

### 数据流向

```
用户交互 → Component (事件) → Store (action) → API (fetch) → 后端
                                    ↓
                              更新 state
                                    ↓
                            Component (re-render)
```

## TypeScript Best Practices

### 类型安全

- 所有 Props 使用 `interface` 定义
- API 响应使用明确的 Response 类型，不用 `any`
- Store 状态和 actions 完整类型化
- 事件处理函数明确参数类型

```typescript
interface SlideCardProps {
  slide: Slide;
  isSelected: boolean;
  onSelect: () => void;
  onTextUpdate: (text: string) => void;
}
```

### 类型定义规范

- 实体类型（Slide、SlidesData）放在 `types/index.ts`
- Request/Response 类型放在 `types/index.ts`
- 组件 Props 在组件文件内定义
- 不导出不需要共享的类型

### 严格模式

- `tsconfig.json` 开启 `strict: true`
- 不使用 `as` 类型断言，除非绝对必要
- 不使用 `!` 非空断言
- 使用 `unknown` 替代 `any` 处理未知类型

## React Best Practices

### 组件设计

- 使用函数组件 + hooks
- Props 向下传递，事件向上冒泡
- 组件保持纯粹：相同 props → 相同输出
- 避免在组件内直接调用 API，通过 store actions 调用

### 状态管理

- 全局状态放 Zustand store（slides 列表、当前选中、播放状态等）
- 局部 UI 状态放组件内 `useState`（编辑模式、输入值等）
- 派生数据通过 selector 或计算获得，不存冗余状态

```typescript
// Zustand selector - 只订阅需要的状态
const currentSlide = useSlidesStore((s) => s.slides[s.currentSlideIndex]);
```

### 性能优化

- 使用细粒度的 Zustand selector 避免不必要的 re-render
- 列表渲染使用稳定的 `key`（slide index 或 id）
- 图片使用 `loading="lazy"` 延迟加载
- 大图切换使用 CSS transition 而非重新挂载

### Hooks 使用

- `useEffect` 只用于副作用（加载数据、事件监听）
- 清理函数中移除事件监听、取消轮询
- 依赖数组准确，不使用 `// eslint-disable-next-line`

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onExit();
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [onExit]);
```

## Tailwind CSS v4 规范

### 配置

- 使用 `@tailwindcss/vite` 插件，不需要 postcss
- 在 `globals.css` 中 `@import "tailwindcss"`
- 不使用 `tailwind.config.ts`，通过 CSS 变量自定义主题

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
}
```

### 使用规范

- 优先使用 utility classes，避免自定义 CSS
- 响应式前缀：`sm:` `md:` `lg:`
- 状态变体：`hover:` `focus:` `active:` `disabled:`
- 组件间距和布局使用 flex/grid utility

## 并发处理

### 轮询机制

- 图片生成触发后，使用 `setInterval` 每 2 秒轮询状态
- 组件卸载时清除 interval（useEffect cleanup）
- 生成完成后停止轮询并刷新图片

```typescript
const pollImageStatus = async (index: number) => {
  const intervalId = setInterval(async () => {
    const status = await imagesApi.getImageStatus(sid, index);
    if (!status.generating) {
      clearInterval(intervalId);
      // 刷新 slide 数据
      await loadSlides(sid);
    }
  }, 2000);
  return intervalId;
};
```

### 并发请求

- 多个 slide 的图片生成互不干扰，可并行触发
- 拖拽排序和文字编辑为串行操作，等待前一个完成
- 使用 `generatingSlides: Set<number>` 追踪生成中的 slides

### 防抖

- 文字编辑使用 `onBlur` 触发保存，不使用 `onChange` 实时保存
- 避免频繁的 API 调用

## 错误处理

### API 错误处理

- `api/client.ts` 统一处理 HTTP 错误
- 非 2xx 响应抛出包含 status 和 detail 的 Error
- Store actions 捕获错误并更新 UI 状态

```typescript
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(res.status, error.detail);
  }
  return res.json();
}
```

### 错误类型

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`API Error ${status}: ${detail}`);
  }
}
```

### UI 错误展示

- 网络错误：在操作区域显示 inline 错误提示
- 生成失败：在预览区域显示错误信息和重试按钮
- 不使用全局 toast/notification 系统（YAGNI）

### 边界情况

- 图片加载失败：显示占位图 + 错误提示
- slides 列表为空：显示引导提示
- 风格图片未设置：自动弹出 StylePopup
- 网络断开：操作按钮 disabled + 错误提示

## 日志处理

### 开发环境

- 使用 `console.error` 记录 API 错误（仅开发环境）
- 使用 `console.warn` 记录非致命性问题
- 生产构建时通过 vite define 移除 debug 日志

```typescript
if (import.meta.env.DEV) {
  console.debug("[SlidesStore] loadSlides:", sid);
}
```

### 日志规范

- API 层：记录请求失败的 URL 和 status
- Store 层：记录 action 执行和错误
- 不记录敏感信息（API key、base64 图片数据）

## 启动与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# -> http://localhost:5173/hello-world

# 构建生产版本
npm run build
```

## Vite 配置要点

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

> **注意:** 开发环境通过 Vite proxy 转发 `/api` 请求到后端，`api/client.ts` 中 BASE_URL 设为空字符串或 `/api`。
