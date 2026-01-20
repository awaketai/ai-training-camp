/**
 * Session management - handles conversation state
 */

import { v4 as uuidv4 } from "uuid"
import type {
  Session,
  SessionStatus,
  Message,
  MessageContent,
  TextContent,
  Tool
} from "../types.js"

export interface SessionConfig {
  id?: string
  systemPrompt?: string
  model?: string
  tools?: Tool[]
}

/**
 * Create a new session
 */
export function createSession(config: SessionConfig = {}): Session {
  return {
    id: config.id ?? uuidv4(),
    messages: [],
    systemPrompt: config.systemPrompt ?? "You are a helpful assistant.",
    model: config.model ?? "gpt-4o",
    tools: config.tools ?? [],
    status: "idle"
  }
}

/**
 * Add a user message to the session
 */
export function addUserMessage(session: Session, text: string): Message {
  const message: Message = {
    id: uuidv4(),
    role: "user",
    content: [{ type: "text", text }],
    createdAt: new Date()
  }
  session.messages.push(message)
  return message
}

/**
 * Add an assistant message to the session
 */
export function addAssistantMessage(
  session: Session,
  content: MessageContent[]
): Message {
  const message: Message = {
    id: uuidv4(),
    role: "assistant",
    content,
    createdAt: new Date()
  }
  session.messages.push(message)
  return message
}

/**
 * Add a tool message to the session
 */
export function addToolMessage(
  session: Session,
  content: MessageContent[]
): Message {
  const message: Message = {
    id: uuidv4(),
    role: "tool",
    content,
    createdAt: new Date()
  }
  session.messages.push(message)
  return message
}

/**
 * Get the last message in the session
 */
export function getLastMessage(session: Session): Message | undefined {
  return session.messages[session.messages.length - 1]
}

/**
 * Get all text content from a message
 */
export function getMessageText(message: Message): string {
  return message.content
    .filter((c): c is TextContent => c.type === "text")
    .map(c => c.text)
    .join("\n")
}

/**
 * Update session status
 */
export function setSessionStatus(session: Session, status: SessionStatus): void {
  session.status = status
}

/**
 * Clear session messages
 */
export function clearMessages(session: Session): void {
  session.messages = []
}

/**
 * Clone a session (for branching conversations)
 */
export function cloneSession(session: Session): Session {
  return {
    id: uuidv4(),
    messages: session.messages.map(m => ({
      ...m,
      id: uuidv4(),
      content: [...m.content]
    })),
    systemPrompt: session.systemPrompt,
    model: session.model,
    tools: [...session.tools],
    status: "idle"
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return uuidv4()
}
