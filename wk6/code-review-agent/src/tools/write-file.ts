import { defineTool } from "simple-agent";
import * as fs from "fs/promises";
import * as path from "path";
import { execFileSync } from "child_process";

interface WriteFileArgs {
  path: string;
  content: string;
  mode?: "overwrite" | "append";
}

/**
 * Get git repository root directory
 */
function getGitRoot(): string {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      cwd: process.cwd()
    }).trim();
  } catch {
    // Fallback to current directory if not in a git repo
    return process.cwd();
  }
}

export const writeFileTool = defineTool<WriteFileArgs>({
  name: "write_file",
  description: "Write content to a file. Use for saving review reports or summaries.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to git repository root"
      },
      content: {
        type: "string",
        description: "Content to write"
      },
      mode: {
        type: "string",
        enum: ["overwrite", "append"],
        description: "Write mode (default: overwrite)"
      }
    },
    required: ["path", "content"]
  },
  execute: async (args) => {
    try {
      const projectRoot = getGitRoot();
      const filePath = path.resolve(projectRoot, args.path);
      const dir = path.dirname(filePath);

      // Security check: ensure file is within project directory
      if (!filePath.startsWith(projectRoot + path.sep) && filePath !== projectRoot) {
        return {
          output: "",
          error: "Access denied: file path must be within the project directory"
        };
      }

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      if (args.mode === "append") {
        await fs.appendFile(filePath, args.content, "utf-8");
      } else {
        await fs.writeFile(filePath, args.content, "utf-8");
      }

      return { output: `Successfully wrote to ${args.path}` };
    } catch (error) {
      return {
        output: "",
        error: `Failed to write file: ${error instanceof Error ? error.message : error}`
      };
    }
  }
});
