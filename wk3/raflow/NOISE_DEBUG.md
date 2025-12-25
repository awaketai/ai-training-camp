# 噪音问题确认和排查步骤

## 🚨 问题确认

**现象**: 启动应用后，未说话就识别出"嗯"字
**结论**: **明确存在噪音问题或VAD误触发**

---

## 🔍 测试步骤

### 步骤1: 重新启动应用

```bash
cd /Users/admin/www/geek-ai-train/wk3/raflow
./start.sh
```

### 步骤2: 保持安静3-5秒

启动后**不要说话**，让系统测量背景噪声。

### 步骤3: 查看启动日志

**重要**: 从启动开始，复制**所有日志内容**（包括前3-5秒），不要只复制识别结果。

应该包含以下内容：

#### A. 背景噪声测量（启动后3秒）
```
📊 Background noise baseline calculated: RMS = 0.00XXXX
✅ Low background noise - good recording environment
```
或
```
⚠️  High background noise detected!
```

#### B. 单声道音频分析（每2秒一次）
```
🎤 Mono Audio Analysis [packet #100]:
  RMS: 0.XXXXXX | Peak: 0.XXXXXX
  ✅ Normal signal level
```

#### C. VAD状态转换（如果误触发）
```
🎙️  VAD: Speech STARTED | RMS: 0.XXXXXX | Audio Level: 0.XXXX | SNR: XX.X dB
⚠️  Low SNR! Background noise may interfere with recognition.
```

#### D. 识别结果
```
📝 PARTIAL TRANSCRIPT: "嗯"  ⬅️ 误触发的结果
```

---

## ❓ 如果没有看到诊断日志

如果你**没有看到** A、B、C 这些日志，说明：

### 可能原因1: 日志级别过滤

检查终端输出，看是否有其他INFO级别的日志被显示。

### 可能原因2: 日志被截断

终端可能只显示最新的日志。请从**启动的第一行**开始复制，或者将日志重定向到文件：

```bash
cd /Users/admin/www/geek-ai-train/wk3/raflow
./start.sh 2>&1 | tee app.log
```

这样所有日志会保存到 `app.log` 文件中。

---

## 📊 问题诊断清单

基于你提供的完整日志，我需要确认：

### 1. 背景噪声水平
- [ ] RMS值是多少？
- [ ] 是否显示"High background noise"警告？

### 2. VAD误触发情况
- [ ] 是否看到"Speech STARTED"（在你说话之前）？
- [ ] SNR值是多少？
- [ ] 触发时的RMS值是多少？

### 3. 环境信息
- [ ] 周围是否有风扇、空调、电脑风扇噪音？
- [ ] 麦克风是否离噪音源很近？
- [ ] 系统麦克风音量设置是多少？（系统设置 → 声音 → 输入）

---

## 🛠️ 临时解决方案

如果噪音问题严重，可以先尝试：

### 方案1: 提高VAD阈值

编辑 `src-tauri/src/audio/vad.rs:98`：

```rust
Self::new(0.05)  // 从0.03提高到0.05
```

### 方案2: 降低系统麦克风音量

1. 打开 **系统设置 → 声音 → 输入**
2. 将输入音量降低到 **50%左右**
3. 重新测试

### 方案3: 改善录音环境

- 关闭风扇、空调
- 关闭电脑其他程序（减少CPU负载，降低风扇噪音）
- 使用耳机麦克风（而非内置麦克风）

---

## 🎯 下一步

请执行以上步骤，并提供：

1. **完整的启动日志**（从第一行开始，包括背景噪声测量）
2. **是否看到VAD误触发**（Speech STARTED在你说话之前）
3. **系统麦克风音量设置**（截图或百分比）
4. **周围环境噪音情况**（安静 / 有风扇等）

这样我才能精确诊断问题并提供针对性的解决方案。
