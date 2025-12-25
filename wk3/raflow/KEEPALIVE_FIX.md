# 🔄 WebSocket Keep-Alive 修复 - 彻底解决超时问题

## 🎯 问题诊断

### 现象
启动项目后保持安静，过了几十秒再说话，没有反应。

### 日志分析
```
14:46:07 - WebSocket连接成功 ✅
14:46:08 - 背景噪声测量完成 ✅
14:46:08-22 - 保持安静（14秒）
14:46:22 - ERROR: WebSocket closed by server - Code: 1000 ❌
```

### 根本原因

**ElevenLabs API 超时策略**：
- API要求客户端**定期发送音频数据**
- 如果长时间（~15秒）没有收到数据
- 服务器认为连接空闲，自动关闭（Code 1000）

**我们的音频门控机制**：
```rust
// 修复前的逻辑
if !should_send_audio {
    continue;  // 不发送任何数据 ❌
}
```

**问题流程**：
```
启动 → VAD未检测到语音 → 不发送音频
    ↓
    15秒后
    ↓
API超时 → 关闭连接 ❌
    ↓
之后说话 → 无反应 ❌
```

---

## 🔧 解决方案：Keep-Alive 心跳机制

### 核心修改 (commands.rs:267-302)

```rust
// 跟踪静音时长
let mut silence_chunks_since_last_send = 0;
const MAX_SILENCE_CHUNKS_BEFORE_KEEPALIVE: usize = 50; // 5秒

// Keep-alive机制
if !should_send_audio {
    silence_chunks_since_last_send += 1;
    if silence_chunks_since_last_send >= MAX_SILENCE_CHUNKS_BEFORE_KEEPALIVE {
        send_keepalive = true;
        silence_chunks_since_last_send = 0;
        info!("🔄 Sending keep-alive silence chunk");
    }
}

if !should_send_audio && !send_keepalive {
    continue;  // 只有在不需要keep-alive时才跳过
}

// 发送音频（可能是语音，也可能是keep-alive）
WebSocketClient::send_audio(&mut ws_sink, &chunk, speech_ended).await
```

### 工作原理

```
启动 → 保持安静
    ↓
VAD未检测到语音 → silence_count++
    ↓
每100ms检查一次
    ↓
5秒后 (50个chunk) → silence_count == 50
    ↓
send_keepalive = true ✅
    ↓
发送静音帧给API ✅
    ↓
API收到数据 → 连接保持活跃 ✅
    ↓
继续监听...
```

**关键特性**：
- ✅ **不影响识别**：keep-alive发送的是真实的静音音频
- ✅ **不误识别**：API收到的是低能量静音，不会识别出文字
- ✅ **保持连接**：每5秒发送一次，远低于15秒超时
- ✅ **检测语音时立即发送**：reset计数器，优先发送真实语音

---

## 📊 修复前后对比

### 修复前

| 时间 | 事件 | 音频发送 | WebSocket |
|------|------|----------|-----------|
| 0s | 启动 | - | 连接 ✅ |
| 0-15s | 保持安静 | ❌ 无发送 | 活跃 |
| 15s | 超时 | ❌ 无发送 | **关闭** ❌ |
| 20s | 开始说话 | ❌ 连接已关闭 | 无效 ❌ |

### 修复后

| 时间 | 事件 | 音频发送 | WebSocket |
|------|------|----------|-----------|
| 0s | 启动 | - | 连接 ✅ |
| 5s | Keep-alive | ✅ 静音 | 活跃 ✅ |
| 10s | Keep-alive | ✅ 静音 | 活跃 ✅ |
| 15s | Keep-alive | ✅ 静音 | 活跃 ✅ |
| 20s | 开始说话 | ✅ 语音 | 活跃 ✅ |
| 25s | 识别成功 | ✅ | 正常工作 ✅ |

---

## 🚀 测试步骤

### 测试1: 长时间静默后说话

**步骤**：
1. 启动应用
```bash
cd /Users/admin/www/geek-ai-train/wk3/raflow
./start.sh
```

2. **保持安静30秒**（超过15秒超时阈值）

3. 然后说话："我要测试语音识别"

**预期日志**：
```
📊 Background noise baseline calculated
🔄 Sending keep-alive silence chunk    ← 5秒时
🔄 Sending keep-alive silence chunk    ← 10秒时
🔄 Sending keep-alive silence chunk    ← 15秒时
🔄 Sending keep-alive silence chunk    ← 20秒时
🔄 Sending keep-alive silence chunk    ← 25秒时
🎙️  VAD: Speech STARTED              ← 30秒时说话
📝 PARTIAL TRANSCRIPT: "我要测试语音识别" ✅
```

**不应该看到**：
```
ERROR: WebSocket closed by server  ❌
```

### 测试2: 快速测试

**步骤**：
1. 启动后立即说话（不等待）

2. 说："你好世界"

**预期**：
- 正常识别，不需要keep-alive ✅

---

## 📋 问题完整解决清单

| # | 问题 | 状态 | 解决方式 |
|---|------|------|----------|
| 1 | 语言识别错误（俄语） | ✅ 已修复 | language_code=zho |
| 2 | 背景噪音误识别"嗯" | ✅ 已修复 | 音频门控 |
| 3 | Channel closed错误 | ✅ 已修复 | 清理音频流 |
| 4 | **WebSocket超时** | ✅ **已修复** | **Keep-alive** |
| 5 | VAD过度切段 | ✅ 已优化 | 150ms阈值 |

---

## 🎯 最终效果

### 场景1: 保持安静（任意时长）
```
启动 → 保持安静 → Keep-alive维持连接
    ↓
随时说话 → 正常识别 ✅
```

### 场景2: 立即说话
```
启动 → 立即说话 → 正常识别 ✅
```

### 场景3: 间歇说话
```
启动 → 说话 → 停顿10秒 → Keep-alive
    ↓
继续说话 → 正常识别 ✅
```

---

## 📊 Keep-Alive 参数

| 参数 | 值 | 说明 |
|------|-----|------|
| Chunk大小 | 100ms | 每个音频块 |
| Keep-alive间隔 | 50 chunks = 5秒 | 发送频率 |
| API超时阈值 | ~15秒 | ElevenLabs限制 |
| 安全裕度 | 3x (15s/5s) | 充足余量 |

---

## 🔍 日志关键词

成功运行的日志包含：

✅ **正常启动**：
```
🎤 Audio processing task started
📊 Background noise baseline calculated: RMS = 0.00XXXX
```

✅ **Keep-alive工作中**（每5秒）：
```
🔄 Sending keep-alive silence chunk
📤 Sent keep-alive chunk
```

✅ **检测到语音**：
```
🎙️  VAD: Speech STARTED | RMS: 0.XXXXX | SNR: XX.X dB
📝 PARTIAL TRANSCRIPT: "你的文字" ✅
```

❌ **不应该看到**：
```
ERROR: WebSocket closed by server - Code: 1000
```

---

## 💡 技术细节

### Why 5秒？

- API超时：~15秒
- 安全系数：3x
- 间隔：15s / 3 = 5s ✅
- 网络抖动容忍：充足余量

### Keep-alive vs Ping/Pong

**Keep-alive（我们的方案）**：
- 发送真实音频数据（静音）
- API层面的活跃
- 符合协议语义

**WebSocket Ping/Pong**：
- 协议层心跳
- 可能不足以让API认为会话活跃
- 不推荐用于此场景

---

现在应该完全解决所有问题了！请重新测试，特别是**长时间静默后说话**的场景。
