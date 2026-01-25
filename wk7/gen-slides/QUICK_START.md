# GenSlides - 快速开始指南

## 1. 安装依赖

### 后端

```bash
cd backend
make install
```

### 前端

```bash
cd frontend
make install
```

## 2. 配置图像生成服务

复制示例配置文件：

```bash
cp .env.example .env
```

### 选项 A: 使用通义千问（推荐）

编辑 `.env`:

```env
IMAGE_GENERATOR_TYPE=qianwen
QIANWEN_API_KEY=sk-your-dashscope-api-key
QIANWEN_IMAGE_MODEL=wanx2-v1
```

**获取 API Key**:
1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 创建 API-KEY
3. 复制到 `.env` 文件

**模型选择**:
- `wanx-v1`: 通义万相 1.0（基础版）
- `wanx2-v1`: 通义万相 2.0（支持风格参考，更高质量）

### 选项 B: 使用 Google Gemini

编辑 `.env`:

```env
IMAGE_GENERATOR_TYPE=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation
```

**获取 API Key**:
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 创建 API Key
3. 复制到 `.env` 文件

**注意**: Gemini 免费版有配额限制

## 3. 启动服务

### 启动后端

```bash
cd backend
make dev
```

服务将在 `http://localhost:8000` 启动

### 启动前端

打开新终端：

```bash
cd frontend
make dev
```

服务将在 `http://localhost:5173` 启动

## 4. 访问应用

打开浏览器访问: **http://localhost:5173/demo-project**

## 5. 使用流程

### 5.1 设置风格

1. 首次访问会弹出"设置风格"对话框
2. 输入风格描述，例如：
   - "简约商务风格，蓝色调"
   - "科技感强的渐变背景"
   - "水彩画风格，温暖色调"
3. 点击"生成风格图片"
4. 从两个选项中选择一个

### 5.2 生成幻灯片图片

1. 点击左侧的幻灯片卡片选中
2. 右侧会显示幻灯片内容
3. 点击"生成图片"按钮
4. 等待生成完成（约 5-10 秒）
5. 图片生成后自动显示

### 5.3 编辑幻灯片

1. 双击幻灯片卡片
2. 修改文字
3. 点击外部或按 Enter 保存
4. 重新生成图片（可选）

### 5.4 排序幻灯片

1. 按住幻灯片卡片
2. 拖拽到目标位置
3. 松开鼠标
4. 自动保存顺序

### 5.5 演示播放

1. 点击右上角"播放"按钮
2. 进入全屏演示模式
3. 使用键盘控制：
   - `→`: 下一张
   - `←`: 上一张
   - `ESC`: 退出演示

## 6. 切换图像生成服务

如果想切换到其他服务：

1. 编辑 `.env` 文件
2. 修改 `IMAGE_GENERATOR_TYPE=qianwen` 或 `gemini`
3. 重启后端服务 (`make dev`)

## 7. 故障排除

### 图片生成失败

**症状**: 显示蓝色占位图片

**可能原因**:
- API Key 未配置或无效
- API 配额已用完
- 网络连接问题

**解决方法**:
1. 检查 `.env` 中的 API Key 是否正确
2. 查看后端日志是否有错误信息
3. 尝试切换到另一个图像生成服务

### 后端启动失败

**症状**: `make dev` 报错

**解决方法**:
```bash
cd backend
make clean      # 清理环境
make install    # 重新安装
make dev        # 启动服务
```

### 前端无法访问

**症状**: 404 或连接拒绝

**解决方法**:
1. 确保后端已启动 (`http://localhost:8000/health` 返回 OK)
2. 访问 URL 必须包含项目 ID: `http://localhost:5173/demo-project`
3. 检查浏览器控制台错误信息

## 8. 配额管理

### Gemini API
- 免费版: 有限配额
- 查看用量: https://ai.dev/rate-limit
- 升级到付费可获得更多配额

### Qianwen API
- 新用户赠送免费额度
- 查看用量: [百炼控制台](https://bailian.console.aliyun.com/)
- 按需充值或订阅

## 9. 高级配置

### 自定义模型

编辑 `.env`:

```env
# 使用其他 Qianwen 模型
QIANWEN_IMAGE_MODEL=wanx2-v1

# 或使用其他 Gemini 模型
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation
```

### 性能优化

- 图片生成是异步的，可以同时生成多张
- 相同文字的幻灯片会复用已生成的图片（基于 BLAKE3 哈希）
- 占位图片会自动缓存

## 10. 开发文档

- [架构文档](IMAGE_GENERATION_ARCHITECTURE.md) - 图像生成架构设计
- [后端文档](backend/BACKEND_README.md) - FastAPI 后端详细说明
- [前端文档](frontend/README.md) - React 前端详细说明

## 需要帮助？

如果遇到问题，请查看：
1. 后端日志输出
2. 浏览器控制台错误
3. 网络请求状态（开发者工具 Network 标签）
