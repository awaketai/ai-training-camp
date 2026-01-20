# Simple Agent Loop - 极简设计规范

## 1. 概述

本设计实现一个**最小完整**的 Agent Loop，核心目标是用最少的代码实现完整的多轮工具调用能力，支持本地工具和 MCP 远程工具。

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Agent Loop                                       │
│                                                                               │
│                                                                               │
│   user input ──► LLM ──► 需要工具? ──Y──► Execute Tool ◄───┐                 │
│                          │      │              │            │                 │
│                          │      │              ▼            │                 │
│                          │      │    ┌─────────────────┐    │                 │
│                          │      │    │  Tool Registry  │    │                 │
│                          │      │    │  ┌───────────┐  │    │                 │
│                          │      │    │  │Local Tools│  │    │                 │
│                          │      │    │  └───────────┘  │    │                 │
│                          │      │    │  ┌───────────┐  │    │                 │
│                          │      │    │  │MCP Tools  │──┼────┼──► MCP Servers │
│                          │      │    │  └───────────┘  │    │                 │
│                          │      │    └────────┬────────┘    │                 │
│                          │      │             │             │                 │
│                          │      │             ▼             │                 │
│                          │      │        Tool result ───────┘                 │
│                          │      │                                             │
│                          │      └─────────────────────────────────────────────│
│                          │                                                    │
│                          N                                                    │
│                          │                                                    │
│                          ▼                                                    │
│                    Final Response                                             │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**核心流程**：
1. **user input** → 用户输入进入 Agent
2. **LLM** → 调用大语言模型分析意图
3. **需要工具?** → 判断是否需要调用工具
   - **Y** → 从 Tool Registry 获取工具（可能是本地工具或 MCP 远程工具）并执行
   - **Tool result** → 工具执行结果返回给 LLM 继续处理（循环）
   - **N** → 直接输出 Final Response

## 2. 核心设计原则

| 原则 | 说明 |
|------|------|
| **极简** | 只包含必要组件，无冗余抽象 |
| **完整** | 支持多轮工具调用，支持并行执行 |
| **类型安全** | 完整的 TypeScript 类型定义 |
| **可扩展** | 工具通过注册方式添加，易于扩展 |

## 3. 核心数据结构

### 3.1 工具定义

```typescript
/**
 * 工具参数 Schema（简化版 JSON Schema）
 */
interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
  properties?: Record<string, ToolParameter>  // 用于 object 类型
  items?: ToolParameter                        // 用于 array 类型
}

/**
 * 工具定义
 */
interface Tool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required?: string[]
  }
  execute: (args: Record<string, unknown>) => Promise<string>
}
```

### 3.2 消息结构

遵循 OpenAI/Anthropic 的消息格式，保持 API 兼容性：

```typescript
/**
 * 基础消息类型
 */
type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/**
 * 工具调用请求（LLM 发起）
 */
interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string  // JSON 字符串
  }
}

/**
 * 用户消息
 */
interface UserMessage {
  role: 'user'
  content: string
}

/**
 * 助手消息
 */
interface AssistantMessage {
  role: 'assistant'
  content: string | null
  tool_calls?: ToolCall[]
}

/**
 * 工具结果消息
 */
interface ToolMessage {
  role: 'tool'
  tool_call_id: string
  content: string
}

/**
 * 系统消息
 */
interface SystemMessage {
  role: 'system'
  content: string
}

type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage
```

### 3.3 Agent 配置

```typescript
/**
 * LLM 提供商配置
 */
interface LLMConfig {
  provider: 'openai' | 'anthropic'
  model: string
  apiKey: string
  baseURL?: string
  maxTokens?: number
  temperature?: number
}

/**
 * Agent 配置
 */
interface AgentConfig {
  name: string
  llm: LLMConfig
  systemPrompt: string
  tools?: Tool[]
  maxIterations?: number  // 防止无限循环，默认 10
}
```

## 4. 核心模块

### 4.1 工具注册表

```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>()

  /**
   * 注册工具
   */
  register(tool: Tool): this {
    this.tools.set(tool.name, tool)
    return this
  }

  /**
   * 批量注册
   */
  registerAll(tools: Tool[]): this {
    tools.forEach(t => this.register(t))
    return this
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * 获取所有工具（用于发送给 LLM）
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 转换为 OpenAI 格式
   */
  toOpenAIFormat(): OpenAITool[] {
    return this.getAll().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }
}
```

### 4.2 LLM 客户端抽象

```typescript
/**
 * LLM 响应结构
 */
interface LLMResponse {
  content: string | null
  toolCalls: ToolCall[] | null
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
}

/**
 * LLM 客户端接口
 */
interface LLMClient {
  chat(messages: Message[], tools?: OpenAITool[]): Promise<LLMResponse>
}

/**
 * OpenAI 客户端实现
 */
class OpenAIClient implements LLMClient {
  private client: OpenAI

  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    })
    this.config = config
  }

  async chat(messages: Message[], tools?: OpenAITool[]): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: messages as any,
      tools: tools?.length ? tools : undefined,
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature ?? 0.7
    })

    const choice = response.choices[0]
    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls ?? null,
      finishReason: choice.finish_reason as LLMResponse['finishReason']
    }
  }
}
```

### 4.3 工具执行器

```typescript
/**
 * 工具执行结果
 */
interface ToolExecutionResult {
  toolCallId: string
  name: string
  result: string
  isError: boolean
}

/**
 * 工具执行器
 */
class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  /**
   * 执行单个工具调用
   */
  async executeOne(call: ToolCall): Promise<ToolExecutionResult> {
    const tool = this.registry.get(call.function.name)
    
    if (!tool) {
      return {
        toolCallId: call.id,
        name: call.function.name,
        result: `Error: Tool "${call.function.name}" not found`,
        isError: true
      }
    }

    try {
      const args = JSON.parse(call.function.arguments)
      const result = await tool.execute(args)
      return {
        toolCallId: call.id,
        name: call.function.name,
        result,
        isError: false
      }
    } catch (error) {
      return {
        toolCallId: call.id,
        name: call.function.name,
        result: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      }
    }
  }

  /**
   * 并行执行多个工具调用
   */
  async executeAll(calls: ToolCall[]): Promise<ToolExecutionResult[]> {
    return Promise.all(calls.map(call => this.executeOne(call)))
  }
}
```

## 5. Agent Loop 核心实现

### 5.1 Agent 类

```typescript
/**
 * Agent 事件类型（用于日志/调试）
 */
type AgentEvent =
  | { type: 'llm_start'; messages: Message[] }
  | { type: 'llm_response'; response: LLMResponse }
  | { type: 'tool_start'; calls: ToolCall[] }
  | { type: 'tool_result'; results: ToolExecutionResult[] }
  | { type: 'complete'; response: string }
  | { type: 'error'; error: Error }

type EventHandler = (event: AgentEvent) => void

/**
 * Simple Agent 核心实现
 */
class SimpleAgent {
  private llm: LLMClient
  private registry: ToolRegistry
  private executor: ToolExecutor
  private messages: Message[] = []
  private eventHandlers: EventHandler[] = []

  constructor(private config: AgentConfig) {
    // 初始化 LLM 客户端
    this.llm = this.createLLMClient(config.llm)
    
    // 初始化工具
    this.registry = new ToolRegistry()
    if (config.tools) {
      this.registry.registerAll(config.tools)
    }
    this.executor = new ToolExecutor(this.registry)

    // 设置系统提示
    this.messages.push({
      role: 'system',
      content: config.systemPrompt
    })
  }

  private createLLMClient(config: LLMConfig): LLMClient {
    switch (config.provider) {
      case 'openai':
        return new OpenAIClient(config)
      // 可扩展其他 provider
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }
  }

  /**
   * 添加事件监听器
   */
  on(handler: EventHandler): this {
    this.eventHandlers.push(handler)
    return this
  }

  private emit(event: AgentEvent): void {
    this.eventHandlers.forEach(h => h(event))
  }

  /**
   * 核心：运行 Agent Loop
   */
  async run(userInput: string): Promise<string> {
    // 1. 添加用户消息
    this.messages.push({
      role: 'user',
      content: userInput
    })

    const maxIterations = this.config.maxIterations ?? 10
    let iteration = 0

    // 2. Agent Loop
    while (iteration < maxIterations) {
      iteration++

      // 2.1 调用 LLM
      this.emit({ type: 'llm_start', messages: this.messages })
      
      const response = await this.llm.chat(
        this.messages,
        this.registry.toOpenAIFormat()
      )
      
      this.emit({ type: 'llm_response', response })

      // 2.2 添加助手消息
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: response.content,
        tool_calls: response.toolCalls ?? undefined
      }
      this.messages.push(assistantMessage)

      // 2.3 判断：是否需要调用工具？
      if (!response.toolCalls || response.toolCalls.length === 0) {
        // N: 无工具调用，返回最终响应
        const finalResponse = response.content ?? ''
        this.emit({ type: 'complete', response: finalResponse })
        return finalResponse
      }

      // Y: 有工具调用
      this.emit({ type: 'tool_start', calls: response.toolCalls })

      // 2.4 执行工具（并行）
      const results = await this.executor.executeAll(response.toolCalls)
      this.emit({ type: 'tool_result', results })

      // 2.5 添加工具结果消息
      for (const result of results) {
        const toolMessage: ToolMessage = {
          role: 'tool',
          tool_call_id: result.toolCallId,
          content: result.result
        }
        this.messages.push(toolMessage)
      }

      // 继续循环，让 LLM 处理工具结果
    }

    // 超过最大迭代次数
    throw new Error(`Agent exceeded maximum iterations (${maxIterations})`)
  }

  /**
   * 重置会话（保留系统提示）
   */
  reset(): void {
    this.messages = [{
      role: 'system',
      content: this.config.systemPrompt
    }]
  }

  /**
   * 动态添加工具
   */
  addTool(tool: Tool): this {
    this.registry.register(tool)
    return this
  }

  /**
   * 获取当前消息历史
   */
  getMessages(): Message[] {
    return [...this.messages]
  }
}
```

### 5.2 Agent Loop 流程图（详细）

```
                    ┌─────────────┐
                    │ User Input  │
                    └──────┬──────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Add to Message History │
              └────────────┬───────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 ▼                 │
         │    ┌────────────────────────┐     │
         │    │      Call LLM API      │     │
         │    │  (messages + tools)    │     │
         │    └────────────┬───────────┘     │
         │                 │                 │
         │                 ▼                 │
         │    ┌────────────────────────┐     │
         │    │  Parse LLM Response    │     │
         │    │  (content/tool_calls)  │     │
         │    └────────────┬───────────┘     │
         │                 │                 │
         │                 ▼                 │
         │    ┌────────────────────────┐     │
         │    │ Add Assistant Message  │     │
         │    └────────────┬───────────┘     │
         │                 │                 │
         │                 ▼                 │
         │         ╔══════════════╗          │
         │         ║ tool_calls?  ║          │
         │         ╚══════╤═══════╝          │
         │                │                  │
         │       ┌────────┴────────┐         │
         │       │ YES             │ NO      │
         │       ▼                 ▼         │
         │  ┌──────────┐    ┌───────────┐    │
         │  │ Execute  │    │  Return   │    │
         │  │  Tools   │    │ Response  │    │
    LOOP │  └────┬─────┘    └───────────┘    │
         │       │                           │
         │       ▼                           │
         │  ┌────────────────────────┐       │
         │  │ Add Tool Result Msgs   │       │
         │  └────────────┬───────────┘       │
         │               │                   │
         └───────────────┴───────────────────┘
```

## 6. 使用示例

### 6.1 基础用法

```typescript
import { SimpleAgent, Tool } from './agent'

// 定义工具
const calculatorTool: Tool = {
  name: 'calculator',
  description: '执行数学计算',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: '数学表达式，如 "2 + 3 * 4"'
      }
    },
    required: ['expression']
  },
  execute: async (args) => {
    const expr = args.expression as string
    try {
      // 注意：实际使用中应避免 eval，这里仅作演示
      const result = Function(`"use strict"; return (${expr})`)()
      return `计算结果: ${result}`
    } catch (e) {
      return `计算错误: ${e}`
    }
  }
}

// 创建 Agent
const agent = new SimpleAgent({
  name: 'MathBot',
  llm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY!
  },
  systemPrompt: '你是一个数学助手，可以帮助用户进行计算。使用 calculator 工具来执行计算。',
  tools: [calculatorTool],
  maxIterations: 5
})

// 添加事件监听（可选）
agent.on(event => {
  if (event.type === 'tool_start') {
    console.log('🔧 执行工具:', event.calls.map(c => c.function.name))
  }
})

// 运行
const response = await agent.run('计算 (15 + 27) * 3 的结果')
console.log('📝 回答:', response)
```

### 6.2 多工具示例

```typescript
// 天气查询工具
const weatherTool: Tool = {
  name: 'get_weather',
  description: '查询指定城市的天气',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: '城市名称' }
    },
    required: ['city']
  },
  execute: async (args) => {
    // 模拟 API 调用
    const city = args.city as string
    return JSON.stringify({
      city,
      temperature: 22,
      condition: 'sunny',
      humidity: 65
    })
  }
}

// 翻译工具
const translateTool: Tool = {
  name: 'translate',
  description: '翻译文本',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '要翻译的文本' },
      targetLanguage: { type: 'string', description: '目标语言' }
    },
    required: ['text', 'targetLanguage']
  },
  execute: async (args) => {
    // 模拟翻译
    return `[Translated to ${args.targetLanguage}]: ${args.text}`
  }
}

// 创建多工具 Agent
const multiToolAgent = new SimpleAgent({
  name: 'AssistantBot',
  llm: {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY!
  },
  systemPrompt: '你是一个多功能助手，可以查询天气和翻译文本。',
  tools: [weatherTool, translateTool]
})

// 这个查询会触发多轮工具调用
const response = await multiToolAgent.run(
  '帮我查一下北京的天气，然后把天气情况翻译成英文'
)
```

### 6.3 动态添加工具

```typescript
const agent = new SimpleAgent({
  name: 'DynamicBot',
  llm: { provider: 'openai', model: 'gpt-4o-mini', apiKey: '...' },
  systemPrompt: '你是一个助手。'
})

// 运行时动态添加工具
agent.addTool({
  name: 'search',
  description: '搜索信息',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' }
    },
    required: ['query']
  },
  execute: async (args) => `搜索结果: ${args.query}`
})

await agent.run('搜索最新的 AI 新闻')
```

## 7. 文件结构

```
simple-agent/
├── src/
│   ├── index.ts              # 主入口，导出所有公共接口
│   ├── types.ts              # 类型定义
│   ├── agent.ts              # SimpleAgent 核心实现
│   ├── llm/
│   │   ├── client.ts         # LLM 客户端接口
│   │   └── openai.ts         # OpenAI 实现
│   ├── tool/
│   │   ├── registry.ts       # 工具注册表
│   │   └── executor.ts       # 工具执行器
│   └── utils/
│       └── id.ts             # ID 生成等工具函数
├── examples/
│   ├── basic.ts              # 基础示例
│   ├── multi-tool.ts         # 多工具示例
│   └── mcp.ts                # MCP 集成示例
├── package.json
└── tsconfig.json
```

## 8. 完整代码实现

### 8.1 types.ts

```typescript
// ============ 工具相关 ============

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  properties?: Record<string, ToolParameter>
  items?: ToolParameter
}

export interface Tool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required?: string[]
  }
  execute: (args: Record<string, unknown>) => Promise<string>
}

export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Tool['parameters']
  }
}

// ============ 消息相关 ============

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface SystemMessage {
  role: 'system'
  content: string
}

export interface UserMessage {
  role: 'user'
  content: string
}

export interface AssistantMessage {
  role: 'assistant'
  content: string | null
  tool_calls?: ToolCall[]
}

export interface ToolMessage {
  role: 'tool'
  tool_call_id: string
  content: string
}

export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage

// ============ LLM 相关 ============

export interface LLMConfig {
  provider: 'openai' | 'anthropic'
  model: string
  apiKey: string
  baseURL?: string
  maxTokens?: number
  temperature?: number
}

export interface LLMResponse {
  content: string | null
  toolCalls: ToolCall[] | null
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
}

// ============ Agent 相关 ============

export interface AgentConfig {
  name: string
  llm: LLMConfig
  systemPrompt: string
  tools?: Tool[]
  maxIterations?: number
}

export type AgentEvent =
  | { type: 'llm_start'; messages: Message[] }
  | { type: 'llm_response'; response: LLMResponse }
  | { type: 'tool_start'; calls: ToolCall[] }
  | { type: 'tool_result'; results: ToolExecutionResult[] }
  | { type: 'complete'; response: string }
  | { type: 'error'; error: Error }

export interface ToolExecutionResult {
  toolCallId: string
  name: string
  result: string
  isError: boolean
}

export type EventHandler = (event: AgentEvent) => void
```

### 8.2 agent.ts（完整实现）

```typescript
import OpenAI from 'openai'
import {
  Tool, OpenAITool, ToolCall, Message, AssistantMessage, ToolMessage,
  LLMConfig, LLMResponse, AgentConfig, AgentEvent, EventHandler,
  ToolExecutionResult
} from './types'

// ============ 工具注册表 ============

class ToolRegistry {
  private tools = new Map<string, Tool>()

  register(tool: Tool): this {
    this.tools.set(tool.name, tool)
    return this
  }

  registerAll(tools: Tool[]): this {
    tools.forEach(t => this.register(t))
    return this
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  toOpenAIFormat(): OpenAITool[] {
    return this.getAll().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }
}

// ============ 工具执行器 ============

class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async executeOne(call: ToolCall): Promise<ToolExecutionResult> {
    const tool = this.registry.get(call.function.name)
    
    if (!tool) {
      return {
        toolCallId: call.id,
        name: call.function.name,
        result: `Error: Tool "${call.function.name}" not found`,
        isError: true
      }
    }

    try {
      const args = JSON.parse(call.function.arguments)
      const result = await tool.execute(args)
      return {
        toolCallId: call.id,
        name: call.function.name,
        result,
        isError: false
      }
    } catch (error) {
      return {
        toolCallId: call.id,
        name: call.function.name,
        result: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      }
    }
  }

  async executeAll(calls: ToolCall[]): Promise<ToolExecutionResult[]> {
    return Promise.all(calls.map(call => this.executeOne(call)))
  }
}

// ============ OpenAI 客户端 ============

class OpenAIClient {
  private client: OpenAI
  private config: LLMConfig

  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    })
    this.config = config
  }

  async chat(messages: Message[], tools?: OpenAITool[]): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: messages as any,
      tools: tools?.length ? tools : undefined,
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature ?? 0.7
    })

    const choice = response.choices[0]
    return {
      content: choice.message.content,
      toolCalls: (choice.message.tool_calls as ToolCall[]) ?? null,
      finishReason: choice.finish_reason as LLMResponse['finishReason']
    }
  }
}

// ============ SimpleAgent ============

export class SimpleAgent {
  private llm: OpenAIClient
  private registry: ToolRegistry
  private executor: ToolExecutor
  private messages: Message[] = []
  private eventHandlers: EventHandler[] = []
  private config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
    this.llm = new OpenAIClient(config.llm)
    
    this.registry = new ToolRegistry()
    if (config.tools) {
      this.registry.registerAll(config.tools)
    }
    this.executor = new ToolExecutor(this.registry)

    this.messages.push({
      role: 'system',
      content: config.systemPrompt
    })
  }

  on(handler: EventHandler): this {
    this.eventHandlers.push(handler)
    return this
  }

  private emit(event: AgentEvent): void {
    this.eventHandlers.forEach(h => h(event))
  }

  /**
   * 核心：运行 Agent Loop
   */
  async run(userInput: string): Promise<string> {
    // 1. 添加用户消息
    this.messages.push({
      role: 'user',
      content: userInput
    })

    const maxIterations = this.config.maxIterations ?? 10
    let iteration = 0

    // 2. Agent Loop
    while (iteration < maxIterations) {
      iteration++

      // 2.1 调用 LLM
      this.emit({ type: 'llm_start', messages: [...this.messages] })
      
      let response: LLMResponse
      try {
        response = await this.llm.chat(
          this.messages,
          this.registry.toOpenAIFormat()
        )
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        this.emit({ type: 'error', error: err })
        throw err
      }
      
      this.emit({ type: 'llm_response', response })

      // 2.2 添加助手消息
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: response.content,
        tool_calls: response.toolCalls ?? undefined
      }
      this.messages.push(assistantMessage)

      // 2.3 判断：是否需要调用工具？
      if (!response.toolCalls || response.toolCalls.length === 0) {
        // N: 无工具调用，返回最终响应
        const finalResponse = response.content ?? ''
        this.emit({ type: 'complete', response: finalResponse })
        return finalResponse
      }

      // Y: 有工具调用
      this.emit({ type: 'tool_start', calls: response.toolCalls })

      // 2.4 执行工具（并行）
      const results = await this.executor.executeAll(response.toolCalls)
      this.emit({ type: 'tool_result', results })

      // 2.5 添加工具结果消息
      for (const result of results) {
        const toolMessage: ToolMessage = {
          role: 'tool',
          tool_call_id: result.toolCallId,
          content: result.result
        }
        this.messages.push(toolMessage)
      }

      // 继续循环
    }

    throw new Error(`Agent exceeded maximum iterations (${maxIterations})`)
  }

  reset(): void {
    this.messages = [{
      role: 'system',
      content: this.config.systemPrompt
    }]
  }

  addTool(tool: Tool): this {
    this.registry.register(tool)
    return this
  }

  getMessages(): Message[] {
    return [...this.messages]
  }
}
```

## 9. MCP 集成

### 9.1 MCP 概述

MCP (Model Context Protocol) 是一个开放协议，允许 Agent 动态连接外部工具服务器。通过 MCP，Agent 可以：

- 连接到任意 MCP 兼容的工具服务器
- 动态发现和使用远程工具
- 无需硬编码即可扩展能力

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Agent with MCP Integration                       │
│                                                                      │
│  ┌──────────┐     ┌──────────────┐     ┌───────────────────────┐    │
│  │  Agent   │────►│ Tool Registry │────►│  Local Tools          │    │
│  │          │     │              │     │  (calculator, etc.)   │    │
│  │          │     │              │     └───────────────────────┘    │
│  │          │     │              │                                   │
│  │          │     │              │     ┌───────────────────────┐    │
│  │          │     │              │────►│  MCP Client           │    │
│  │          │     │              │     │  ┌─────────────────┐  │    │
│  │          │     │              │     │  │ MCP Server 1    │  │    │
│  │          │     │              │     │  │ (filesystem)    │  │    │
│  │          │     │              │     │  └─────────────────┘  │    │
│  │          │     │              │     │  ┌─────────────────┐  │    │
│  │          │     │              │     │  │ MCP Server 2    │  │    │
│  │          │     │              │     │  │ (web-search)    │  │    │
│  │          │     │              │     │  └─────────────────┘  │    │
│  └──────────┘     └──────────────┘     └───────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 MCP 类型定义

```typescript
/**
 * MCP 服务器配置
 */
interface MCPServerConfig {
  /** 服务器唯一标识 */
  name: string
  /** 传输类型 */
  transport: 'stdio' | 'sse'
  /** stdio: 启动命令 */
  command?: string
  /** stdio: 命令参数 */
  args?: string[]
  /** stdio: 环境变量 */
  env?: Record<string, string>
  /** sse: 服务器 URL */
  url?: string
}

/**
 * MCP 工具定义（来自 MCP 服务器）
 */
interface MCPToolDefinition {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

/**
 * MCP 工具调用结果
 */
interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}
```

### 9.3 MCP 客户端实现

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

/**
 * MCP 客户端 - 管理与单个 MCP 服务器的连接
 */
class MCPClient {
  private client: Client
  private transport: StdioClientTransport | SSEClientTransport
  private config: MCPServerConfig
  private connected = false

  constructor(config: MCPServerConfig) {
    this.config = config
    this.client = new Client(
      { name: 'simple-agent', version: '1.0.0' },
      { capabilities: {} }
    )
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<void> {
    if (this.connected) return

    if (this.config.transport === 'stdio') {
      if (!this.config.command) {
        throw new Error('stdio transport requires command')
      }
      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args,
        env: { ...process.env, ...this.config.env }
      })
    } else if (this.config.transport === 'sse') {
      if (!this.config.url) {
        throw new Error('sse transport requires url')
      }
      this.transport = new SSEClientTransport(new URL(this.config.url))
    } else {
      throw new Error(`Unsupported transport: ${this.config.transport}`)
    }

    await this.client.connect(this.transport)
    this.connected = true
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return
    await this.client.close()
    this.connected = false
  }

  /**
   * 列出服务器提供的所有工具
   */
  async listTools(): Promise<MCPToolDefinition[]> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server')
    }
    const response = await this.client.listTools()
    return response.tools
  }

  /**
   * 调用工具
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server')
    }
    const result = await this.client.callTool({ name, arguments: args })
    return result as MCPToolResult
  }

  get serverName(): string {
    return this.config.name
  }

  get isConnected(): boolean {
    return this.connected
  }
}
```

### 9.4 MCP 工具适配器

将 MCP 工具转换为本地 `Tool` 接口，实现无缝集成：

```typescript
/**
 * 将 MCP 工具适配为本地 Tool 接口
 */
function adaptMCPTool(client: MCPClient, mcpTool: MCPToolDefinition): Tool {
  return {
    // 添加前缀避免命名冲突
    name: `${client.serverName}__${mcpTool.name}`,
    description: mcpTool.description ?? `Tool from ${client.serverName}`,
    parameters: {
      type: 'object',
      properties: (mcpTool.inputSchema.properties ?? {}) as Record<string, ToolParameter>,
      required: mcpTool.inputSchema.required
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      try {
        const result = await client.callTool(mcpTool.name, args)
        
        // 将 MCP 结果转换为字符串
        const textContent = result.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n')
        
        if (result.isError) {
          return `Error: ${textContent}`
        }
        
        return textContent || JSON.stringify(result.content)
      } catch (error) {
        return `Error calling MCP tool: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
```

### 9.5 MCP 管理器

管理多个 MCP 服务器连接：

```typescript
/**
 * MCP 管理器 - 管理多个 MCP 服务器
 */
class MCPManager {
  private clients = new Map<string, MCPClient>()
  private registry: ToolRegistry

  constructor(registry: ToolRegistry) {
    this.registry = registry
  }

  /**
   * 添加并连接 MCP 服务器
   */
  async addServer(config: MCPServerConfig): Promise<Tool[]> {
    // 创建客户端
    const client = new MCPClient(config)
    
    // 连接
    await client.connect()
    this.clients.set(config.name, client)

    // 获取工具列表
    const mcpTools = await client.listTools()
    
    // 适配并注册工具
    const tools: Tool[] = []
    for (const mcpTool of mcpTools) {
      const tool = adaptMCPTool(client, mcpTool)
      this.registry.register(tool)
      tools.push(tool)
    }

    console.log(`[MCP] Connected to ${config.name}, loaded ${tools.length} tools`)
    return tools
  }

  /**
   * 移除 MCP 服务器
   */
  async removeServer(name: string): Promise<void> {
    const client = this.clients.get(name)
    if (client) {
      await client.disconnect()
      this.clients.delete(name)
      // 注意：这里应该也从 registry 中移除相关工具
    }
  }

  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.disconnect()
    }
    this.clients.clear()
  }

  /**
   * 获取所有已连接服务器
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys())
  }
}
```

### 9.6 集成到 SimpleAgent

更新 `AgentConfig` 和 `SimpleAgent` 以支持 MCP：

```typescript
/**
 * 更新后的 Agent 配置
 */
interface AgentConfig {
  name: string
  llm: LLMConfig
  systemPrompt: string
  tools?: Tool[]
  mcpServers?: MCPServerConfig[]  // 新增: MCP 服务器配置
  maxIterations?: number
}

/**
 * 支持 MCP 的 SimpleAgent
 */
class SimpleAgent {
  private llm: OpenAIClient
  private registry: ToolRegistry
  private executor: ToolExecutor
  private mcpManager: MCPManager
  private messages: Message[] = []
  private eventHandlers: EventHandler[] = []
  private config: AgentConfig
  private initialized = false

  constructor(config: AgentConfig) {
    this.config = config
    this.llm = new OpenAIClient(config.llm)
    
    this.registry = new ToolRegistry()
    if (config.tools) {
      this.registry.registerAll(config.tools)
    }
    
    this.executor = new ToolExecutor(this.registry)
    this.mcpManager = new MCPManager(this.registry)

    this.messages.push({
      role: 'system',
      content: config.systemPrompt
    })
  }

  /**
   * 初始化 Agent（连接 MCP 服务器）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // 连接所有配置的 MCP 服务器
    if (this.config.mcpServers) {
      for (const serverConfig of this.config.mcpServers) {
        try {
          await this.mcpManager.addServer(serverConfig)
        } catch (error) {
          console.error(`[MCP] Failed to connect to ${serverConfig.name}:`, error)
        }
      }
    }

    this.initialized = true
  }

  /**
   * 运行时添加 MCP 服务器
   */
  async addMCPServer(config: MCPServerConfig): Promise<Tool[]> {
    return this.mcpManager.addServer(config)
  }

  /**
   * 核心：运行 Agent Loop（需先初始化）
   */
  async run(userInput: string): Promise<string> {
    // 确保已初始化
    if (!this.initialized) {
      await this.initialize()
    }

    // ... 其余 Agent Loop 逻辑不变 ...
    // （与之前的实现相同）
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    await this.mcpManager.disconnectAll()
  }
}
```

### 9.7 MCP 使用示例

#### 示例 1：使用 filesystem MCP 服务器

```typescript
const agent = new SimpleAgent({
  name: 'FileBot',
  llm: {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY!
  },
  systemPrompt: '你是一个文件助手，可以读取和操作文件。',
  mcpServers: [
    {
      name: 'filesystem',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp']
    }
  ]
})

// 初始化（连接 MCP 服务器）
await agent.initialize()

// 使用 MCP 工具
const response = await agent.run('列出 /tmp 目录下的所有文件')
console.log(response)

// 清理
await agent.dispose()
```

#### 示例 2：多 MCP 服务器

```typescript
const agent = new SimpleAgent({
  name: 'SuperBot',
  llm: {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY!
  },
  systemPrompt: '你是一个全能助手，可以操作文件和搜索网络。',
  mcpServers: [
    {
      name: 'filesystem',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()]
    },
    {
      name: 'brave-search',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@anthropic/server-brave-search'],
      env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY! }
    }
  ],
  tools: [
    // 本地工具
    calculatorTool
  ]
})

await agent.initialize()

// 混合使用本地工具和 MCP 工具
const response = await agent.run(
  '搜索最新的 AI 新闻，然后把结果保存到 news.txt 文件中'
)

await agent.dispose()
```

#### 示例 3：动态添加 MCP 服务器

```typescript
const agent = new SimpleAgent({
  name: 'DynamicBot',
  llm: { provider: 'openai', model: 'gpt-4o', apiKey: '...' },
  systemPrompt: '你是一个助手。'
})

await agent.initialize()

// 运行时动态添加 MCP 服务器
const tools = await agent.addMCPServer({
  name: 'github',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN! }
})

console.log('Loaded MCP tools:', tools.map(t => t.name))

// 现在可以使用 GitHub 工具
const response = await agent.run('列出我的 GitHub 仓库')

await agent.dispose()
```

### 9.8 MCP 工具命名约定

为避免工具命名冲突，MCP 工具名采用 `{serverName}__{toolName}` 格式：

| MCP Server | MCP Tool | 适配后的名称 |
|------------|----------|--------------|
| filesystem | read_file | `filesystem__read_file` |
| filesystem | write_file | `filesystem__write_file` |
| brave-search | search | `brave-search__search` |
| github | list_repos | `github__list_repos` |

LLM 在调用工具时会使用完整名称，ToolRegistry 会正确路由到对应的 MCP 客户端。

### 9.9 MCP 架构流程图

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MCP Integration Flow                           │
│                                                                       │
│  1. Initialize                                                        │
│     ┌─────────┐    ┌───────────────┐    ┌──────────────────────┐     │
│     │ Config  │───►│ MCPManager    │───►│ MCPClient (per server)│     │
│     │         │    │ addServer()   │    │ connect()             │     │
│     └─────────┘    └───────────────┘    └──────────────────────┘     │
│                           │                        │                  │
│                           │                        ▼                  │
│                           │             ┌──────────────────────┐     │
│                           │             │ listTools()          │     │
│                           │             │ → MCPToolDefinition[]│     │
│                           │             └──────────┬───────────┘     │
│                           │                        │                  │
│                           │                        ▼                  │
│                           │             ┌──────────────────────┐     │
│                           └────────────►│ adaptMCPTool()       │     │
│                                         │ → Tool[]             │     │
│                                         └──────────┬───────────┘     │
│                                                    │                  │
│                                                    ▼                  │
│                                         ┌──────────────────────┐     │
│                                         │ ToolRegistry         │     │
│                                         │ register(tool)       │     │
│                                         └──────────────────────┘     │
│                                                                       │
│  2. Agent Loop (tool execution)                                       │
│     ┌─────────┐    ┌───────────────┐    ┌──────────────────────┐     │
│     │ LLM     │───►│ ToolExecutor  │───►│ Tool.execute()       │     │
│     │tool_call│    │ executeOne()  │    │                      │     │
│     └─────────┘    └───────────────┘    └──────────┬───────────┘     │
│                                                    │                  │
│                         ┌──────────────────────────┘                  │
│                         ▼                                             │
│              ┌─────────────────────┐                                  │
│              │ Is MCP tool?        │                                  │
│              │ (name has __)       │                                  │
│              └──────────┬──────────┘                                  │
│                         │                                             │
│            ┌────────────┴────────────┐                                │
│            │ YES                     │ NO                             │
│            ▼                         ▼                                │
│  ┌──────────────────┐    ┌──────────────────┐                        │
│  │ MCPClient        │    │ Local execute()  │                        │
│  │ callTool()       │    │                  │                        │
│  └────────┬─────────┘    └────────┬─────────┘                        │
│           │                       │                                   │
│           └───────────┬───────────┘                                   │
│                       ▼                                               │
│            ┌──────────────────┐                                       │
│            │ Tool Result      │                                       │
│            └──────────────────┘                                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## 10. 与 0001 设计的对比

| 方面 | 0001-simple-agent-design | 本设计 (0004) |
|------|--------------------------|---------------|
| **复杂度** | 完整企业级设计 | 最小完整实现 |
| **流式支持** | ✅ AsyncGenerator | ❌ 暂不支持（简化） |
| **MCP 集成** | ✅ 完整支持 | ✅ 支持（精简实现） |
| **权限系统** | ✅ 完整实现 | ❌ 暂不支持（简化） |
| **消息压缩** | ✅ 支持 | ❌ 暂不支持（简化） |
| **重试机制** | ✅ 指数退避 | ❌ 暂不支持（简化） |
| **代码量** | ~1000 行 | ~500 行 |
| **学习曲线** | 中等 | 低 |

## 11. 扩展方向

如需扩展，可按优先级添加：

1. **流式支持** - 使用 `async generator` 实现实时输出
2. **重试机制** - 处理 API 限流和网络错误
3. **权限系统** - 工具调用前的权限检查
4. **消息压缩** - 长对话的上下文管理
5. **多 Provider** - 支持 Anthropic、Gemini 等

## 12. 完整文件结构（含 MCP）

```
simple-agent/
├── src/
│   ├── index.ts              # 主入口
│   ├── types.ts              # 类型定义
│   ├── agent.ts              # SimpleAgent
│   ├── llm/
│   │   ├── client.ts         # LLM 接口
│   │   └── openai.ts         # OpenAI 实现
│   ├── tool/
│   │   ├── registry.ts       # 工具注册表
│   │   └── executor.ts       # 工具执行器
│   └── mcp/
│       ├── client.ts         # MCP 客户端
│       ├── manager.ts        # MCP 管理器
│       └── adapter.ts        # 工具适配器
├── examples/
│   ├── basic.ts              # 基础示例
│   ├── multi-tool.ts         # 多工具示例
│   ├── mcp-filesystem.ts     # MCP 文件系统示例
│   └── mcp-multi-server.ts   # 多 MCP 服务器示例
├── package.json
└── tsconfig.json
```

---

本设计遵循 KISS 原则，提供了一个**最小但完整**的 Agent Loop 实现，包含 MCP 集成支持，适合作为学习和实验的起点。
