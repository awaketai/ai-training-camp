/**
 * Agent - main agent class for convenient usage
 */

import type {
  Session,
  Tool,
  AgentEvent,
  Message,
  TextContent
} from "../types.js"
import { LLMClient, type LLMClientConfig } from "../llm/index.js"
import { ToolRegistry } from "../tool/index.js"
import { createSession, addUserMessage, generateId } from "../session/index.js"
import { streamAgent, runAgent } from "./loop.js"
import { MCPManager } from "../mcp/index.js"
import type { MCPConfig } from "../types.js"

export interface AgentOptions {
  model?: string
  systemPrompt?: string
  tools?: Tool[]
  maxSteps?: number
  llmConfig?: LLMClientConfig
}

/**
 * Agent class - provides a convenient interface for creating and running agents
 */
export class Agent {
  private llmClient: LLMClient
  private registry: ToolRegistry
  private mcpManager: MCPManager
  private model: string
  private systemPrompt: string
  private maxSteps: number
  private session: Session

  constructor(options: AgentOptions = {}) {
    this.llmClient = new LLMClient(options.llmConfig)
    this.registry = new ToolRegistry()
    this.mcpManager = new MCPManager()
    this.model = options.model ?? "gpt-4o"
    this.systemPrompt = options.systemPrompt ?? "You are a helpful assistant."
    this.maxSteps = options.maxSteps ?? 50

    // Register initial tools
    if (options.tools) {
      this.registry.registerMany(options.tools)
    }

    // Create initial session
    this.session = createSession({
      systemPrompt: this.systemPrompt,
      model: this.model,
      tools: this.registry.list()
    })
  }

  /**
   * Add a tool to the agent
   */
  addTool(tool: Tool): this {
    this.registry.register(tool)
    this.session.tools = this.registry.list()
    return this
  }

  /**
   * Add multiple tools
   */
  addTools(tools: Tool[]): this {
    this.registry.registerMany(tools)
    this.session.tools = this.registry.list()
    return this
  }

  /**
   * Remove a tool by name
   */
  removeTool(name: string): boolean {
    const result = this.registry.unregister(name)
    this.session.tools = this.registry.list()
    return result
  }

  /**
   * Connect to an MCP server and load its tools
   */
  async connectMCP(config: MCPConfig): Promise<Tool[]> {
    const tools = await this.mcpManager.connect(config)
    this.registry.registerMany(tools)
    this.session.tools = this.registry.list()
    return tools
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectMCP(name: string): Promise<void> {
    const mcpTools = this.mcpManager.getTools(name)
    for (const tool of mcpTools) {
      this.registry.unregister(tool.name)
    }
    await this.mcpManager.disconnect(name)
    this.session.tools = this.registry.list()
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAllMCP(): Promise<void> {
    await this.mcpManager.disconnectAll()
  }

  /**
   * Run the agent with a user message (non-streaming)
   */
  async run(
    message: string,
    onEvent?: (event: AgentEvent) => void
  ): Promise<string> {
    // Add user message
    addUserMessage(this.session, message)

    // Run agent loop
    await runAgent(this.session, {
      model: this.model,
      systemPrompt: this.systemPrompt,
      tools: this.registry.list(),
      maxSteps: this.maxSteps,
      onEvent
    }, this.llmClient)

    // Return last assistant text
    return this.getLastResponse()
  }

  /**
   * Stream the agent response
   */
  async *stream(message: string): AsyncGenerator<AgentEvent> {
    // Add user message
    addUserMessage(this.session, message)

    // Stream agent loop
    yield* streamAgent(this.session, {
      model: this.model,
      systemPrompt: this.systemPrompt,
      tools: this.registry.list(),
      maxSteps: this.maxSteps
    }, this.llmClient)
  }

  /**
   * Get the last assistant response text
   */
  getLastResponse(): string {
    const lastMessage = this.session.messages
      .filter(m => m.role === "assistant")
      .pop()

    if (!lastMessage) return ""

    return lastMessage.content
      .filter((c): c is TextContent => c.type === "text")
      .map(c => c.text)
      .join("\n")
  }

  /**
   * Get all messages in the session
   */
  getMessages(): Message[] {
    return [...this.session.messages]
  }

  /**
   * Get the current session
   */
  getSession(): Session {
    return this.session
  }

  /**
   * Clear the conversation history
   */
  clearHistory(): void {
    this.session.messages = []
    this.session.status = "idle"
  }

  /**
   * Start a new session
   */
  newSession(): Session {
    this.session = createSession({
      systemPrompt: this.systemPrompt,
      model: this.model,
      tools: this.registry.list()
    })
    return this.session
  }

  /**
   * Get all registered tools
   */
  getTools(): Tool[] {
    return this.registry.list()
  }

  /**
   * Update system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt
    this.session.systemPrompt = prompt
  }

  /**
   * Update model
   */
  setModel(model: string): void {
    this.model = model
    this.session.model = model
  }
}

/**
 * Create a new agent
 */
export function createAgent(options?: AgentOptions): Agent {
  return new Agent(options)
}
