import { defineTool } from "simple-agent";
import { execFileSync } from "child_process";

interface GitArgs {
  command: string;
  args?: string[];
}

// Allowed git commands (security whitelist)
const ALLOWED_COMMANDS = [
  "diff", "show", "log", "blame", "status", "branch",
  "rev-parse", "remote", "config", "ls-files"
];

export const gitTool = defineTool<GitArgs>({
  name: "git",
  description: `Execute git commands to inspect code changes, history, and blame.

Common patterns:
- Unstaged: { "command": "diff" }
- Staged: { "command": "diff", "args": ["--cached"] }
- Branch vs main: { "command": "diff", "args": ["main...HEAD"] }
- After commit: { "command": "diff", "args": ["<hash>..HEAD"] }
- Show commit: { "command": "show", "args": ["<hash>"] }
- Blame file: { "command": "blame", "args": ["<file>"] }
- Recent log: { "command": "log", "args": ["--oneline", "-10"] }
- Changed files: { "command": "diff", "args": ["--name-only", "main...HEAD"] }`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Git subcommand (diff, show, log, blame, status, branch)"
      },
      args: {
        type: "array",
        items: { type: "string" },
        description: "Command arguments"
      }
    },
    required: ["command"]
  },
  execute: async (args) => {
    // Security check
    if (!ALLOWED_COMMANDS.includes(args.command)) {
      return {
        output: "",
        error: `Command '${args.command}' is not allowed. Allowed: ${ALLOWED_COMMANDS.join(", ")}`
      };
    }

    try {
      const cmdArgs = args.args ?? [];

      // Use execFileSync to prevent command injection
      // Arguments are passed as array, not shell-interpolated
      const output = execFileSync("git", [args.command, ...cmdArgs], {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB
        cwd: process.cwd()
      });

      return { output: output || "(no output)" };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      // Extract useful error information
      if (errMsg.includes("stderr:")) {
        const stderr = errMsg.split("stderr:")[1]?.trim() || errMsg;
        return { output: "", error: stderr };
      }
      return { output: "", error: errMsg };
    }
  }
});
