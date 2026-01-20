/**
 * Simple Agent SDK
 *
 * A lightweight multi-turn agent SDK with tool calling support.
 *
 * @example
 * ```typescript
 * import { Agent, createAgent } from "simple-agent"
 *
 * const agent = createAgent({
 *   model: "gpt-4o",
 *   systemPrompt: "You are a helpful assistant."
 * })
 *
 * // Add custom tools
 * agent.addTool({
 *   name: "get_weather",
 *   description: "Get current weather for a location",
 *   parameters: {
 *     type: "object",
 *     properties: {
 *       location: { type: "string", description: "City name" }
 *     },
 *     required: ["location"]
 *   },
 *   execute: async (args) => {
 *     const { location } = args as { location: string }
 *     return { output: `Weather in ${location}: 22°C, sunny` }
 *   }
 * })
 *
 * // Run the agent
 * const response = await agent.run("What's the weather in Tokyo?")
 * console.log(response)
 * ```
 */

// Load .env configuration automatically
import "./config.js"

// Config utilities
export { loadEnv, getConfig } from "./config.js"

// Core types
export type {
  Message,
  MessageContent,
  TextContent,
  ToolCallContent,
  ToolResultContent,
  Tool,
  ToolResult,
  ToolDefinition,
  JSONSchema,
  Session,
  SessionStatus,
  AgentConfig,
  AgentEvent,
  MCPConfig,
  MCPTransport,
  MCPToolDefinition,
  ExecutionContext,
  RetryConfig,
  LLMEvent,
  LLMInput,
  LLMOutput
} from "./types.js"

// Agent
export { Agent, createAgent } from "./agent/index.js"
export type { AgentOptions } from "./agent/index.js"
export { streamAgent, runAgent, query } from "./agent/index.js"

// Tool
export { ToolRegistry, createToolRegistry } from "./tool/index.js"
export { ToolExecutor, createToolExecutor } from "./tool/index.js"

// LLM
export { LLMClient, createLLMClient } from "./llm/index.js"
export type { LLMClientConfig } from "./llm/index.js"

// Session
export {
  createSession,
  addUserMessage,
  addAssistantMessage,
  addToolMessage,
  getLastMessage,
  getMessageText,
  setSessionStatus,
  clearMessages,
  cloneSession,
  generateId
} from "./session/index.js"
export type { SessionConfig } from "./session/index.js"

// MCP
export { MCPClient, createMCPClient } from "./mcp/index.js"
export { MCPManager, createMCPManager } from "./mcp/index.js"

/**
 * Helper to define a tool with proper typing
 */
export function defineTool<T = unknown>(tool: {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
  execute: (args: T) => Promise<{ output: string; error?: string }>
}): import("./types.js").Tool {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters as import("./types.js").JSONSchema,
    execute: tool.execute as (args: unknown) => Promise<import("./types.js").ToolResult>
  }
}
