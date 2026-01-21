import { defineTool } from "simple-agent";
import * as fs from "fs/promises";
import * as path from "path";

interface ReadFileArgs {
  path: string;
  start_line?: number;
  end_line?: number;
}

export const readFileTool = defineTool<ReadFileArgs>({
  name: "read_file",
  description: "Read the contents of a file in the current project. Returns file content with line numbers.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to project root"
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
      const filePath = path.resolve(process.cwd(), args.path);
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
