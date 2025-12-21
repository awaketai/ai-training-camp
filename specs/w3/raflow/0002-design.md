# RAFlow - 实时语音听写系统详细设计文档

## 文档版本信息

| 版本 | 日期 | 作者 | 变更说明 |
|-----|------|------|---------|
| 1.0 | 2025-12-21 | RAFlow Team | 初始版本 |

## 1. 系统架构概览

### 1.1 整体架构图

```mermaid
graph TB
    subgraph "用户层"
        U[用户]
        HK[全局热键 Cmd+Shift+\\]
    end

    subgraph "前端层 - Tauri WebView"
        UI[React/Vue UI]
        OW[悬浮窗组件]
        SW[设置窗口]
        EM[Event Manager]
    end

    subgraph "Rust 后端核心"
        subgraph "输入模块"
            GSH[Global Shortcut Handler]
            ASM[Audio Stream Manager]
            MIC[麦克风采集 cpal]
        end

        subgraph "音频处理管道"
            RSP[重采样器 rubato]
            VAD[VAD 检测器]
            BUF[音频缓冲队列]
        end

        subgraph "网络通信层"
            WSM[WebSocket Manager]
            ENC[Base64 编码器]
            DEC[JSON 解码器]
        end

        subgraph "系统集成层"
            AWD[Active Window Detector]
            TIM[Text Injection Manager]
            CBM[Clipboard Manager]
            ACC[Accessibility API]
        end

        subgraph "状态管理"
            SM[State Machine]
            CFG[Configuration Manager]
        end
    end

    subgraph "外部服务"
        ELABS[ElevenLabs Scribe v2 API]
    end

    U -->|按下热键| HK
    HK --> GSH
    GSH --> ASM
    ASM --> MIC
    MIC --> RSP
    RSP --> VAD
    VAD --> BUF
    BUF --> ENC
    ENC --> WSM
    WSM <-->|WSS| ELABS
    ELABS --> DEC
    DEC --> EM
    EM --> OW
    DEC --> TIM
    TIM --> AWD
    TIM --> CBM
    TIM --> ACC
    SM -.->|控制| ASM
    SM -.->|控制| WSM
    CFG -.->|配置| MIC
    CFG -.->|配置| WSM
    EM <--> UI
```

### 1.2 技术栈更新（基于 2025 最新版本）

| 组件分类 | 技术选型 | 版本 | 核心职责 |
|---------|---------|------|---------|
| **应用框架** | Tauri | v2.x (2024 stable) | 跨平台桌面应用框架 |
| **后端语言** | Rust | 2024 | 系统级编程、内存安全 |
| **前端框架** | React/Vue 3 | Latest | 用户界面渲染 |
| **异步运行时** | tokio | 1.x | 异步任务调度 |
| **WebSocket** | tokio-tungstenite | 0.26+ | 实时双向通信 |
| **音频采集** | cpal | 0.17 | 跨平台音频 I/O |
| **音频重采样** | rubato | 0.16+ | 高质量采样率转换 |
| **键盘模拟** | enigo / rdev | latest | 系统输入注入 |
| **窗口检测** | active-win-pos-rs | 0.9+ | 活跃窗口获取 |
| **ASR 服务** | ElevenLabs Scribe v2 | Realtime API | 实时语音识别 |

## 2. 核心模块详细设计

### 2.1 音频采集与处理模块

#### 2.1.1 音频流水线架构

```mermaid
flowchart LR
    subgraph "硬件层"
        MIC[麦克风硬件]
    end

    subgraph "OS 音频驱动"
        CA[CoreAudio/WASAPI/ALSA]
    end

    subgraph "cpal 音频线程 高优先级"
        CB[Audio Callback]
        RB[Ring Buffer]
    end

    subgraph "Tokio 异步线程池"
        RS[Resampler 48k→16k]
        V[VAD Filter]
        AGC[Auto Gain Control]
        CHUNK[Chunker 100ms]
    end

    subgraph "编码器线程"
        F32I16[f32 → i16 转换]
        B64[Base64 Encoder]
    end

    subgraph "网络发送队列"
        WQ[WebSocket Tx Queue]
    end

    MIC --> CA
    CA --> CB
    CB -->|mpsc channel| RB
    RB --> RS
    RS --> V
    V --> AGC
    AGC --> CHUNK
    CHUNK --> F32I16
    F32I16 --> B64
    B64 --> WQ
```

#### 2.1.2 核心数据结构设计

```rust
// 音频流配置
pub struct AudioConfig {
    pub sample_rate: u32,          // 原始采样率（通常 48000Hz）
    pub target_sample_rate: u32,   // 目标采样率（16000Hz for Scribe）
    pub channels: u16,             // 单声道 = 1
    pub chunk_duration_ms: u32,    // 音频块大小（100ms）
    pub buffer_size: usize,        // 环形缓冲区大小
}

// 音频数据包
pub struct AudioPacket {
    pub data: Vec<f32>,            // PCM 浮点数据
    pub timestamp: Instant,        // 采集时间戳
    pub sample_count: usize,       // 采样点数量
}

// 重采样器状态
pub struct ResamplerState {
    resampler: Box<dyn Resampler<f32>>,
    input_buffer: Vec<Vec<f32>>,
    output_buffer: Vec<Vec<f32>>,
}

// VAD 检测器
pub struct VoiceActivityDetector {
    threshold: f32,                // 能量阈值
    window_size: usize,           // 滑动窗口大小
    speech_frames: usize,         // 连续语音帧计数
    silence_frames: usize,        // 连续静音帧计数
}
```

#### 2.1.3 音频采集实现流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant GSH as Global Shortcut
    participant ASM as Audio Manager
    participant CPAL as cpal Stream
    participant Tokio as Tokio Runtime
    participant WS as WebSocket

    User->>GSH: 按下 Cmd+Shift+\
    GSH->>ASM: trigger_recording()
    ASM->>CPAL: start_stream()

    loop 音频采集循环
        CPAL->>CPAL: audio_callback()
        CPAL->>Tokio: send(AudioPacket) via mpsc
        Tokio->>Tokio: resample 48k→16k
        Tokio->>Tokio: VAD 检测
        alt 检测到语音
            Tokio->>Tokio: encode_base64()
            Tokio->>WS: send(input_audio_chunk)
        else 静音
            Tokio->>Tokio: 丢弃数据包
        end
    end

    User->>GSH: 释放热键
    GSH->>ASM: stop_recording()
    ASM->>CPAL: pause_stream()
    ASM->>WS: 发送结束信号
```

### 2.2 WebSocket 通信模块

#### 2.2.1 连接状态机

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: 用户触发热键
    Connecting --> Connected: 握手成功
    Connecting --> Error: 连接失败
    Connected --> Active: 接收 session_started
    Active --> Active: 发送音频/接收转写
    Active --> Disconnecting: 用户释放热键
    Active --> Error: 网络异常
    Disconnecting --> Disconnected: 清理资源
    Error --> Disconnected: 重置状态
    Error --> Connecting: 自动重连
```

#### 2.2.2 协议消息定义

```rust
// 上行消息（客户端 -> 服务端）
#[derive(Serialize)]
#[serde(tag = "message_type")]
pub enum ClientMessage {
    #[serde(rename = "input_audio_chunk")]
    AudioChunk {
        audio_base_64: String,
    },
    #[serde(rename = "manual_commit")]
    ManualCommit,
}

// 下行消息（服务端 -> 客户端）
#[derive(Deserialize)]
#[serde(tag = "message_type")]
pub enum ServerMessage {
    #[serde(rename = "session_started")]
    SessionStarted {
        session_id: String,
        config: SessionConfig,
    },
    #[serde(rename = "partial_transcript")]
    PartialTranscript {
        text: String,
        created_at_ms: u64,
    },
    #[serde(rename = "committed_transcript")]
    CommittedTranscript {
        text: String,
        confidence: f32,
        created_at_ms: u64,
    },
    #[serde(rename = "input_error")]
    InputError {
        error_message: String,
    },
}

// 会话配置
#[derive(Deserialize)]
pub struct SessionConfig {
    pub model_id: String,
    pub language_code: Option<String>,
    pub encoding: String,
}
```

#### 2.2.3 WebSocket 管理器实现

```mermaid
graph TB
    subgraph "WebSocket Manager"
        SM[State Machine]
        TX[Tx Task 发送任务]
        RX[Rx Task 接收任务]
        HB[Heartbeat Task 心跳]
    end

    subgraph "连接池"
        CONN[WebSocket Connection]
        WRITE[WS Write Half]
        READ[WS Read Half]
    end

    subgraph "数据队列"
        ITQ[Input Tx Queue]
        OTQ[Output Rx Queue]
    end

    SM -->|建立连接| CONN
    CONN --> WRITE
    CONN --> READ
    ITQ --> TX
    TX --> WRITE
    READ --> RX
    RX --> OTQ
    HB -->|Ping| WRITE
```

### 2.3 文本注入模块

#### 2.3.1 注入策略决策树

```mermaid
flowchart TD
    START[接收到 committed_transcript]
    CHECK_LEN{文本长度检查}
    CHECK_APP{检查目标应用}
    CHECK_FOCUS{检查焦点状态}

    STRAT_KEYBOARD[策略: 键盘模拟]
    STRAT_CLIPBOARD[策略: 剪贴板注入]
    STRAT_ACCESSIBILITY[策略: Accessibility API]

    EXEC_KEYBOARD[执行键盘输入]
    EXEC_CLIPBOARD[剪贴板复制+粘贴]
    EXEC_AX[AXUIElement 注入]

    RESTORE[恢复焦点和剪贴板]
    NOTIFY[通知前端更新 UI]
    END[完成]

    START --> CHECK_LEN
    CHECK_LEN -->|短文本 <20字符| STRAT_KEYBOARD
    CHECK_LEN -->|长文本 >=20字符| CHECK_APP

    CHECK_APP -->|终端/IDE| STRAT_KEYBOARD
    CHECK_APP -->|浏览器/Office| STRAT_CLIPBOARD
    CHECK_APP -->|macOS 原生应用| CHECK_FOCUS

    CHECK_FOCUS -->|有编辑焦点| STRAT_ACCESSIBILITY
    CHECK_FOCUS -->|无编辑焦点| STRAT_CLIPBOARD

    STRAT_KEYBOARD --> EXEC_KEYBOARD
    STRAT_CLIPBOARD --> EXEC_CLIPBOARD
    STRAT_ACCESSIBILITY --> EXEC_AX

    EXEC_KEYBOARD --> NOTIFY
    EXEC_CLIPBOARD --> RESTORE
    EXEC_AX --> NOTIFY

    RESTORE --> NOTIFY
    NOTIFY --> END
```

#### 2.3.2 文本注入器实现

```rust
// 文本注入策略
pub enum InjectionStrategy {
    Keyboard,       // 键盘模拟
    Clipboard,      // 剪贴板
    Accessibility,  // Accessibility API
}

// 文本注入管理器
pub struct TextInjectionManager {
    keyboard_simulator: KeyboardSimulator,
    clipboard_manager: ClipboardManager,
    accessibility_client: AccessibilityClient,
    window_detector: WindowDetector,
}

impl TextInjectionManager {
    // 智能选择注入策略
    pub async fn inject_text(&self, text: &str) -> Result<()> {
        let active_window = self.window_detector.get_active_window()?;
        let strategy = self.select_strategy(text, &active_window);

        match strategy {
            InjectionStrategy::Keyboard => {
                self.inject_via_keyboard(text).await
            },
            InjectionStrategy::Clipboard => {
                self.inject_via_clipboard(text).await
            },
            InjectionStrategy::Accessibility => {
                self.inject_via_accessibility(text, &active_window).await
            },
        }
    }

    // 剪贴板注入实现
    async fn inject_via_clipboard(&self, text: &str) -> Result<()> {
        // 1. 备份当前剪贴板
        let old_clipboard = self.clipboard_manager.read_text()?;

        // 2. 写入新文本
        self.clipboard_manager.write_text(text)?;

        // 3. 模拟粘贴快捷键
        #[cfg(target_os = "macos")]
        self.keyboard_simulator.key_sequence(&[Key::Meta, Key::Layout('v')])?;

        #[cfg(target_os = "windows")]
        self.keyboard_simulator.key_sequence(&[Key::Control, Key::Layout('v')])?;

        // 4. 等待粘贴完成
        tokio::time::sleep(Duration::from_millis(100)).await;

        // 5. 恢复剪贴板
        if let Some(old) = old_clipboard {
            self.clipboard_manager.write_text(&old)?;
        }

        Ok(())
    }
}
```

### 2.4 系统集成层

#### 2.4.1 窗口管理与焦点控制

```mermaid
sequenceDiagram
    participant User
    participant App as 目标应用
    participant Tauri as Tauri 窗口
    participant Detector as Window Detector
    participant Injector as Text Injector

    User->>App: 在文档中工作
    User->>Tauri: 按下热键
    Note over Tauri: 悬浮窗显示"正在听..."
    Detector->>App: 获取窗口信息
    Detector->>Detector: 保存窗口引用

    Note over Tauri: 语音转写完成

    Tauri->>Tauri: 隐藏悬浮窗
    Tauri->>App: 恢复焦点
    Injector->>App: 注入文本
    App->>User: 显示输入结果
```

#### 2.4.2 macOS 权限管理

```mermaid
flowchart TD
    START[应用启动]
    CHECK_MIC{检查麦克风权限}
    CHECK_ACC{检查辅助功能权限}
    CHECK_SR{检查屏幕录制权限}

    REQ_MIC[请求麦克风权限]
    REQ_ACC[请求辅助功能权限]
    REQ_SR[请求屏幕录制权限]

    SHOW_GUIDE[显示权限设置指南]
    WAIT[等待用户授权]
    VERIFY[验证权限]

    READY[应用就绪]

    START --> CHECK_MIC
    CHECK_MIC -->|未授权| REQ_MIC
    CHECK_MIC -->|已授权| CHECK_ACC
    REQ_MIC --> SHOW_GUIDE

    CHECK_ACC -->|未授权| REQ_ACC
    CHECK_ACC -->|已授权| CHECK_SR
    REQ_ACC --> SHOW_GUIDE

    CHECK_SR -->|未授权| REQ_SR
    CHECK_SR -->|已授权| READY
    REQ_SR --> SHOW_GUIDE

    SHOW_GUIDE --> WAIT
    WAIT --> VERIFY
    VERIFY -->|失败| WAIT
    VERIFY -->|成功| READY
```

## 3. 前端界面设计

### 3.1 窗口结构

```mermaid
graph TB
    subgraph "主窗口 - 默认隐藏"
        MAIN[设置面板]
        MAIN_TAB1[通用设置]
        MAIN_TAB2[音频设置]
        MAIN_TAB3[快捷键设置]
        MAIN_TAB4[高级选项]
    end

    subgraph "悬浮窗 - 热键触发"
        OVERLAY[透明悬浮窗]
        WAVE[波形动画]
        PARTIAL[实时文本预览]
        STATUS[状态指示器]
    end

    subgraph "系统托盘"
        TRAY[托盘图标]
        TRAY_MENU[菜单]
        TRAY_SETTINGS[打开设置]
        TRAY_QUIT[退出]
    end

    MAIN --> MAIN_TAB1
    MAIN --> MAIN_TAB2
    MAIN --> MAIN_TAB3
    MAIN --> MAIN_TAB4

    OVERLAY --> WAVE
    OVERLAY --> PARTIAL
    OVERLAY --> STATUS

    TRAY --> TRAY_MENU
    TRAY_MENU --> TRAY_SETTINGS
    TRAY_MENU --> TRAY_QUIT

    TRAY_SETTINGS -.-> MAIN
```

### 3.2 悬浮窗 UI 状态

```mermaid
stateDiagram-v2
    [*] --> Hidden: 应用启动
    Hidden --> Listening: 用户按下热键
    Listening --> Transcribing: 检测到语音
    Transcribing --> Transcribing: 接收 partial_transcript
    Transcribing --> Committing: 接收 committed_transcript
    Committing --> Hidden: 文本注入完成
    Listening --> Hidden: 用户释放热键（无语音）
    Transcribing --> Error: 网络错误
    Error --> Hidden: 3秒后自动隐藏
```

### 3.3 前后端通信协议

```typescript
// Tauri Event 定义
interface TauriEvents {
  // 后端 -> 前端
  'audio-level': { rms: number; peak: number };
  'transcript-partial': { text: string; timestamp: number };
  'transcript-committed': { text: string; confidence: number };
  'session-status': { status: 'connecting' | 'connected' | 'disconnected' | 'error' };
  'injection-status': { success: boolean; method: string };

  // 前端 -> 后端
  'start-recording': void;
  'stop-recording': void;
  'manual-commit': void;
}

// Tauri Command 定义
interface TauriCommands {
  get_config(): Promise<AppConfig>;
  update_config(config: AppConfig): Promise<void>;
  check_permissions(): Promise<PermissionStatus>;
  request_permissions(): Promise<void>;
  get_active_window(): Promise<WindowInfo>;
}
```

## 4. 数据流与时序

### 4.1 完整转写流程

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant HK as 热键监听
    participant UI as 悬浮窗 UI
    participant Audio as 音频模块
    participant WS as WebSocket
    participant EL as ElevenLabs
    participant Inject as 注入模块
    participant Target as 目标应用

    U->>HK: 按下 Cmd+Shift+\
    HK->>Audio: start_recording()
    HK->>UI: show_overlay()
    UI-->>U: 显示"正在听..."

    Audio->>WS: 建立连接
    WS->>EL: WebSocket 握手
    EL-->>WS: session_started
    WS-->>UI: 更新状态: 已连接

    loop 持续按住热键
        U->>Audio: 说话
        Audio->>Audio: 采集音频
        Audio->>Audio: 重采样 + VAD
        Audio->>WS: send(input_audio_chunk)
        WS->>EL: 发送音频数据

        EL-->>WS: partial_transcript
        WS-->>UI: 更新临时文本
        UI-->>U: 实时显示转写结果
    end

    U->>HK: 释放热键
    HK->>Audio: stop_recording()

    EL-->>WS: committed_transcript
    WS->>Inject: 触发文本注入

    Inject->>Inject: 选择注入策略
    Inject->>Target: 输入文本
    Target-->>U: 显示最终结果

    Inject-->>UI: injection_complete
    UI->>UI: hide_overlay()
```

### 4.2 错误处理流程

```mermaid
flowchart TD
    ERROR[错误发生]
    TYPE{错误类型}

    NET_ERR[网络错误]
    AUDIO_ERR[音频错误]
    PERM_ERR[权限错误]
    API_ERR[API 错误]

    RETRY{重试策略}
    FALLBACK{降级策略}
    NOTIFY[通知用户]

    LOG[记录日志]
    RECOVER[恢复状态]

    ERROR --> TYPE

    TYPE --> NET_ERR
    TYPE --> AUDIO_ERR
    TYPE --> PERM_ERR
    TYPE --> API_ERR

    NET_ERR --> RETRY
    RETRY -->|<3次| RECOVER
    RETRY -->|>=3次| NOTIFY

    AUDIO_ERR --> FALLBACK
    FALLBACK -->|重新初始化| RECOVER
    FALLBACK -->|失败| NOTIFY

    PERM_ERR --> NOTIFY
    NOTIFY --> LOG

    API_ERR --> FALLBACK
    FALLBACK -->|切换模型| RECOVER

    RECOVER --> LOG
    LOG --> [*]
```

## 5. 性能优化策略

### 5.1 音频处理优化

#### 零拷贝音频传输
```rust
// 使用环形缓冲区避免内存分配
use ringbuf::HeapRb;

pub struct AudioPipeline {
    // 无锁环形缓冲区
    audio_buffer: HeapRb<f32>,
    // 预分配的重采样缓冲区
    resample_buffer: Vec<f32>,
}

impl AudioPipeline {
    pub fn new(capacity: usize) -> Self {
        Self {
            audio_buffer: HeapRb::new(capacity),
            resample_buffer: Vec::with_capacity(capacity / 3), // 48k->16k
        }
    }

    // 音频回调中使用引用，避免拷贝
    pub fn audio_callback(&mut self, data: &[f32]) {
        self.audio_buffer.push_slice(data);
    }
}
```

#### 批处理与块大小优化
```mermaid
graph LR
    subgraph "音频采集"
        C1[10ms 块]
        C2[10ms 块]
        C3[10ms 块]
    end

    subgraph "批处理缓冲"
        B[100ms 累积缓冲]
    end

    subgraph "网络发送"
        S[单次 WebSocket 发送]
    end

    C1 --> B
    C2 --> B
    C3 --> B
    B -->|积累 10 个块| S
```

### 5.2 网络传输优化

#### 连接预热策略
```rust
pub struct ConnectionWarmer {
    state: Arc<Mutex<ConnectionState>>,
}

impl ConnectionWarmer {
    // 在热键按下前提前建立连接
    pub async fn warm_connection(&self) {
        // 监听修饰键（Cmd+Shift）
        // 在完整热键（Cmd+Shift+\）触发前 500ms 建立连接
        if self.detect_modifier_keys() {
            tokio::spawn(async {
                self.establish_connection().await
            });
        }
    }
}
```

#### WebSocket 消息压缩
```rust
// 对于长时间会话，考虑使用压缩
let ws_config = WebSocketConfig {
    max_message_size: Some(64 << 20), // 64 MB
    max_frame_size: Some(16 << 20),   // 16 MB
    accept_unmasked_frames: false,
    // 启用 permessage-deflate 扩展
    compression: Some(CompressionConfig::default()),
};
```

### 5.3 内存管理

```mermaid
graph TD
    subgraph "内存池管理"
        POOL[对象池]
        AB1[AudioBuffer 1]
        AB2[AudioBuffer 2]
        AB3[AudioBuffer 3]
    end

    subgraph "使用流程"
        REQ[请求缓冲区]
        USE[使用缓冲区]
        RET[归还缓冲区]
    end

    POOL --> REQ
    REQ --> AB1
    AB1 --> USE
    USE --> RET
    RET --> POOL
```

## 6. 安全性设计

### 6.1 API 密钥管理

```rust
use keyring::Entry;

pub struct SecureConfigManager {
    keyring_entry: Entry,
}

impl SecureConfigManager {
    pub fn new(app_name: &str) -> Result<Self> {
        Ok(Self {
            keyring_entry: Entry::new(app_name, "elevenlabs_api_key")?,
        })
    }

    // 将 API 密钥存储在系统钥匙串中
    pub fn store_api_key(&self, api_key: &str) -> Result<()> {
        self.keyring_entry.set_password(api_key)
    }

    pub fn get_api_key(&self) -> Result<String> {
        self.keyring_entry.get_password()
    }
}
```

### 6.2 权限最小化原则

```json
{
  "permissions": [
    "core:default",
    "core:window:allow-show",
    "core:window:allow-hide",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister",
    "clipboard-manager:allow-write-text",
    "clipboard-manager:allow-read-text"
  ],
  "deny": [
    "fs:allow-write-file",
    "shell:allow-execute",
    "http:allow-fetch"
  ]
}
```

### 6.3 应用黑名单

```rust
// 在敏感应用中禁用功能
const BLACKLISTED_APPS: &[&str] = &[
    "1Password",
    "Bitwarden",
    "KeePassXC",
    "Terminal", // 终端密码输入
    "iTerm2",
    "Google Chrome Incognito",
];

pub fn is_safe_to_inject(window_info: &WindowInfo) -> bool {
    !BLACKLISTED_APPS.iter().any(|&app| window_info.app_name.contains(app))
}
```

## 7. 测试策略

### 7.1 单元测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_audio_resampling() {
        let input_48k = generate_test_audio(48000, 1.0);
        let resampler = create_resampler(48000, 16000);
        let output_16k = resampler.process(&input_48k).await.unwrap();

        assert_eq!(output_16k.len(), input_48k.len() / 3);
    }

    #[test]
    fn test_vad_detection() {
        let silence = vec![0.0; 1600]; // 100ms 静音
        let speech = generate_speech_signal();

        let mut vad = VoiceActivityDetector::new(0.01);
        assert!(!vad.is_speech(&silence));
        assert!(vad.is_speech(&speech));
    }

    #[tokio::test]
    async fn test_websocket_message_encoding() {
        let audio_data = vec![0.5f32; 1600];
        let msg = create_audio_chunk_message(&audio_data);
        let json = serde_json::to_string(&msg).unwrap();

        assert!(json.contains("input_audio_chunk"));
        assert!(json.contains("audio_base_64"));
    }
}
```

### 7.2 集成测试

```mermaid
graph TB
    subgraph "测试套件"
        T1[音频采集测试]
        T2[WebSocket 连接测试]
        T3[文本注入测试]
        T4[端到端测试]
    end

    subgraph "Mock 服务"
        M1[Mock 音频设备]
        M2[Mock WebSocket 服务器]
        M3[Mock 窗口管理器]
    end

    T1 --> M1
    T2 --> M2
    T3 --> M3
    T4 --> M1
    T4 --> M2
    T4 --> M3
```

## 8. 部署与打包

### 8.1 Tauri 构建配置

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "identifier": "com.raflow.app",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.icns"
    ],
    "resources": [],
    "copyright": "Copyright (c) 2025 RAFlow Team",
    "category": "Productivity",
    "macOS": {
      "minimumSystemVersion": "10.15",
      "entitlements": "entitlements.plist",
      "frameworks": [],
      "useBootstrapper": false
    }
  }
}
```

### 8.2 macOS 权限配置 (entitlements.plist)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.microphone</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    <key>com.apple.security.app-sandbox</key>
    <false/>
</dict>
</plist>
```

### 8.3 发布流程

```mermaid
flowchart LR
    DEV[开发环境]
    TEST[测试环境]
    BUILD[构建发布版本]
    SIGN[代码签名]
    NOTARIZE[公证]
    RELEASE[发布]

    DEV -->|通过测试| TEST
    TEST -->|质量检查| BUILD
    BUILD --> SIGN
    SIGN --> NOTARIZE
    NOTARIZE --> RELEASE
```

## 9. 监控与日志

### 9.1 日志结构

```rust
use tracing::{info, warn, error, debug};
use tracing_subscriber;

pub fn init_logging() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();
}

// 使用示例
info!("Audio stream started: sample_rate={}, channels={}", 48000, 1);
warn!("VAD threshold too low, may cause false positives: {}", threshold);
error!("WebSocket connection failed: {:?}", error);
debug!("Received partial transcript: {}", text);
```

### 9.2 性能指标

```rust
use std::time::Instant;

pub struct PerformanceMetrics {
    pub audio_latency_ms: f64,       // 音频采集延迟
    pub network_latency_ms: f64,     // 网络往返延迟
    pub transcription_latency_ms: f64, // 转写延迟
    pub injection_latency_ms: f64,   // 注入延迟
    pub total_latency_ms: f64,       // 总延迟
}

impl PerformanceMetrics {
    pub fn measure_audio_capture(&mut self, start: Instant) {
        self.audio_latency_ms = start.elapsed().as_secs_f64() * 1000.0;
    }

    pub fn log_metrics(&self) {
        info!(
            "Performance: audio={}ms, network={}ms, transcription={}ms, injection={}ms, total={}ms",
            self.audio_latency_ms,
            self.network_latency_ms,
            self.transcription_latency_ms,
            self.injection_latency_ms,
            self.total_latency_ms
        );
    }
}
```

## 10. 未来扩展方向

### 10.1 功能路线图

```mermaid
timeline
    title RAFlow 产品路线图
    section V1.0 - MVP
        核心语音输入功能
        基础 UI
        macOS 支持
    section V1.5 - 增强版
        本地 VAD 集成
        多语言支持
        自定义热键
    section V2.0 - 智能版
        上下文感知
        语音命令
        自定义词典
    section V2.5 - 跨平台
        Windows 支持
        Linux 支持
    section V3.0 - AI 增强
        离线模式 whisper.cpp
        LLM 后处理
        智能标点
        情感分析
```

### 10.2 架构演进

```mermaid
graph TB
    subgraph "V1.0 - 当前架构"
        A1[Tauri + ElevenLabs]
    end

    subgraph "V2.0 - 混合架构"
        A2[Tauri Core]
        A2 --> B1[云端 ASR]
        A2 --> B2[本地 VAD]
        A2 --> B3[智能路由]
    end

    subgraph "V3.0 - 插件化架构"
        A3[核心引擎]
        A3 --> C1[ASR 插件系统]
        A3 --> C2[后处理插件]
        A3 --> C3[输入法插件]
        C1 --> D1[ElevenLabs]
        C1 --> D2[Whisper]
        C1 --> D3[自定义模型]
    end

    A1 --> A2
    A2 --> A3
```

## 11. 参考资源

### 技术文档
- [Tauri v2 官方文档](https://v2.tauri.app/)
- [ElevenLabs Scribe v2 API 文档](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime)
- [cpal 音频库文档](https://github.com/RustAudio/cpal)
- [tokio-tungstenite WebSocket 文档](https://github.com/snapview/tokio-tungstenite)
- [rubato 重采样库文档](https://github.com/HEnquist/rubato)
- [enigo 输入模拟文档](https://github.com/enigo-rs/enigo)

### 社区资源
- [Tauri Awesome 项目列表](https://github.com/tauri-apps/awesome-tauri)
- [Rust 音频社区](https://github.com/RustAudio)
- [WebSocket 最佳实践](https://www.videosdk.live/developer-hub/websocket/rust-websocket)

---

**文档状态**: ✅ 已完成
**最后更新**: 2025-12-21
**审核状态**: 待审核
