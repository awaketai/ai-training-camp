/**
 * MCP Filesystem Example
 *
 * This example demonstrates how to use MCP (Model Context Protocol) to integrate
 * external tool servers with the agent. It uses the official filesystem MCP server.
 *
 * Prerequisites:
 * 1. Install the filesystem MCP server:
 *    npm install -g @modelcontextprotocol/server-filesystem
 *
 * Run: npx tsx examples/mcp-filesystem.ts
 */

import { createAgent, type AgentEvent, type MCPConfig } from "../src/index.js"
import { resolve } from "path"

// MCP server configuration for filesystem
const filesystemMCPConfig: MCPConfig = {
  name: "filesystem",
  transport: "stdio",
  command: "npx",
  args: [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    // Allow access to current directory
    resolve(".")
  ]
}

// Event handler
function handleEvent(event: AgentEvent): void {
  switch (event.type) {
    case "step":
      console.log(`\n--- Step ${event.step} ---`)
      break
    case "text":
      process.stdout.write(event.text)
      break
    case "tool_call":
      console.log(`\n[MCP Tool] ${event.name}`)
      console.log("Arguments:", JSON.stringify(event.args, null, 2))
      break
    case "tool_result":
      const preview = event.result.length > 200
        ? event.result.substring(0, 200) + "..."
        : event.result
      console.log(`[Result] ${preview}`)
      break
    case "error":
      console.error("[Error]", event.error)
      break
  }
}

async function main() {
  console.log("=== MCP Filesystem Agent Example ===\n")
  console.log("This example connects to the MCP filesystem server to read/write files.\n")

  // Create agent
  const agent = createAgent({
    model: "gpt-4o-mini",
    systemPrompt: `You are a helpful file system assistant.
You can read, write, and list files using the MCP filesystem tools.
When listing files, provide a clear summary of what you find.
Be careful with file operations and always confirm before making changes.`
  })

  try {
    // Connect to MCP filesystem server
    console.log("Connecting to MCP filesystem server...")
    const tools = await agent.connectMCP(filesystemMCPConfig)
    console.log(`Connected! Available tools: ${tools.map(t => t.name).join(", ")}\n`)

    // Example 1: List files in current directory
    console.log("User: List all files in the current directory")
    const response1 = await agent.run(
      "List all files in the current directory. Show me what's here.",
      handleEvent
    )
    console.log("\nResponse:", response1)

    // Example 2: Read package.json
    console.log("\n\n--- New Query ---")
    agent.clearHistory()
    console.log("User: Read the package.json file and tell me about this project")
    const response2 = await agent.run(
      "Read the package.json file and give me a brief summary of this project (name, description, dependencies)",
      handleEvent
    )
    console.log("\nResponse:", response2)

    // Example 3: Create a test file
    console.log("\n\n--- New Query ---")
    agent.clearHistory()
    console.log("User: Create a test file called 'hello.txt' with 'Hello from MCP!'")
    const response3 = await agent.run(
      "Create a new file called 'test-output.txt' in the current directory with the content 'Hello from MCP Agent! This file was created automatically.'",
      handleEvent
    )
    console.log("\nResponse:", response3)

  } catch (error) {
    if (error instanceof Error && error.message.includes("ENOENT")) {
      console.error("\n[Error] MCP server not found. Please install it with:")
      console.error("  npm install -g @modelcontextprotocol/server-filesystem")
    } else {
      console.error("\n[Error]", error)
    }
  } finally {
    // Cleanup: disconnect from MCP server
    console.log("\nDisconnecting from MCP server...")
    await agent.disconnectAllMCP()
    console.log("Done!")
  }
}

main().catch(console.error)
