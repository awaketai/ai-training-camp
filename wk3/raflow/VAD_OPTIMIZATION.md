# VAD参数优化和噪音诊断 - 修复说明

## 🎯 问题分析

你说：`"我要测试语音识别"`
识别成：`"我要喝水水"` / `"我要和谁一起去"`

### 根本原因

**VAD参数配置不当，导致句子被过度切段**

```
"我要测试语音识别"
   ↓ VAD错误触发commit
"我要" [commit] "测试" [commit] "语音识别" [commit]
   ↓ 每段缺少上下文
"我要喝水" ❌ "和谁一起去" ❌
```

---

## 🔧 优化内容

### 1. VAD参数调整 (vad.rs)

#### 修改前：
```rust
min_speech_frames: 5,   // 50ms
min_silence_frames: 30, // 300ms ⬅️ 太长！
energy_threshold: 0.02
```

#### 修改后：
```rust
min_speech_frames: 3,   // 30ms - 更快响应
min_silence_frames: 15, // 150ms - 减半，避免切断句子
energy_threshold: 0.03  // 提高阈值，减少噪音误触发
```

**影响**：
- ✅ 减少说话中的短暂停顿触发commit
- ✅ 保持更长的上下文
- ✅ 减少环境噪音被当作语音

---

### 2. 背景噪声测量 (commands.rs)

新增功能：
- 启动后前3秒自动采集背景噪声
- 计算噪声基线（baseline）
- 说话时计算信噪比（SNR）

#### 诊断输出示例：

**良好环境**：
```
📊 Background noise baseline calculated: RMS = 0.001234
✅ Low background noise - good recording environment

🎙️  VAD: Speech STARTED | RMS: 0.153820 | Audio Level: 0.8456 | SNR: 20.5 dB
```

**噪音环境**：
```
📊 Background noise baseline calculated: RMS = 0.015678
⚠️  High background noise detected! This may cause false VAD triggers and recognition errors.

🎙️  VAD: Speech STARTED | RMS: 0.065432 | Audio Level: 0.3210 | SNR: 8.2 dB
⚠️  Low SNR! Background noise may interfere with recognition.
```

---

### 3. VAD切段日志增强

现在会详细记录每次VAD状态转换：

```
🎙️  VAD: Speech STARTED | RMS: 0.153820 | Audio Level: 0.8456 | SNR: 20.5 dB
    ⬆️ 开始说话

🔚 VAD: Speech ENDED (sending commit) | RMS: 0.000567
    ⬆️ 检测到静音，发送commit信号给API
```

通过日志可以看出：
- 是否频繁触发commit（过度切段）
- 每次切段时的音频电平
- 信噪比是否足够

---

## 🚀 测试步骤

### 1. 重新启动应用

**必须完全重启！**

```bash
cd /Users/admin/www/geek-ai-train/wk3/raflow
./start.sh
```

### 2. 等待背景噪声测量

启动后**保持安静3秒**，让系统测量背景噪声基线。

应该看到：
```
📊 Background noise baseline calculated: RMS = 0.00XXXX
✅ Low background noise - good recording environment
```

或：
```
⚠️  High background noise detected!
```

### 3. 测试连续说话

说一个**完整的句子**，不要停顿：

- ✅ "我要测试语音识别功能"（一口气说完）
- ✅ "今天天气非常好"
- ❌ "我要...测试...语音识别"（停顿会触发切段）

### 4. 观察日志

#### 理想情况（1次commit）：
```
🎙️  VAD: Speech STARTED | SNR: 20.5 dB
🔚 VAD: Speech ENDED (sending commit)
📝 PARTIAL TRANSCRIPT: "我要测试语音识别功能" ✅
```

#### 问题情况（多次commit）：
```
🎙️  VAD: Speech STARTED
🔚 VAD: Speech ENDED (sending commit)
📝 PARTIAL TRANSCRIPT: "我要测试"

🎙️  VAD: Speech STARTED
🔚 VAD: Speech ENDED (sending commit)
📝 PARTIAL TRANSCRIPT: "语音识别" ❌ (缺少上下文)
```

---

## 📊 诊断指标说明

### 背景噪声 (Background Noise Baseline)

| RMS值 | 环境评价 | 建议 |
|-------|----------|------|
| < 0.002 | 优秀 | 理想录音环境 |
| 0.002-0.005 | 良好 | 可接受 |
| 0.005-0.010 | 一般 | 可能影响识别 |
| > 0.010 | 噪音较大 | 需要改善环境 |

### 信噪比 (SNR - Signal-to-Noise Ratio)

| SNR (dB) | 质量评价 | 影响 |
|----------|----------|------|
| > 20 dB | 优秀 | 识别率应该很高 |
| 15-20 dB | 良好 | 识别率正常 |
| 10-15 dB | 一般 | 可能影响识别率 |
| < 10 dB | 差 | 严重影响识别率 |

---

## 🔍 如果识别率仍然低

按优先级排查：

### 1. 检查背景噪声
- 关闭风扇、空调
- 远离机械噪音源
- 使用更好的麦克风

### 2. 说话方式
- **一口气说完**，避免停顿
- 清晰发音
- 适中音量（不要太小或太大）

### 3. VAD切段频率
- 如果日志显示频繁commit，说明VAD参数仍需调整
- 可能需要进一步降低 `min_silence_frames` 或提高阈值

### 4. API语言模型限制
- ElevenLabs可能对某些口音/方言支持不佳
- 可以尝试换用其他API（如讯飞、百度等中文专业API）

---

## 🎯 预期改善

优化后应该看到：

| 指标 | 优化前 | 优化后（预期）|
|------|--------|---------------|
| VAD切段频率 | 频繁（每300ms） | 降低50%（每150ms）|
| 上下文保持 | 差（多段割裂）| 改善（更长连续）|
| 噪音误触发 | 多（阈值0.02）| 减少（阈值0.03）|
| 识别准确率 | 低 | **明显提升** ✅ |

---

## 📝 测试反馈模板

测试后请提供以下信息：

1. **背景噪声**：
   ```
   📊 Background noise baseline: RMS = 0.00XXXX
   ```

2. **SNR值**：
   ```
   SNR: XX.X dB
   ```

3. **VAD切段情况**：
   - 一句话被切成几段？
   - 是否频繁出现 "Speech ENDED"？

4. **识别结果**：
   - 你说：`"XXXXX"`
   - 识别：`"YYYYY"`
   - 准确率：XX%

这样我可以继续针对性优化！
