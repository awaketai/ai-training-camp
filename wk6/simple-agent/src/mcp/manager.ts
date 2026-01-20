/**
 * MCP Manager - manages multiple MCP server connections
 */

import type { MCPConfig, Tool } from "../types.js"
import { MCPClient } from "./client.js"

export class MCPManager {
  private clients: Map<string, MCPClient> = new Map()
  private toolsByServer: Map<string, Tool[]> = new Map()

  /**
   * Connect to an MCP server and return its tools
   */
  async connect(config: MCPConfig): Promise<Tool[]> {
    // Check if already connected
    if (this.clients.has(config.name)) {
      const existingClient = this.clients.get(config.name)!
      if (existingClient.isConnected()) {
        return this.toolsByServer.get(config.name) ?? []
      }
    }

    // Create new client and connect
    const client = new MCPClient(config)
    await client.connect()

    // Get tools from the server
    const tools = await client.listTools()

    // Store client and tools
    this.clients.set(config.name, client)
    this.toolsByServer.set(config.name, tools)

    return tools
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(name: string): Promise<void> {
    const client = this.clients.get(name)
    if (client) {
      await client.disconnect()
      this.clients.delete(name)
      this.toolsByServer.delete(name)
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values())
      .map(client => client.disconnect())

    await Promise.all(disconnectPromises)

    this.clients.clear()
    this.toolsByServer.clear()
  }

  /**
   * Get tools from a specific MCP server
   */
  getTools(name: string): Tool[] {
    return this.toolsByServer.get(name) ?? []
  }

  /**
   * Get all tools from all connected MCP servers
   */
  getAllTools(): Tool[] {
    const allTools: Tool[] = []
    for (const tools of this.toolsByServer.values()) {
      allTools.push(...tools)
    }
    return allTools
  }

  /**
   * Check if connected to a specific MCP server
   */
  isConnected(name: string): boolean {
    const client = this.clients.get(name)
    return client?.isConnected() ?? false
  }

  /**
   * Get list of connected server names
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys())
      .filter(name => this.clients.get(name)?.isConnected())
  }

  /**
   * Get a specific MCP client
   */
  getClient(name: string): MCPClient | undefined {
    return this.clients.get(name)
  }
}

/**
 * Create a new MCP manager
 */
export function createMCPManager(): MCPManager {
  return new MCPManager()
}
