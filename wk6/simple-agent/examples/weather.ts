/**
 * Weather Tool Example
 *
 * This example demonstrates how to create a simple agent with a custom weather tool.
 *
 * Run: npx tsx examples/weather.ts
 */

import { createAgent, defineTool, type AgentEvent } from "../src/index.js"

// Define a weather tool
const weatherTool = defineTool<{ location: string }>({
  name: "get_weather",
  description: "Get current weather for a location. Returns temperature and conditions.",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name (e.g., 'Tokyo', 'New York', 'London')"
      }
    },
    required: ["location"]
  },
  execute: async (args) => {
    // Simulated weather data
    const weatherData: Record<string, { temp: number; condition: string }> = {
      "tokyo": { temp: 22, condition: "sunny" },
      "new york": { temp: 18, condition: "cloudy" },
      "london": { temp: 15, condition: "rainy" },
      "paris": { temp: 20, condition: "partly cloudy" },
      "sydney": { temp: 25, condition: "sunny" }
    }

    const location = args.location.toLowerCase()
    const weather = weatherData[location]

    if (weather) {
      return {
        output: JSON.stringify({
          location: args.location,
          temperature: `${weather.temp}°C`,
          condition: weather.condition,
          humidity: "65%",
          wind: "10 km/h"
        })
      }
    }

    return {
      output: JSON.stringify({
        location: args.location,
        temperature: "20°C",
        condition: "unknown",
        note: "Weather data not available for this location"
      })
    }
  }
})

// Event handler to show what's happening
function handleEvent(event: AgentEvent): void {
  switch (event.type) {
    case "step":
      console.log(`\n--- Step ${event.step}/${event.maxSteps} ---`)
      break
    case "text":
      process.stdout.write(event.text)
      break
    case "tool_call":
      console.log(`\n[Tool Call] ${event.name}:`, JSON.stringify(event.args))
      break
    case "tool_result":
      console.log(`[Tool Result] ${event.name}:`, event.result)
      break
    case "message_end":
      console.log(`\n[Finished: ${event.finishReason}]`)
      break
    case "error":
      console.error("[Error]", event.error)
      break
  }
}

async function main() {
  console.log("=== Weather Agent Example ===\n")

  // Create agent with the weather tool
  const agent = createAgent({
    model: "gpt-4o-mini", // Use gpt-4o-mini for faster/cheaper responses
    systemPrompt: "You are a helpful weather assistant. Use the get_weather tool to provide weather information.",
    tools: [weatherTool]
  })

  // Example 1: Simple weather query
  console.log("User: What's the weather like in Tokyo?")
  const response1 = await agent.run("What's the weather like in Tokyo?", handleEvent)
  console.log("\nFinal Response:", response1)

  // Example 2: Multi-city comparison (demonstrates multiple tool calls)
  console.log("\n\n--- New Query ---")
  agent.clearHistory()
  console.log("User: Compare the weather in Tokyo and London. Which one is warmer?")
  const response2 = await agent.run(
    "Compare the weather in Tokyo and London. Which one is warmer?",
    handleEvent
  )
  console.log("\nFinal Response:", response2)

  // Example 3: Streaming response
  console.log("\n\n--- Streaming Example ---")
  agent.clearHistory()
  console.log("User: What's the weather in Paris? Give me a brief summary.")
  console.log("\nStreaming response:")

  for await (const event of agent.stream("What's the weather in Paris? Give me a brief summary.")) {
    if (event.type === "text") {
      process.stdout.write(event.text)
    } else if (event.type === "tool_call") {
      console.log(`\n[Calling ${event.name}...]`)
    }
  }
  console.log("\n")
}

main().catch(console.error)
