#!/usr/bin/env node
import { createCodeReviewAgent } from "./agent.js";
import * as readline from "readline";

interface CLIOptions {
  request?: string;
  model?: string;
  maxSteps?: number;
  streaming?: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-r":
      case "--request":
        options.request = args[++i];
        break;
      case "-m":
      case "--model":
        options.model = args[++i];
        break;
      case "--max-steps":
        options.maxSteps = parseInt(args[++i], 10);
        break;
      case "-s":
      case "--streaming":
        options.streaming = true;
        break;
      default:
        if (!arg.startsWith("-") && !options.request) {
          options.request = arg;
        }
        break;
    }
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const agent = await createCodeReviewAgent({
    model: options.model,
    maxSteps: options.maxSteps
  });

  const onEvent = options.streaming
    ? (event: any) => {
        if (event.type === "text") {
          process.stdout.write(event.text);
        } else if (event.type === "tool_call") {
          console.log(`\n[Tool] ${event.name}`);
        } else if (event.type === "tool_result") {
          if (event.isError) {
            console.log(`[Error] ${event.name}: ${event.result}`);
          }
        } else if (event.type === "step") {
          console.log(`\n[Step ${event.step}/${event.maxSteps}]`);
        }
      }
    : undefined;

  let request: string;

  if (options.request) {
    request = options.request;
  } else if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    request = Buffer.concat(chunks).toString("utf-8").trim();
  } else {
    console.log("Code Review Agent");
    console.log("==================");
    console.log("\nDescribe what you want to review:");
    console.log("  - 'review current branch' - Review changes in current branch");
    console.log("  - 'review unstaged' - Review unstaged changes");
    console.log("  - 'review staged' - Review staged changes");
    console.log("  - 'review all' - Review all changes (staged + unstaged)");
    console.log("  - 'review PR 123' - Review a specific pull request");
    console.log("  - 'review commit abc123' - Review a specific commit");
    console.log("  - 'review src/index.ts' - Review a specific file");
    console.log("\nType 'exit' or 'quit' to exit.\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    request = await new Promise<string>((resolve) => {
      rl.question("> ", (input) => {
        rl.close();
        resolve(input.trim());
      });
    });
  }

  if (!request || request.toLowerCase() === "exit" || request.toLowerCase() === "quit") {
    process.exit(0);
  }

  console.log(`\nReviewing: ${request}\n`);

  try {
    const response = await agent.run(request, onEvent);

    if (!options.streaming) {
      console.log(response);
    }

    console.log("\n✓ Review complete");
  } catch (error) {
    console.error("\n✗ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
