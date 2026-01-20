import type { Tool } from "../simple-agent/src/types.js"
import { execSync } from "child_process"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { resolve } from "path"

export const readFileTool: Tool = {
  name: "read_file",
  description: "Read the contents of a file at the specified path",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The file path to read (relative to current working directory)"
      }
    },
    required: ["path"]
  },
  execute: async (args) => {
    const filePath = resolve(process.cwd(), args.path as string)

    if (!existsSync(filePath)) {
      return { output: "", error: `File not found: ${filePath}` }
    }

    try {
      const content = readFileSync(filePath, "utf-8")
      const lines = content.split("\n")
      const numberedContent = lines
        .map((line, i) => `${String(i + 1).padStart(5)}| ${line}`)
        .join("\n")
      return { output: numberedContent }
    } catch (err) {
      return { output: "", error: `Failed to read file: ${err}` }
    }
  }
}

export const writeFileTool: Tool = {
  name: "write_file",
  description: "Write content to a file at the specified path",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The file path to write to"
      },
      content: {
        type: "string",
        description: "The content to write to the file"
      }
    },
    required: ["path", "content"]
  },
  execute: async (args) => {
    const filePath = resolve(process.cwd(), args.path as string)

    try {
      writeFileSync(filePath, args.content as string, "utf-8")
      return { output: `Successfully wrote to ${filePath}` }
    } catch (err) {
      return { output: "", error: `Failed to write file: ${err}` }
    }
  }
}

export const gitTool: Tool = {
  name: "git",
  description: "Execute git commands. Supports: diff, log, show, blame, status, branch",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The git subcommand to run (e.g., 'diff', 'log', 'show', 'blame')"
      },
      args: {
        type: "string",
        description: "Additional arguments for the git command"
      }
    },
    required: ["command"]
  },
  execute: async (args) => {
    const command = args.command as string
    const gitArgs = (args.args as string) || ""

    const allowedCommands = ["diff", "log", "show", "blame", "status", "branch", "rev-parse"]
    if (!allowedCommands.includes(command)) {
      return {
        output: "",
        error: `Command '${command}' not allowed. Allowed: ${allowedCommands.join(", ")}`
      }
    }

    try {
      const fullCommand = `git ${command} ${gitArgs}`.trim()
      const output = execSync(fullCommand, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024
      })
      return { output: output || "(no output)" }
    } catch (err: any) {
      if (err.stdout) {
        return { output: err.stdout }
      }
      return { output: "", error: `Git command failed: ${err.message}` }
    }
  }
}

export const codeReviewTools: Tool[] = [readFileTool, writeFileTool, gitTool]
