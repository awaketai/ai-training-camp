import { createAgent, type Agent, type AgentEvent } from "simple-agent";
import { readFileTool } from "./tools/read-file.js";
import { writeFileTool } from "./tools/write-file.js";
import { gitTool } from "./tools/git.js";
import { ghTool } from "./tools/gh.js";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CodeReviewAgentOptions {
  model?: string;
  maxSteps?: number;
  onEvent?: (event: AgentEvent) => void;
}

export async function createCodeReviewAgent(
  options: CodeReviewAgentOptions = {}
): Promise<Agent> {
  // Read system prompt
  const systemPromptPath = path.join(__dirname, "prompts", "system.md");
  const systemPrompt = await fs.readFile(systemPromptPath, "utf-8");

  const agent = createAgent({
    model: options.model ?? "gpt-4o",
    systemPrompt,
    maxSteps: options.maxSteps ?? 30,
    tools: [readFileTool, writeFileTool, gitTool, ghTool]
  });

  return agent;
}

// Convenience function: directly run review
export async function runCodeReview(
  request: string,
  options: CodeReviewAgentOptions = {}
): Promise<string> {
  const agent = await createCodeReviewAgent(options);
  return agent.run(request, options.onEvent);
}
