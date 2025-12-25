# 🎯 语音识别错误率高的根本原因 - 已找到并修复

## 问题诊断结果

### ❌ 主要问题：语言检测错误

**现象**：
- 用户说中文，API识别成俄语
- 转写结果："Лейджи" (西里尔字母)

**根本原因**：
WebSocket连接使用了**自动语言检测**，但API误判了语言。

### 日志证据

```
🔧 Model: scribe_v2_realtime, Language: zh (Chinese)
Connecting to: ...?model_id=scribe_v2_realtime
                                              ⬆️ 缺少 language_code 参数！

📝 PARTIAL TRANSCRIPT: "Лейджи"  ⬅️ 识别成俄语！
```

### ✅ 已排除的问题

| 问题 | 状态 | 原因 |
|------|------|------|
| 立体声相位抵消 | ✅ 已排除 | 麦克风是单声道 (Input Channels: 1) |
| 音频电平过低 | ✅ 已排除 | 说话时RMS: 0.15, Peak: 0.23 (正常) |
| 采样率转换 | ✅ 正常 | 44.1kHz → 16kHz 已正确实现 |
| VAD检测 | ✅ 正常 | 正确检测到语音开始和结束 |

---

## ✅ 修复方案

### 修改内容

**文件1**: `src-tauri/src/network/websocket.rs:81`

```diff
- let url = format!("{}?model_id=scribe_v2_realtime", self.url);
+ let url = format!("{}?model_id=scribe_v2_realtime&language_code=zho", self.url);
```

**文件2**: `src-tauri/src/commands.rs:118`

```diff
- info!("🔧 Model: scribe_v2_realtime, Language: zh (Chinese)");
+ info!("🔧 Model: scribe_v2_realtime, Language: zho (Mandarin Chinese - explicitly specified)");
```

### 语言代码说明

ElevenLabs API 支持的中文语言代码：

| 代码 | 语言 | 适用场景 |
|------|------|----------|
| `zho` | 普通话 (Mandarin) | **推荐** - 标准中文 |
| `yue` | 粤语 (Cantonese) | 香港、广东地区 |
| `nan` | 闽南语 (Hokkien) | 台湾、福建地区 |

当前配置使用 `zho` (标准普通话)。

---

## 🚀 测试步骤

### 1. 重新启动应用

**重要**: 必须完全重启才能生效！

```bash
cd /Users/admin/www/geek-ai-train/wk3/raflow
./start.sh
```

### 2. 验证连接日志

启动后应该看到：

```
🔧 Model: scribe_v2_realtime, Language: zho (Mandarin Chinese - explicitly specified)
Connecting to: ...?model_id=scribe_v2_realtime&language_code=zho
                                              ⬆️ 确认有这个参数！
```

### 3. 测试识别

1. 点击"开始转写"
2. 用中文说话，例如：
   - "你好世界"
   - "今天天气很好"
   - "我要测试语音识别"

### 4. 检查识别结果

在日志中查找：

```
📝 PARTIAL TRANSCRIPT: "你好世界"  ✅ 应该是中文，不是俄语！
✅ COMMITTED TRANSCRIPT: "你好世界"
```

如果看到中文而不是西里尔字母，说明修复成功！

---

## 📊 预期效果

### 修复前
```
用户说: "你好"
API识别: "Лейджи" ❌ (俄语)
错误率: 100%
```

### 修复后
```
用户说: "你好"
API识别: "你好" ✅ (中文)
错误率: 应该大幅降低
```

---

## 🔍 如果问题仍然存在

如果指定 `zho` 后识别率仍然不理想，可能需要检查：

### 1. VAD参数优化
当前配置可能切段过于频繁，导致上下文丢失。

### 2. 音频质量
虽然电平正常，但可能存在：
- 环境噪声
- 说话不清晰
- 麦克风质量问题

### 3. API限制
ElevenLabs API可能对某些口音或说话方式识别率较低。

---

## 🎯 总结

**问题**: 自动语言检测失败，把中文识别成俄语
**原因**: WebSocket URL 缺少 `language_code` 参数
**解决**: 明确指定 `language_code=zho` (普通话)
**预期**: 识别错误率应该**大幅降低**

请按照上述步骤重新测试，并告诉我识别结果！
