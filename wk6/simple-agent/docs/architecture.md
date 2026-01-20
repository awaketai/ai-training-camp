# Simple Agent SDK - 核心原理与架构

## 1. 核心概念

Simple Agent 是一个基于 OpenAI API 的多轮对话 Agent SDK，它能够：
- 接收用户消息
- 调用 LLM 生成响应
- 识别并执行工具调用
- 将工具结果返回给 LLM
- 循环直到任务完成

## 2. Agent Loop (代理循环)

Agent 的核心是一个持续运行的循环机制：

```mermaid
flowchart TD
    A[用户输入] --> B[调用 LLM]
    B --> C{有工具调用?}
    C -->|是| D[执行工具]
    D --> E[收集结果]
    E --> B
    C -->|否| F[返回响应]
    F --> G[结束]

    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#fce4ec
    style D fill:#e8f5e9
    style F fill:#f3e5f5
    style G fill:#e0e0e0
```

### 循环流程说明

1. **接收输入**: 用户发送消息
2. **LLM 处理**: 将消息历史发送给 LLM
3. **决策判断**: LLM 决定是否需要调用工具
4. **工具执行**: 如果需要，执行工具并收集结果
5. **结果反馈**: 将工具结果添加到消息历史
6. **循环继续**: 重复步骤 2-5 直到 LLM 不再请求工具
7. **返回响应**: 输出最终文本响应

## 3. 消息流转机制

```mermaid
sequenceDiagram
    participant U as 用户
    participant A as Agent
    participant L as LLM (OpenAI)
    participant T as 工具执行器

    U->>A: 发送消息
    A->>A: 创建 User Message

    loop Agent Loop
        A->>L: 发送消息历史 + 工具定义
        L-->>A: 返回响应 (文本/工具调用)
        A->>A: 创建 Assistant Message

        alt 有工具调用
            A->>T: 执行工具
            T-->>A: 返回结果
            A->>A: 创建 Tool Message
        else 无工具调用
            A-->>U: 返回最终响应
        end
    end
```

### 消息类型

| 角色 | 类型 | 内容 |
|------|------|------|
| `user` | 用户消息 | 文本输入 |
| `assistant` | 助手消息 | 文本 + 工具调用 |
| `tool` | 工具消息 | 工具执行结果 |

## 4. 工具系统架构

```mermaid
flowchart LR
    subgraph 工具注册
        TR[Tool Registry]
        T1[自定义工具]
        T2[MCP 工具]
    end

    subgraph 工具执行
        TE[Tool Executor]
        TC[Tool Call]
        R[Result]
    end

    T1 --> TR
    T2 --> TR
    TR --> TE
    TC --> TE
    TE --> R

    style TR fill:#bbdefb
    style TE fill:#c8e6c9
```

### 工具定义结构

```typescript
interface Tool {
  name: string           // 工具名称
  description: string    // 工具描述 (供 LLM 理解)
  parameters: JSONSchema // 参数定义 (JSON Schema)
  execute: Function      // 执行函数
}
```

## 5. MCP 集成架构

```mermaid
flowchart TB
    subgraph Agent
        A[Agent Core]
        MM[MCP Manager]
    end

    subgraph MCP Servers
        S1[Filesystem Server]
        S2[Database Server]
        S3[其他 MCP Server]
    end

    subgraph Transports
        T1[stdio]
        T2[SSE]
    end

    A --> MM
    MM --> T1
    MM --> T2
    T1 --> S1
    T1 --> S2
    T2 --> S3

    style A fill:#e3f2fd
    style MM fill:#fff8e1
    style S1 fill:#e8f5e9
    style S2 fill:#e8f5e9
    style S3 fill:#e8f5e9
```

### MCP 工作流程

1. **连接**: Agent 通过 stdio 或 SSE 连接到 MCP Server
2. **发现**: 获取 Server 提供的工具列表
3. **适配**: 将 MCP 工具转换为统一的 Tool 接口
4. **注册**: 将适配后的工具注册到 Tool Registry
5. **调用**: Agent Loop 中统一调用所有工具

## 6. 整体架构图

```mermaid
flowchart TB
    subgraph 用户层
        UI[用户输入]
    end

    subgraph Agent层
        AG[Agent]
        SES[Session Manager]
        LOOP[Agent Loop]
    end

    subgraph LLM层
        LC[LLM Client]
        STREAM[Stream Handler]
    end

    subgraph 工具层
        TR[Tool Registry]
        TE[Tool Executor]
        CT[Custom Tools]
        MCP[MCP Manager]
        MS[MCP Servers]
    end

    UI --> AG
    AG --> SES
    AG --> LOOP
    LOOP --> LC
    LC --> STREAM
    LOOP --> TE
    TE --> TR
    CT --> TR
    MCP --> TR
    MCP --> MS

    style AG fill:#e3f2fd
    style LOOP fill:#fff3e0
    style LC fill:#fce4ec
    style TR fill:#e8f5e9
    style MCP fill:#f3e5f5
```

## 7. 关键设计原则

### 7.1 流式优先
所有 LLM 调用都使用流式接口，支持实时反馈：
```typescript
for await (const event of agent.stream(message)) {
  if (event.type === "text") {
    process.stdout.write(event.text)
  }
}
```

### 7.2 工具即一等公民
统一的工具接口，支持内置工具、自定义工具和 MCP 工具：
```typescript
agent.addTool(customTool)           // 自定义工具
await agent.connectMCP(mcpConfig)   // MCP 工具
```

### 7.3 循环直到完成
Agent 持续循环直到 LLM 不再请求工具调用：
```typescript
while (step < maxSteps) {
  const response = await llm.chat(...)
  if (noToolCalls(response)) break
  await executeTools(response.toolCalls)
}
```

### 7.4 事件驱动
通过事件系统暴露 Agent 内部状态：
```typescript
agent.run(message, (event) => {
  switch (event.type) {
    case "tool_call": // 工具被调用
    case "tool_result": // 工具返回结果
    case "text": // LLM 输出文本
  }
})
```

## 8. 数据流总结

```mermaid
flowchart LR
    subgraph Input
        U[User Message]
    end

    subgraph Processing
        M[Messages Array]
        L[LLM API]
        T[Tool Execution]
    end

    subgraph Output
        R[Response Text]
        E[Events Stream]
    end

    U --> M
    M --> L
    L --> |tool_calls| T
    T --> |results| M
    L --> |text| R
    L --> |stream| E
    T --> |events| E
```

## 9. 文件结构

```
src/
├── agent/
│   ├── agent.ts      # Agent 主类，提供用户 API
│   └── loop.ts       # Agent 循环核心逻辑
├── llm/
│   └── client.ts     # OpenAI API 封装，流式处理
├── tool/
│   ├── registry.ts   # 工具注册表，管理所有工具
│   └── executor.ts   # 工具执行器，处理工具调用
├── mcp/
│   ├── client.ts     # MCP 客户端，连接 MCP Server
│   └── manager.ts    # MCP 管理器，多服务器连接
├── session/
│   └── session.ts    # 会话管理，消息历史
├── config.ts         # 配置加载 (.env)
├── types.ts          # 类型定义
└── index.ts          # 入口，导出所有 API
```
