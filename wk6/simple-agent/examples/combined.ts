/**
 * Combined Tools + MCP Example
 *
 * This example demonstrates how to combine custom tools with MCP tools
 * to create a powerful agent that can both calculate and interact with the filesystem.
 *
 * Run: npx tsx examples/combined.ts
 */

import { createAgent, defineTool, type AgentEvent, type MCPConfig } from "../src/index.js"
import { resolve } from "path"

// Custom time tool
const timeTool = defineTool<{ timezone?: string }>({
  name: "get_current_time",
  description: "Get the current date and time",
  parameters: {
    type: "object",
    properties: {
      timezone: {
        type: "string",
        description: "Timezone (e.g., 'UTC', 'America/New_York'). Defaults to local time."
      }
    }
  },
  execute: async (args) => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: args.timezone || undefined
    }

    try {
      const formatted = new Intl.DateTimeFormat("en-US", options).format(now)
      return {
        output: JSON.stringify({
          formatted,
          iso: now.toISOString(),
          timestamp: now.getTime()
        })
      }
    } catch {
      return {
        output: JSON.stringify({
          formatted: now.toString(),
          iso: now.toISOString(),
          timestamp: now.getTime(),
          note: "Invalid timezone, using local time"
        })
      }
    }
  }
})

// Custom random number tool
const randomTool = defineTool<{ min?: number; max?: number }>({
  name: "random_number",
  description: "Generate a random integer between min and max (inclusive)",
  parameters: {
    type: "object",
    properties: {
      min: { type: "number", description: "Minimum value (default: 1)" },
      max: { type: "number", description: "Maximum value (default: 100)" }
    }
  },
  execute: async (args) => {
    const min = args.min ?? 1
    const max = args.max ?? 100
    const result = Math.floor(Math.random() * (max - min + 1)) + min
    return { output: `${result}` }
  }
})

// MCP filesystem config
const filesystemMCPConfig: MCPConfig = {
  name: "filesystem",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", resolve(".")]
}

// Event handler with colors
function handleEvent(event: AgentEvent): void {
  switch (event.type) {
    case "step":
      console.log(`\n\x1b[36m--- Step ${event.step} ---\x1b[0m`)
      break
    case "text":
      process.stdout.write(event.text)
      break
    case "tool_call":
      const toolType = event.name.startsWith("filesystem__") ? "MCP" : "Custom"
      console.log(`\n\x1b[33m[${toolType} Tool] ${event.name}\x1b[0m`)
      break
    case "tool_result":
      const preview = event.result.length > 100
        ? event.result.substring(0, 100) + "..."
        : event.result
      console.log(`\x1b[32m[Result] ${preview}\x1b[0m`)
      break
    case "error":
      console.error("\x1b[31m[Error]\x1b[0m", event.error)
      break
  }
}

async function main() {
  console.log("=== Combined Tools + MCP Example ===\n")

  // Create agent with custom tools
  const agent = createAgent({
    model: "gpt-4o-mini",
    systemPrompt: `You are a versatile assistant with multiple capabilities:
1. You can get the current time in different timezones
2. You can generate random numbers
3. You can read and write files using the filesystem tools

Use the appropriate tools for each task. Combine tools when needed to complete complex tasks.`,
    tools: [timeTool, randomTool]
  })

  let hasMCP = false

  try {
    // Try to connect to MCP
    console.log("Attempting to connect to MCP filesystem server...")
    const mcpTools = await agent.connectMCP(filesystemMCPConfig)
    console.log(`Connected! MCP tools: ${mcpTools.map(t => t.name).join(", ")}`)
    hasMCP = true
  } catch {
    console.log("MCP server not available. Continuing with custom tools only.\n")
  }

  // Show available tools
  console.log("\nAll available tools:", agent.getTools().map(t => t.name).join(", "))
  console.log("")

  // Example 1: Use custom tools
  console.log("User: What time is it in Tokyo and New York?")
  const response1 = await agent.run(
    "What time is it right now in Tokyo and New York? Show both times.",
    handleEvent
  )
  console.log("\nResponse:", response1)

  // Example 2: Random number
  console.log("\n\n--- New Query ---")
  agent.clearHistory()
  console.log("User: Pick a random number between 1 and 10")
  const response2 = await agent.run("Pick a random number between 1 and 10", handleEvent)
  console.log("\nResponse:", response2)

  // Example 3: Combined task (if MCP is available)
  if (hasMCP) {
    console.log("\n\n--- New Query ---")
    agent.clearHistory()
    console.log("User: Create a log file with current timestamp and a random ID")
    const response3 = await agent.run(
      "Create a file called 'agent-log.txt' that contains the current time and a random ID number between 1000 and 9999",
      handleEvent
    )
    console.log("\nResponse:", response3)
  }

  // Cleanup
  if (hasMCP) {
    await agent.disconnectAllMCP()
  }

  console.log("\nDone!")
}

main().catch(console.error)
