import { defineTool } from "simple-agent";
import { execSync } from "child_process";

interface GhArgs {
  command: string;
  subcommand: string;
  args?: string[];
}

// Allowed gh commands
const ALLOWED_COMMANDS = ["pr", "issue", "repo"];
const ALLOWED_PR_SUBCOMMANDS = [
  "view", "diff", "list", "checks", "status", "comment"
];

export const ghTool = defineTool<GhArgs>({
  name: "gh",
  description: `Execute GitHub CLI commands for PR operations.

Common patterns:
- View PR: { "command": "pr", "subcommand": "view", "args": ["123"] }
- PR diff: { "command": "pr", "subcommand": "diff", "args": ["123"] }
- PR files: { "command": "pr", "subcommand": "view", "args": ["123", "--json", "files"] }
- List PRs: { "command": "pr", "subcommand": "list" }
- Current PR: { "command": "pr", "subcommand": "view" }`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "GitHub CLI command (pr, issue, repo)"
      },
      subcommand: {
        type: "string",
        description: "Subcommand (view, diff, list, etc.)"
      },
      args: {
        type: "array",
        items: { type: "string" },
        description: "Additional arguments"
      }
    },
    required: ["command", "subcommand"]
  },
  execute: async (args) => {
    // Security check
    if (!ALLOWED_COMMANDS.includes(args.command)) {
      return {
        output: "",
        error: `Command '${args.command}' is not allowed`
      };
    }

    if (args.command === "pr" && !ALLOWED_PR_SUBCOMMANDS.includes(args.subcommand)) {
      return {
        output: "",
        error: `PR subcommand '${args.subcommand}' is not allowed`
      };
    }

    try {
      const cmdArgs = args.args ?? [];
      const fullCommand = ["gh", args.command, args.subcommand, ...cmdArgs].join(" ");

      const output = execSync(fullCommand, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        cwd: process.cwd()
      });

      return { output: output || "(no output)" };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return { output: "", error: errMsg };
    }
  }
});
