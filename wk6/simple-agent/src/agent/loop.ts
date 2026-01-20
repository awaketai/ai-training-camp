/**
 * Agent Loop - core execution loop with streaming support
 */

import type {
  Session,
  Message,
  MessageContent,
  TextContent,
  ToolCallContent,
  ToolResultContent,
  AgentConfig,
  AgentEvent,
  Tool
} from "../types.js"
import { ToolRegistry, ToolExecutor } from "../tool/index.js"
import { LLMClient } from "../llm/index.js"
import { addAssistantMessage, addToolMessage, setSessionStatus, generateId } from "../session/index.js"

const DEFAULT_MAX_STEPS = 50

/**
 * Run agent with streaming - yields events as they occur
 */
export async function* streamAgent(
  session: Session,
  config: AgentConfig,
  llmClient?: LLMClient
): AsyncGenerator<AgentEvent> {
  const client = llmClient ?? new LLMClient()
  const registry = new ToolRegistry()

  // Register tools from config and session
  const allTools = [...(session.tools ?? []), ...(config.tools ?? [])]
  registry.registerMany(allTools)

  const executor = new ToolExecutor(registry)
  const maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS

  setSessionStatus(session, "running")

  try {
    let step = 0

    while (step < maxSteps) {
      step++
      yield { type: "step", step, maxSteps }
      yield { type: "message_start", role: "assistant" }

      const content: MessageContent[] = []
      const toolCalls: ToolCallContent[] = []
      let currentText = ""

      // Stream LLM response
      const stream = client.streamChat({
        model: config.model ?? session.model,
        messages: session.messages,
        systemPrompt: config.systemPrompt ?? session.systemPrompt,
        tools: registry.toToolDefinitions()
      })

      let finishReason = "stop"

      for await (const event of stream) {
        switch (event.type) {
          case "text_delta":
            currentText += event.text
            yield { type: "text", text: event.text }
            break

          case "tool_call_end":
            const toolCall: ToolCallContent = {
              type: "tool_call",
              id: event.id,
              name: event.name,
              arguments: parseArguments(event.arguments)
            }
            toolCalls.push(toolCall)
            yield { type: "tool_call", name: event.name, args: toolCall.arguments }
            break

          case "finish":
            finishReason = event.reason
            break

          case "error":
            yield { type: "error", error: event.error }
            setSessionStatus(session, "error")
            return
        }
      }

      // Build content array
      if (currentText) {
        content.push({ type: "text", text: currentText })
      }
      content.push(...toolCalls)

      // Save assistant message
      addAssistantMessage(session, content)

      yield { type: "message_end", finishReason }

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        break
      }

      // Execute tool calls
      const results: ToolResultContent[] = []
      for (const call of toolCalls) {
        const result = await executor.execute(call, {
          sessionId: session.id,
          messageId: "current"
        })
        results.push(result)
        yield {
          type: "tool_result",
          name: call.name,
          result: result.result,
          isError: result.isError
        }

        // Notify via config callback
        config.onEvent?.({
          type: "tool_result",
          name: call.name,
          result: result.result,
          isError: result.isError
        })
      }

      // Save tool results
      addToolMessage(session, results)
    }

    setSessionStatus(session, "completed")
  } catch (error) {
    setSessionStatus(session, "error")
    yield {
      type: "error",
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

/**
 * Run agent without streaming - returns final messages
 */
export async function runAgent(
  session: Session,
  config: AgentConfig,
  llmClient?: LLMClient
): Promise<Message[]> {
  const events: AgentEvent[] = []

  for await (const event of streamAgent(session, config, llmClient)) {
    events.push(event)
    config.onEvent?.(event)
  }

  return session.messages
}

/**
 * Simple helper to run a single query
 */
export async function query(
  message: string,
  options: {
    systemPrompt?: string
    model?: string
    tools?: Tool[]
    llmClient?: LLMClient
    onEvent?: (event: AgentEvent) => void
  } = {}
): Promise<string> {
  const session: Session = {
    id: generateId(),
    messages: [{
      id: generateId(),
      role: "user",
      content: [{ type: "text", text: message }],
      createdAt: new Date()
    }],
    systemPrompt: options.systemPrompt ?? "You are a helpful assistant.",
    model: options.model ?? "gpt-4o",
    tools: options.tools ?? [],
    status: "idle"
  }

  await runAgent(session, {
    model: options.model ?? "gpt-4o",
    systemPrompt: options.systemPrompt ?? "You are a helpful assistant.",
    tools: options.tools,
    onEvent: options.onEvent
  }, options.llmClient)

  // Get the last assistant message text
  const lastMessage = session.messages
    .filter(m => m.role === "assistant")
    .pop()

  if (!lastMessage) return ""

  return lastMessage.content
    .filter((c): c is TextContent => c.type === "text")
    .map(c => c.text)
    .join("\n")
}

/**
 * Parse tool arguments from string
 */
function parseArguments(args: string): unknown {
  try {
    return JSON.parse(args)
  } catch {
    return args
  }
}
