# Simple Agent SDK

A lightweight multi-turn agent SDK with tool calling support, built on OpenAI API.

## Features

- **Multi-turn Conversations**: Maintains conversation history across multiple interactions
- **Tool Calling**: Define and execute custom tools with full type safety
- **Streaming Support**: Real-time streaming of LLM responses and tool executions
- **MCP Integration**: Connect to Model Context Protocol servers for extended capabilities
- **Session Management**: Create, clone, and manage conversation sessions
- **Event System**: Subscribe to agent events for custom handling

## Installation

```bash
npm install
```

## Quick Start

```typescript
import { createAgent, defineTool } from "./src/index.js"

// Create an agent
const agent = createAgent({
  model: "gpt-4o-mini",
  systemPrompt: "You are a helpful assistant."
})

// Define a custom tool
const weatherTool = defineTool<{ location: string }>({
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name" }
    },
    required: ["location"]
  },
  execute: async (args) => {
    return { output: `Weather in ${args.location}: 22°C, sunny` }
  }
})

// Add the tool
agent.addTool(weatherTool)

// Run the agent
const response = await agent.run("What's the weather in Tokyo?")
console.log(response)
```

## Examples

### Weather Tool Example

```bash
npx tsx examples/weather.ts
```

Demonstrates basic tool usage with a simulated weather API.

### Calculator Example

```bash
npx tsx examples/calculator.ts
```

Shows how to create multiple math tools and handle multi-step calculations.

### MCP Filesystem Example

```bash
npx tsx examples/mcp-filesystem.ts
```

Demonstrates MCP integration with the filesystem server.

### Combined Example

```bash
npx tsx examples/combined.ts
```

Shows how to combine custom tools with MCP tools.

## Architecture

```
src/
├── agent/
│   ├── agent.ts          # Main Agent class
│   └── loop.ts           # Agent loop logic
├── llm/
│   └── client.ts         # OpenAI client wrapper
├── tool/
│   ├── registry.ts       # Tool registry
│   └── executor.ts       # Tool executor
├── mcp/
│   ├── client.ts         # MCP client
│   └── manager.ts        # MCP connection manager
├── session/
│   └── session.ts        # Session management
├── types.ts              # Type definitions
└── index.ts              # Main exports
```

## API Reference

### Agent

```typescript
const agent = createAgent({
  model: "gpt-4o",           // OpenAI model to use
  systemPrompt: "...",        // System prompt
  tools: [...],               // Initial tools
  maxSteps: 50,               // Max agent loop iterations
  llmConfig: {                // OpenAI client config
    apiKey: "...",
    baseURL: "..."
  }
})

// Add tools
agent.addTool(tool)
agent.addTools([tool1, tool2])

// Connect MCP
await agent.connectMCP(config)

// Run agent
const response = await agent.run(message, onEvent)

// Stream response
for await (const event of agent.stream(message)) {
  // handle events
}

// Session management
agent.clearHistory()
agent.newSession()
agent.getMessages()
```

### Tool Definition

```typescript
const tool = defineTool<{ param: string }>({
  name: "tool_name",
  description: "What the tool does",
  parameters: {
    type: "object",
    properties: {
      param: { type: "string", description: "Parameter description" }
    },
    required: ["param"]
  },
  execute: async (args) => {
    return { output: "result" }
    // or return { output: "", error: "error message" }
  }
})
```

### MCP Configuration

```typescript
// Stdio transport
const mcpConfig: MCPConfig = {
  name: "server-name",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-something"],
  env: { ... }
}

// SSE transport
const mcpConfig: MCPConfig = {
  name: "server-name",
  transport: "sse",
  url: "http://localhost:3000/sse"
}
```

### Events

```typescript
type AgentEvent =
  | { type: "message_start"; role: "assistant" }
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: unknown }
  | { type: "tool_result"; name: string; result: string; isError?: boolean }
  | { type: "message_end"; finishReason: string }
  | { type: "step"; step: number; maxSteps: number }
  | { type: "error"; error: Error }
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `OPENAI_BASE_URL`: Custom base URL for OpenAI API (optional)

## License

MIT
