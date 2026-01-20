/**
 * Tool Registry - manages all available tools
 */

import type { Tool, ToolDefinition } from "../types.js"

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered, overwriting...`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * Register multiple tools at once
   */
  registerMany(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * List all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get all tool names
   */
  names(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Get the number of registered tools
   */
  size(): number {
    return this.tools.size
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear()
  }

  /**
   * Convert to OpenAI tool definitions format
   */
  toToolDefinitions(): ToolDefinition[] {
    return this.list().map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }
}

/**
 * Create a new tool registry
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry()
}
