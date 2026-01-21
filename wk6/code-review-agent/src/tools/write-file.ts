import { defineTool } from "simple-agent";
import * as fs from "fs/promises";
import * as path from "path";

interface WriteFileArgs {
  path: string;
  content: string;
  mode?: "overwrite" | "append";
}

export const writeFileTool = defineTool<WriteFileArgs>({
  name: "write_file",
  description: "Write content to a file. Use for saving review reports or summaries.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to project root"
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
      const filePath = path.resolve(process.cwd(), args.path);
      const dir = path.dirname(filePath);

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
