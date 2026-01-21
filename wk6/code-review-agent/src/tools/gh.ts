import { defineTool } from "simple-agent";
import { execFileSync } from "child_process";

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
const ALLOWED_ISSUE_SUBCOMMANDS = [
  "view", "list", "status", "comment"
];
const ALLOWED_REPO_SUBCOMMANDS = [
  "view", "list", "clone"
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
    // Security check: validate command
    if (!ALLOWED_COMMANDS.includes(args.command)) {
      return {
        output: "",
        error: `Command '${args.command}' is not allowed. Allowed: ${ALLOWED_COMMANDS.join(", ")}`
      };
    }

    // Security check: validate subcommand based on command type
    let allowedSubcommands: string[];
    switch (args.command) {
      case "pr":
        allowedSubcommands = ALLOWED_PR_SUBCOMMANDS;
        break;
      case "issue":
        allowedSubcommands = ALLOWED_ISSUE_SUBCOMMANDS;
        break;
      case "repo":
        allowedSubcommands = ALLOWED_REPO_SUBCOMMANDS;
        break;
      default:
        return {
          output: "",
          error: `Subcommand validation not configured for '${args.command}'`
        };
    }

    if (!allowedSubcommands.includes(args.subcommand)) {
      return {
        output: "",
        error: `Subcommand '${args.subcommand}' is not allowed for '${args.command}'. Allowed: ${allowedSubcommands.join(", ")}`
      };
    }

    try {
      const cmdArgs = args.args ?? [];

      // Use execFileSync to prevent command injection
      // Arguments are passed as array, not shell-interpolated
      const output = execFileSync("gh", [args.command, args.subcommand, ...cmdArgs], {
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
