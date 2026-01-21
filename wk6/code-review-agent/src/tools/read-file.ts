import { defineTool } from "simple-agent";
import * as fs from "fs/promises";
import * as path from "path";
import { execFileSync } from "child_process";

interface ReadFileArgs {
  path: string;
  start_line?: number;
  end_line?: number;
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

export const readFileTool = defineTool<ReadFileArgs>({
  name: "read_file",
  description: "Read the contents of a file in the current project. Returns file content with line numbers.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to git repository root (e.g., 'src/index.ts')"
      },
      start_line: {
        type: "number",
        description: "Starting line number (1-indexed, optional)"
      },
      end_line: {
        type: "number",
        description: "Ending line number (optional)"
      }
    },
    required: ["path"]
  },
  execute: async (args) => {
    try {
      const projectRoot = getGitRoot();
      const filePath = path.resolve(projectRoot, args.path);

      // Security check: ensure file is within project directory
      if (!filePath.startsWith(projectRoot + path.sep) && filePath !== projectRoot) {
        return {
          output: "",
          error: "Access denied: file path must be within the project directory"
        };
      }

      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      const start = (args.start_line ?? 1) - 1;
      const end = args.end_line ?? lines.length;

      const selectedLines = lines.slice(start, end);
      const numberedContent = selectedLines
        .map((line, i) => `${(start + i + 1).toString().padStart(4)}│ ${line}`)
        .join("\n");

      return { output: numberedContent };
    } catch (error) {
      return {
        output: "",
        error: `Failed to read file: ${error instanceof Error ? error.message : error}`
      };
    }
  }
});
