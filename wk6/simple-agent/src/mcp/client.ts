/**
 * MCP Client - connects to MCP servers and exposes their tools
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { MCPConfig, Tool, ToolResult, JSONSchema } from "../types.js"

export class MCPClient {
  private client: Client
  private config: MCPConfig
  private connected = false
  private transport: StdioClientTransport | SSEClientTransport | null = null

  constructor(config: MCPConfig) {
    this.config = config
    this.client = new Client({
      name: "simple-agent",
      version: "1.0.0"
    }, {
      capabilities: {}
    })
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) return

    if (this.config.transport === "stdio") {
      if (!this.config.command) {
        throw new Error("Command is required for stdio transport")
      }

      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args,
        env: this.config.env
      })
    } else if (this.config.transport === "sse") {
      if (!this.config.url) {
        throw new Error("URL is required for SSE transport")
      }

      this.transport = new SSEClientTransport(new URL(this.config.url))
    } else {
      throw new Error(`Unsupported transport: ${this.config.transport}`)
    }

    await this.client.connect(this.transport)
    this.connected = true
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return

    await this.client.close()
    this.connected = false
    this.transport = null
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * List tools available from the MCP server
   */
  async listTools(): Promise<Tool[]> {
    if (!this.connected) {
      throw new Error("Not connected to MCP server")
    }

    const response = await this.client.listTools()
    return response.tools.map(mcpTool => this.adaptTool(mcpTool))
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: unknown): Promise<ToolResult> {
    if (!this.connected) {
      throw new Error("Not connected to MCP server")
    }

    try {
      const result = await this.client.callTool({
        name,
        arguments: args as Record<string, unknown>
      })

      // Extract text content from result
      const content = result.content as Array<{
        type: string
        text?: string
        mimeType?: string
        uri?: string
      }>

      const output = content
        .map((c) => {
          if (c.type === "text") return c.text ?? ""
          if (c.type === "image") return `[Image: ${c.mimeType}]`
          if (c.type === "resource") return `[Resource: ${c.uri}]`
          return JSON.stringify(c)
        })
        .join("\n")

      return {
        output,
        metadata: { isError: result.isError }
      }
    } catch (error) {
      return {
        output: "",
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Adapt MCP tool to internal Tool interface
   */
  private adaptTool(mcpTool: {
    name: string
    description?: string
    inputSchema: unknown
  }): Tool {
    const client = this

    return {
      name: `${this.config.name}__${mcpTool.name}`,
      description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
      parameters: mcpTool.inputSchema as JSONSchema,
      execute: async (args: unknown): Promise<ToolResult> => {
        return client.callTool(mcpTool.name, args)
      }
    }
  }

  /**
   * Get the MCP server name
   */
  getName(): string {
    return this.config.name
  }
}

/**
 * Create a new MCP client
 */
export function createMCPClient(config: MCPConfig): MCPClient {
  return new MCPClient(config)
}
