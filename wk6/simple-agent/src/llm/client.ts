/**
 * LLM Client - handles communication with OpenAI API
 */

import OpenAI from "openai"
import type {
  Message,
  MessageContent,
  TextContent,
  ToolCallContent,
  ToolResultContent,
  ToolDefinition,
  LLMEvent
} from "../types.js"

export interface LLMClientConfig {
  apiKey?: string
  baseURL?: string
  defaultModel?: string
}

export class LLMClient {
  private client: OpenAI
  private defaultModel: string

  constructor(config: LLMClientConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: config.baseURL ?? process.env.OPENAI_BASE_URL
    })
    this.defaultModel = config.defaultModel ?? process.env.OPENAI_MODEL ?? "gpt-4o"
  }

  /**
   * Convert internal messages to OpenAI format
   */
  private toOpenAIMessages(
    messages: Message[],
    systemPrompt: string
  ): OpenAI.ChatCompletionMessageParam[] {
    const openAIMessages: OpenAI.ChatCompletionMessageParam[] = []

    // Add system message
    if (systemPrompt) {
      openAIMessages.push({
        role: "system",
        content: systemPrompt
      })
    }

    // Convert each message
    for (const msg of messages) {
      if (msg.role === "user") {
        // User message - extract text content
        const textContents = msg.content.filter(
          (c): c is TextContent => c.type === "text"
        )
        const text = textContents.map(c => c.text).join("\n")
        openAIMessages.push({ role: "user", content: text })
      } else if (msg.role === "assistant") {
        // Assistant message - may contain text and tool calls
        const textContents = msg.content.filter(
          (c): c is TextContent => c.type === "text"
        )
        const toolCalls = msg.content.filter(
          (c): c is ToolCallContent => c.type === "tool_call"
        )

        const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: textContents.length > 0 ? textContents.map(c => c.text).join("\n") : null
        }

        if (toolCalls.length > 0) {
          assistantMsg.tool_calls = toolCalls.map(tc => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === "string"
                ? tc.arguments
                : JSON.stringify(tc.arguments)
            }
          }))
        }

        openAIMessages.push(assistantMsg)
      } else if (msg.role === "tool") {
        // Tool results
        const toolResults = msg.content.filter(
          (c): c is ToolResultContent => c.type === "tool_result"
        )

        for (const result of toolResults) {
          openAIMessages.push({
            role: "tool",
            tool_call_id: result.toolCallId,
            content: result.result
          })
        }
      }
    }

    return openAIMessages
  }

  /**
   * Convert OpenAI tools format
   */
  private toOpenAITools(
    tools: ToolDefinition[]
  ): OpenAI.ChatCompletionTool[] | undefined {
    if (tools.length === 0) return undefined

    return tools.map(tool => ({
      type: "function" as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters as Record<string, unknown>
      }
    }))
  }

  /**
   * Stream LLM response with events
   */
  async *streamChat(options: {
    model?: string
    messages: Message[]
    systemPrompt: string
    tools: ToolDefinition[]
    abortSignal?: AbortSignal
  }): AsyncGenerator<LLMEvent> {
    const openAIMessages = this.toOpenAIMessages(options.messages, options.systemPrompt)
    const openAITools = this.toOpenAITools(options.tools)

    try {
      const stream = await this.client.chat.completions.create({
        model: options.model ?? this.defaultModel,
        messages: openAIMessages,
        tools: openAITools,
        stream: true
      }, {
        signal: options.abortSignal
      })

      // Track tool calls being built
      const toolCallsInProgress: Map<number, {
        id: string
        name: string
        arguments: string
      }> = new Map()

      let inputTokens = 0
      let outputTokens = 0
      let finishReason = "stop"

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        const choice = chunk.choices[0]

        // Update usage if available
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens
          outputTokens = chunk.usage.completion_tokens
        }

        // Handle text content
        if (delta?.content) {
          yield { type: "text_delta", text: delta.content }
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index

            if (toolCall.id) {
              // New tool call starting
              toolCallsInProgress.set(index, {
                id: toolCall.id,
                name: toolCall.function?.name ?? "",
                arguments: toolCall.function?.arguments ?? ""
              })
              yield {
                type: "tool_call_start",
                id: toolCall.id,
                name: toolCall.function?.name ?? ""
              }
            } else {
              // Continuing existing tool call
              const existing = toolCallsInProgress.get(index)
              if (existing) {
                if (toolCall.function?.name) {
                  existing.name += toolCall.function.name
                }
                if (toolCall.function?.arguments) {
                  existing.arguments += toolCall.function.arguments
                  yield {
                    type: "tool_call_delta",
                    id: existing.id,
                    arguments: toolCall.function.arguments
                  }
                }
              }
            }
          }
        }

        // Handle finish reason
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason
        }
      }

      // Emit tool_call_end for all completed tool calls
      for (const [_, toolCall] of toolCallsInProgress) {
        yield {
          type: "tool_call_end",
          id: toolCall.id,
          name: toolCall.name,
          arguments: toolCall.arguments
        }
      }

      // Emit finish event
      yield {
        type: "finish",
        reason: finishReason,
        usage: { inputTokens, outputTokens }
      }
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof Error ? error : new Error(String(error))
      }
    }
  }

  /**
   * Non-streaming chat completion
   */
  async chat(options: {
    model?: string
    messages: Message[]
    systemPrompt: string
    tools: ToolDefinition[]
  }): Promise<{
    content: MessageContent[]
    finishReason: string
    usage: { inputTokens: number; outputTokens: number }
  }> {
    const openAIMessages = this.toOpenAIMessages(options.messages, options.systemPrompt)
    const openAITools = this.toOpenAITools(options.tools)

    const response = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      messages: openAIMessages,
      tools: openAITools
    })

    const choice = response.choices[0]
    const content: MessageContent[] = []

    // Add text content
    if (choice.message.content) {
      content.push({
        type: "text",
        text: choice.message.content
      })
    }

    // Add tool calls
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        content.push({
          type: "tool_call",
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: this.parseArguments(toolCall.function.arguments)
        })
      }
    }

    return {
      content,
      finishReason: choice.finish_reason ?? "stop",
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0
      }
    }
  }

  /**
   * Parse tool arguments from string to object
   */
  private parseArguments(args: string): unknown {
    try {
      return JSON.parse(args)
    } catch {
      return args
    }
  }
}

/**
 * Create a new LLM client
 */
export function createLLMClient(config?: LLMClientConfig): LLMClient {
  return new LLMClient(config)
}
