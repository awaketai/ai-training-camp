/**
 * Calculator Tool Example
 *
 * This example demonstrates how to create an agent with multiple math tools.
 *
 * Run: npx tsx examples/calculator.ts
 */

import { createAgent, defineTool, type AgentEvent } from "../src/index.js"

// Define calculator tools
const addTool = defineTool<{ a: number; b: number }>({
  name: "add",
  description: "Add two numbers together",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" }
    },
    required: ["a", "b"]
  },
  execute: async (args) => {
    const result = args.a + args.b
    return { output: `${result}` }
  }
})

const subtractTool = defineTool<{ a: number; b: number }>({
  name: "subtract",
  description: "Subtract second number from first number (a - b)",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number", description: "Number to subtract from" },
      b: { type: "number", description: "Number to subtract" }
    },
    required: ["a", "b"]
  },
  execute: async (args) => {
    const result = args.a - args.b
    return { output: `${result}` }
  }
})

const multiplyTool = defineTool<{ a: number; b: number }>({
  name: "multiply",
  description: "Multiply two numbers together",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" }
    },
    required: ["a", "b"]
  },
  execute: async (args) => {
    const result = args.a * args.b
    return { output: `${result}` }
  }
})

const divideTool = defineTool<{ a: number; b: number }>({
  name: "divide",
  description: "Divide first number by second number (a / b)",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number", description: "Dividend (number to be divided)" },
      b: { type: "number", description: "Divisor (number to divide by)" }
    },
    required: ["a", "b"]
  },
  execute: async (args) => {
    if (args.b === 0) {
      return { output: "", error: "Division by zero is not allowed" }
    }
    const result = args.a / args.b
    return { output: `${result}` }
  }
})

const powerTool = defineTool<{ base: number; exponent: number }>({
  name: "power",
  description: "Calculate base raised to the power of exponent (base^exponent)",
  parameters: {
    type: "object",
    properties: {
      base: { type: "number", description: "The base number" },
      exponent: { type: "number", description: "The exponent" }
    },
    required: ["base", "exponent"]
  },
  execute: async (args) => {
    const result = Math.pow(args.base, args.exponent)
    return { output: `${result}` }
  }
})

const sqrtTool = defineTool<{ number: number }>({
  name: "sqrt",
  description: "Calculate the square root of a number",
  parameters: {
    type: "object",
    properties: {
      number: { type: "number", description: "The number to find square root of" }
    },
    required: ["number"]
  },
  execute: async (args) => {
    if (args.number < 0) {
      return { output: "", error: "Cannot calculate square root of negative number" }
    }
    const result = Math.sqrt(args.number)
    return { output: `${result}` }
  }
})

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
      console.log(`\n[Calculating] ${event.name}(${JSON.stringify(event.args)})`)
      break
    case "tool_result":
      console.log(`[Result] = ${event.result}`)
      break
    case "error":
      console.error("[Error]", event.error)
      break
  }
}

async function main() {
  console.log("=== Calculator Agent Example ===\n")

  // Create agent with calculator tools
  const agent = createAgent({
    model: "gpt-4o-mini",
    systemPrompt: `You are a helpful calculator assistant.
You have access to mathematical tools: add, subtract, multiply, divide, power, and sqrt.
Always use the tools to perform calculations - never calculate in your head.
Show your work step by step.`,
    tools: [addTool, subtractTool, multiplyTool, divideTool, powerTool, sqrtTool]
  })

  // Example 1: Simple calculation
  console.log("User: What is 42 * 17?")
  const response1 = await agent.run("What is 42 * 17?", handleEvent)
  console.log("\nAnswer:", response1)

  // Example 2: Multi-step calculation
  console.log("\n\n--- New Query ---")
  agent.clearHistory()
  console.log("User: Calculate (15 + 7) * 3 - 10")
  const response2 = await agent.run("Calculate (15 + 7) * 3 - 10", handleEvent)
  console.log("\nAnswer:", response2)

  // Example 3: Complex calculation
  console.log("\n\n--- New Query ---")
  agent.clearHistory()
  console.log("User: Find the square root of 144, then raise it to the power of 3")
  const response3 = await agent.run(
    "Find the square root of 144, then raise it to the power of 3",
    handleEvent
  )
  console.log("\nAnswer:", response3)

  // Example 4: Error handling
  console.log("\n\n--- New Query ---")
  agent.clearHistory()
  console.log("User: What is 10 divided by 0?")
  const response4 = await agent.run("What is 10 divided by 0?", handleEvent)
  console.log("\nAnswer:", response4)
}

main().catch(console.error)
