import { createAgent } from "../simple-agent/src/index.js"
import { CODE_REVIEW_SYSTEM_PROMPT } from "./system-prompt.js"
import { codeReviewTools } from "./tools.js"

async function main() {
  const reviewTarget = process.argv[2] || ""

  const agent = createAgent({
    model: "gpt-4o",
    systemPrompt: CODE_REVIEW_SYSTEM_PROMPT,
    tools: codeReviewTools,
    maxSteps: 30
  })

  console.log("Starting code review...")
  console.log("Target:", reviewTarget || "(uncommitted changes)")
  console.log("-".repeat(60))

  const prompt = reviewTarget
    ? `Review the following: ${reviewTarget}`
    : `Review all uncommitted changes in this repository`

  const response = await agent.run(prompt, (event) => {
    if (event.type === "text") {
      process.stdout.write(event.text)
    } else if (event.type === "tool_call") {
      console.log(`\n[Tool] ${event.name}`)
    }
  })

  console.log("\n")
  console.log("=".repeat(60))
  console.log("Review Complete")
}

main().catch(console.error)
