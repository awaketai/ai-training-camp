/**
 * Core type definitions for the Simple Agent SDK
 */

// ============ Message Types ============

export interface Message {
  id: string
  role: "user" | "assistant" | "tool"
  content: MessageContent[]
  createdAt: Date
}

export type MessageContent =
  | TextContent
  | ToolCallContent
  | ToolResultContent

export interface TextContent {
  type: "text"
  text: string
}

export interface ToolCallContent {
  type: "tool_call"
  id: string           // Tool call unique ID
  name: string         // Tool name
  arguments: unknown   // Tool arguments (JSON)
}

export interface ToolResultContent {
  type: "tool_result"
  toolCallId: string   // Corresponding tool call ID
  result: string       // Execution result
  isError?: boolean    // Whether it's an error
}

// ============ Tool Types ============

export interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  description?: string
  items?: JSONSchema
  enum?: unknown[]
  [key: string]: unknown
}

export interface Tool {
  name: string
  description: string
  parameters: JSONSchema
  execute: (args: unknown) => Promise<ToolResult>
}

export interface ToolResult {
  output: string
  metadata?: Record<string, unknown>
  error?: string
}

export interface ToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: JSONSchema
  }
}

// ============ Session Types ============

export type SessionStatus = "idle" | "running" | "completed" | "error"

export interface Session {
  id: string
  messages: Message[]
  systemPrompt: string
  model: string
  tools: Tool[]
  status: SessionStatus
}

// ============ LLM Types ============

export interface LLMInput {
  model: string
  messages: Message[]
  systemPrompt: string
  tools: ToolDefinition[]
  abortSignal?: AbortSignal
}

export interface LLMOutput {
  content: MessageContent[]
  finishReason: "stop" | "tool_calls" | "max_tokens" | "error"
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

export type LLMEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call_start"; id: string; name: string }
  | { type: "tool_call_delta"; id: string; arguments: string }
  | { type: "tool_call_end"; id: string; name: string; arguments: string }
  | { type: "finish"; reason: string; usage: { inputTokens: number; outputTokens: number } }
  | { type: "error"; error: Error }

// ============ Agent Types ============

export interface AgentConfig {
  model: string
  systemPrompt: string
  tools?: Tool[]
  maxSteps?: number
  onEvent?: (event: AgentEvent) => void
}

export type AgentEvent =
  | { type: "message_start"; role: "assistant" }
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: unknown }
  | { type: "tool_result"; name: string; result: string; isError?: boolean }
  | { type: "message_end"; finishReason: string }
  | { type: "step"; step: number; maxSteps: number }
  | { type: "error"; error: Error }

// ============ MCP Types ============

export type MCPTransport = "stdio" | "sse"

export interface MCPConfig {
  name: string
  transport: MCPTransport
  command?: string          // stdio: startup command
  args?: string[]           // stdio: command arguments
  url?: string              // sse: server URL
  env?: Record<string, string>
}

export interface MCPToolDefinition {
  name: string
  description?: string
  inputSchema: JSONSchema
}

// ============ Execution Context ============

export interface ExecutionContext {
  sessionId: string
  messageId: string
  abortSignal?: AbortSignal
}

// ============ Retry Config ============

export interface RetryConfig {
  maxRetries: number
  baseDelay: number        // Base delay (ms)
  maxDelay: number         // Max delay (ms)
  retryableErrors: string[]
}
