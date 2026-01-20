/**
 * Tool Executor - executes tool calls and handles results
 */

import type { ToolCallContent, ToolResultContent, ExecutionContext } from "../types.js"
import type { ToolRegistry } from "./registry.js"

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  /**
   * Execute a single tool call
   */
  async execute(
    call: ToolCallContent,
    ctx: ExecutionContext
  ): Promise<ToolResultContent> {
    const tool = this.registry.get(call.name)

    if (!tool) {
      return {
        type: "tool_result",
        toolCallId: call.id,
        result: `Tool not found: ${call.name}`,
        isError: true
      }
    }

    // Check for abort signal
    if (ctx.abortSignal?.aborted) {
      return {
        type: "tool_result",
        toolCallId: call.id,
        result: "Execution aborted",
        isError: true
      }
    }

    try {
      const result = await tool.execute(call.arguments)

      return {
        type: "tool_result",
        toolCallId: call.id,
        result: result.error ? result.error : result.output,
        isError: !!result.error
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        type: "tool_result",
        toolCallId: call.id,
        result: errorMessage,
        isError: true
      }
    }
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeMany(
    calls: ToolCallContent[],
    ctx: ExecutionContext
  ): Promise<ToolResultContent[]> {
    return Promise.all(
      calls.map(call => this.execute(call, ctx))
    )
  }

  /**
   * Execute multiple tool calls sequentially
   */
  async executeSequential(
    calls: ToolCallContent[],
    ctx: ExecutionContext
  ): Promise<ToolResultContent[]> {
    const results: ToolResultContent[] = []

    for (const call of calls) {
      if (ctx.abortSignal?.aborted) {
        results.push({
          type: "tool_result",
          toolCallId: call.id,
          result: "Execution aborted",
          isError: true
        })
        continue
      }

      const result = await this.execute(call, ctx)
      results.push(result)
    }

    return results
  }
}

/**
 * Create a new tool executor
 */
export function createToolExecutor(registry: ToolRegistry): ToolExecutor {
  return new ToolExecutor(registry)
}
