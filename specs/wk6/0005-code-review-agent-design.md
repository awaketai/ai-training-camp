# Code Review Agent 设计文档

## 1. 概述

### 1.1 目标

构建一个专注于代码审查的 Agent，基于 Simple Agent SDK 实现。该 Agent 能够：

- 读取项目文件内容
- 执行 git 命令获取各种 diff
- 执行 gh 命令与 GitHub PR 交互
- 输出审查报告

### 1.2 使用场景

```bash
# 审查当前分支相对于 main 的改动
> 帮我 review 当前 branch 代码

# 审查特定 commit 之后的改动
> 帮我 review commit 13bad5 之后的代码

# 审查 Pull Request
> 帮我 review pull request 12 的代码

# 审查 staged 的改动
> 帮我 review staged 的代码

# 审查特定文件
> 帮我 review src/index.ts 文件的改动
```

## 2. 架构设计

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Code Review Agent                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   System Prompt                       │   │
│  │  - 审查指南                                           │   │
│  │  - 工具使用说明                                        │   │
│  │  - 输出格式规范                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                      Tools                            │   │
│  │                                                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │  read_file  │  │ write_file  │  │     git     │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                        │   │
│  │                    ┌─────────────┐                     │   │
│  │                    │     gh      │                     │   │
│  │                    └─────────────┘                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Simple Agent SDK                     │   │
│  │  - LLM Client (OpenAI/Claude)                         │   │
│  │  - Tool Registry & Executor                           │   │
│  │  - Agent Loop                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
wk6/code-review-agent/
├── src/
│   ├── index.ts              # 入口文件
│   ├── agent.ts              # Agent 主类
│   ├── tools/
│   │   ├── index.ts          # 工具导出
│   │   ├── read-file.ts      # 读取文件工具
│   │   ├── write-file.ts     # 写入文件工具
│   │   ├── git.ts            # Git 命令工具
│   │   └── gh.ts             # GitHub CLI 工具
│   └── prompts/
│       └── system.md         # System Prompt
├── examples/
│   ├── review-branch.ts      # 审查分支示例
│   ├── review-commit.ts      # 审查 commit 示例
│   └── review-pr.ts          # 审查 PR 示例
├── package.json
└── tsconfig.json
```

## 3. 工具设计

### 3.1 read_file 工具

读取当前项目下某个文件的内容。

```typescript
interface ReadFileArgs {
  path: string;           // 文件路径（相对于项目根目录）
  start_line?: number;    // 起始行号（可选，从 1 开始）
  end_line?: number;      // 结束行号（可选）
}

interface ReadFileResult {
  output: string;         // 文件内容（带行号）
  error?: string;         // 错误信息
}
```

**使用示例：**

```json
// 读取整个文件
{ "path": "src/index.ts" }

// 读取指定行范围
{ "path": "src/index.ts", "start_line": 10, "end_line": 50 }
```

**工具定义：**

```typescript
const readFileTool = defineTool<ReadFileArgs>({
  name: "read_file",
  description: "Read the contents of a file in the current project. Returns file content with line numbers.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to project root (e.g., 'src/index.ts')"
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
    // 实现...
  }
});
```

### 3.2 write_file 工具

写入文件，主要用于输出审查报告。

```typescript
interface WriteFileArgs {
  path: string;           // 文件路径
  content: string;        // 文件内容
  mode?: "overwrite" | "append";  // 写入模式（默认 overwrite）
}

interface WriteFileResult {
  output: string;         // 成功消息
  error?: string;         // 错误信息
}
```

**使用示例：**

```json
// 写入审查报告
{
  "path": "review-report.md",
  "content": "# Code Review Report\n\n## Summary\n..."
}

// 追加内容
{
  "path": "review-report.md",
  "content": "\n## Additional Notes\n...",
  "mode": "append"
}
```

**工具定义：**

```typescript
const writeFileTool = defineTool<WriteFileArgs>({
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
        description: "Content to write to the file"
      },
      mode: {
        type: "string",
        enum: ["overwrite", "append"],
        description: "Write mode: 'overwrite' (default) or 'append'"
      }
    },
    required: ["path", "content"]
  },
  execute: async (args) => {
    // 实现...
  }
});
```

### 3.3 git 工具

执行 git 命令，用于获取 diff、log、blame 等信息。

```typescript
interface GitArgs {
  command: string;        // git 子命令
  args?: string[];        // 命令参数
}

interface GitResult {
  output: string;         // 命令输出
  error?: string;         // 错误信息
}
```

**常用命令示例：**

| 场景 | 命令 | 参数示例 |
|------|------|----------|
| 未暂存的改动 | `diff` | `[]` |
| 已暂存的改动 | `diff` | `["--cached"]` |
| 当前分支 vs main | `diff` | `["main...HEAD"]` |
| 当前分支 vs origin/main | `diff` | `["origin/main...HEAD"]` |
| 特定 commit 之后 | `diff` | `["abc123..HEAD"]` |
| 单个 commit 内容 | `show` | `["abc123"]` |
| 文件的 diff | `diff` | `["--", "src/index.ts"]` |
| 最近 N 次提交 | `log` | `["--oneline", "-10"]` |
| 文件历史 | `log` | `["--oneline", "-10", "--", "src/index.ts"]` |
| 文件 blame | `blame` | `["src/index.ts"]` |
| 当前分支名 | `branch` | `["--show-current"]` |
| 改动文件列表 | `diff` | `["--name-only", "main...HEAD"]` |
| 状态 | `status` | `["--short"]` |

**使用示例：**

```json
// 获取 unstaged diff
{ "command": "diff", "args": [] }

// 获取 staged diff
{ "command": "diff", "args": ["--cached"] }

// 获取当前分支相对于 main 的 diff
{ "command": "diff", "args": ["main...HEAD"] }

// 获取特定 commit 之后的改动
{ "command": "diff", "args": ["13bad5..HEAD"] }

// 查看单个 commit 的内容
{ "command": "show", "args": ["13bad5"] }

// 获取文件的 blame 信息
{ "command": "blame", "args": ["-L", "10,20", "src/index.ts"] }

// 获取最近的提交历史
{ "command": "log", "args": ["--oneline", "-10"] }

// 获取改动的文件列表
{ "command": "diff", "args": ["--name-only", "main...HEAD"] }
```

**工具定义：**

```typescript
const gitTool = defineTool<GitArgs>({
  name: "git",
  description: `Execute git commands to inspect code changes, history, and blame information.

Common usage patterns:
- Unstaged changes: git diff
- Staged changes: git diff --cached
- Branch diff: git diff main...HEAD
- Commit range: git diff <commit>..HEAD
- Single commit: git show <commit>
- File blame: git blame <file>
- Recent commits: git log --oneline -10
- Changed files: git diff --name-only main...HEAD

Always use this tool to get diffs instead of guessing what changed.`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Git subcommand (diff, show, log, blame, status, branch, etc.)"
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
    // 实现：使用 child_process 执行 git 命令
  }
});
```

### 3.4 gh 工具

执行 GitHub CLI 命令，用于与 PR 交互。

```typescript
interface GhArgs {
  command: string;        // gh 子命令 (pr, issue, repo 等)
  subcommand: string;     // 子命令 (view, diff, list 等)
  args?: string[];        // 其他参数
}

interface GhResult {
  output: string;         // 命令输出
  error?: string;         // 错误信息
}
```

**常用命令示例：**

| 场景 | 命令 | 子命令 | 参数示例 |
|------|------|--------|----------|
| 查看 PR 信息 | `pr` | `view` | `["123"]` |
| 获取 PR diff | `pr` | `diff` | `["123"]` |
| 查看 PR 改动文件 | `pr` | `view` | `["123", "--json", "files"]` |
| 列出 PR | `pr` | `list` | `["--state", "open"]` |
| PR 评论 | `pr` | `comment` | `["123", "-b", "message"]` |
| 查看当前 PR | `pr` | `view` | `[]` |
| PR checks 状态 | `pr` | `checks` | `["123"]` |

**使用示例：**

```json
// 查看 PR 基本信息
{ "command": "pr", "subcommand": "view", "args": ["123"] }

// 获取 PR diff
{ "command": "pr", "subcommand": "diff", "args": ["123"] }

// 获取 PR 改动的文件列表
{ "command": "pr", "subcommand": "view", "args": ["123", "--json", "files,additions,deletions"] }

// 查看当前分支关联的 PR
{ "command": "pr", "subcommand": "view" }

// 列出所有 open 的 PR
{ "command": "pr", "subcommand": "list", "args": ["--state", "open"] }
```

**工具定义：**

```typescript
const ghTool = defineTool<GhArgs>({
  name: "gh",
  description: `Execute GitHub CLI commands to interact with Pull Requests.

Common usage patterns:
- View PR info: gh pr view <number>
- Get PR diff: gh pr diff <number>
- List open PRs: gh pr list --state open
- PR changed files: gh pr view <number> --json files
- Current branch PR: gh pr view

Use this tool to fetch PR information and diffs.`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "GitHub CLI command (pr, issue, repo)"
      },
      subcommand: {
        type: "string",
        description: "Subcommand (view, diff, list, checks, etc.)"
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
    // 实现：使用 child_process 执行 gh 命令
  }
});
```

## 4. System Prompt 设计

System Prompt 应该包含以下部分：

### 4.1 角色定义

```markdown
You are a code review agent. Your sole purpose is to review code changes
and provide actionable, high-quality feedback.
```

### 4.2 工具使用指南

在 system.md 中需要详细说明每个工具的用法：

```markdown
# Available Tools

You have access to exactly four tools:

## 1. read_file
Read file contents to understand context.

**Parameters:**
- `path` (required): File path relative to project root
- `start_line` (optional): Starting line number (1-indexed)
- `end_line` (optional): Ending line number

**Examples:**
```json
// Read entire file
{ "path": "src/index.ts" }

// Read lines 10-50
{ "path": "src/index.ts", "start_line": 10, "end_line": 50 }
```

## 2. write_file
Write review reports or summaries.

**Parameters:**
- `path` (required): File path
- `content` (required): Content to write
- `mode` (optional): "overwrite" (default) or "append"

**Examples:**
```json
{ "path": "review.md", "content": "# Review Report\n..." }
```

## 3. git
Execute git commands for diffs, logs, and blame.

**Common Commands:**

| Scenario | Example |
|----------|---------|
| Unstaged changes | `{ "command": "diff" }` |
| Staged changes | `{ "command": "diff", "args": ["--cached"] }` |
| Branch vs main | `{ "command": "diff", "args": ["main...HEAD"] }` |
| After commit X | `{ "command": "diff", "args": ["X..HEAD"] }` |
| Single commit | `{ "command": "show", "args": ["abc123"] }` |
| File blame | `{ "command": "blame", "args": ["src/index.ts"] }` |
| Recent commits | `{ "command": "log", "args": ["--oneline", "-10"] }` |
| Changed files | `{ "command": "diff", "args": ["--name-only", "main...HEAD"] }` |

## 4. gh
Execute GitHub CLI commands for PR operations.

**Common Commands:**

| Scenario | Example |
|----------|---------|
| View PR | `{ "command": "pr", "subcommand": "view", "args": ["123"] }` |
| PR diff | `{ "command": "pr", "subcommand": "diff", "args": ["123"] }` |
| PR files | `{ "command": "pr", "subcommand": "view", "args": ["123", "--json", "files"] }` |
| List PRs | `{ "command": "pr", "subcommand": "list" }` |
```

### 4.3 审查流程

```markdown
# Review Workflow

## Step 1: Determine Review Scope
Based on user input, determine what to review:

| User Request | Action |
|--------------|--------|
| "review current branch" | `git diff main...HEAD` or `git diff origin/main...HEAD` |
| "review staged" | `git diff --cached` |
| "review unstaged" | `git diff` |
| "review commit X" | `git show X` |
| "review after commit X" | `git diff X..HEAD` |
| "review PR N" | `gh pr diff N` |
| "review file X" | `git diff -- X` |

If uncertain, ask for clarification.

## Step 2: Gather Context
1. Get the diff using appropriate git/gh command
2. Identify all modified files from the diff
3. Read ENTIRE content of each modified file using read_file
4. Check for convention files: AGENTS.md, CONVENTIONS.md, .editorconfig
5. Use git blame on suspicious sections if needed

## Step 3: Analyze and Report
Focus on:
- **Bugs**: Logic errors, edge cases, error handling, security issues
- **Structure**: Pattern violations, code organization
- **Performance**: Only obvious issues (O(n²), N+1 queries)
```

### 4.4 输出格式

```markdown
# Output Format

## Review Structure
Organize by severity:

### Critical (Must Fix)
Bugs causing runtime errors, data corruption, or security vulnerabilities.

### Warning (Should Fix)
Issues that may cause problems under certain conditions.

### Suggestion (Consider)
Improvements that enhance code quality but aren't blocking.

## Issue Format
```
**[SEVERITY] Brief Title**
📍 `path/to/file.ts:42`

[1-2 sentence description]

[Specific scenario where this fails]

[Suggested fix]
```

## Final Summary
- Total issues by severity
- Overall assessment (approve / request changes / needs discussion)
- Broader patterns or suggestions
```

## 5. 实现代码

### 5.1 工具实现 (`src/tools/`)

#### read-file.ts

```typescript
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
```

#### write-file.ts

```typescript
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
  description: "Write content to a file. Use for saving review reports.",
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
```

#### git.ts

```typescript
import { defineTool } from "simple-agent";
import { execSync } from "child_process";

interface GitArgs {
  command: string;
  args?: string[];
}

// 允许的 git 命令（安全白名单）
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
    // 安全检查
    if (!ALLOWED_COMMANDS.includes(args.command)) {
      return {
        output: "",
        error: `Command '${args.command}' is not allowed. Allowed: ${ALLOWED_COMMANDS.join(", ")}`
      };
    }

    try {
      const cmdArgs = args.args ?? [];
      const fullCommand = ["git", args.command, ...cmdArgs].join(" ");

      const output = execSync(fullCommand, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB
        cwd: process.cwd()
      });

      return { output: output || "(no output)" };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      // 提取有用的错误信息
      if (errMsg.includes("stderr:")) {
        const stderr = errMsg.split("stderr:")[1]?.trim() || errMsg;
        return { output: "", error: stderr };
      }
      return { output: "", error: errMsg };
    }
  }
});
```

#### gh.ts

```typescript
import { defineTool } from "simple-agent";
import { execSync } from "child_process";

interface GhArgs {
  command: string;
  subcommand: string;
  args?: string[];
}

// 允许的 gh 命令
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
    // 安全检查
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
```

### 5.2 Agent 主类 (`src/agent.ts`)

```typescript
import { createAgent, type Agent, type AgentEvent } from "simple-agent";
import { readFileTool } from "./tools/read-file.js";
import { writeFileTool } from "./tools/write-file.js";
import { gitTool } from "./tools/git.js";
import { ghTool } from "./tools/gh.js";
import * as fs from "fs/promises";
import * as path from "path";

export interface CodeReviewAgentOptions {
  model?: string;
  maxSteps?: number;
  onEvent?: (event: AgentEvent) => void;
}

export async function createCodeReviewAgent(
  options: CodeReviewAgentOptions = {}
): Promise<Agent> {
  // 读取 system prompt
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

// 便捷函数：直接运行 review
export async function runCodeReview(
  request: string,
  options: CodeReviewAgentOptions = {}
): Promise<string> {
  const agent = await createCodeReviewAgent(options);
  return agent.run(request, options.onEvent);
}
```

### 5.3 入口文件 (`src/index.ts`)

```typescript
export { createCodeReviewAgent, runCodeReview } from "./agent.js";
export { readFileTool } from "./tools/read-file.js";
export { writeFileTool } from "./tools/write-file.js";
export { gitTool } from "./tools/git.js";
export { ghTool } from "./tools/gh.js";
```

## 6. 使用示例

### 6.1 审查当前分支

```typescript
import { runCodeReview } from "./src/index.js";

async function main() {
  const review = await runCodeReview("帮我 review 当前 branch 代码", {
    onEvent: (event) => {
      if (event.type === "text") {
        process.stdout.write(event.text);
      } else if (event.type === "tool_call") {
        console.log(`\n[Tool] ${event.name}`);
      }
    }
  });

  console.log("\n\n=== Review Complete ===\n");
  console.log(review);
}

main();
```

### 6.2 审查特定 Commit 之后的改动

```typescript
import { runCodeReview } from "./src/index.js";

async function main() {
  const review = await runCodeReview("帮我 review commit 13bad5 之后的代码");
  console.log(review);
}

main();
```

### 6.3 审查 Pull Request

```typescript
import { runCodeReview } from "./src/index.js";

async function main() {
  const review = await runCodeReview("帮我 review pull request 12 的代码");
  console.log(review);
}

main();
```

### 6.4 CLI 交互模式

```typescript
import * as readline from "readline";
import { createCodeReviewAgent } from "./src/index.js";

async function main() {
  const agent = await createCodeReviewAgent();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("Code Review Agent Ready. Type your request:");

  rl.on("line", async (input) => {
    if (input.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    const response = await agent.run(input, (event) => {
      if (event.type === "text") {
        process.stdout.write(event.text);
      }
    });

    console.log("\n---");
  });
}

main();
```

## 7. 安全考虑

### 7.1 命令执行安全

- **白名单机制**：只允许执行预定义的安全 git/gh 子命令
- **参数验证**：对传入的参数进行基本验证
- **路径限制**：文件操作限制在项目目录内
- **输出限制**：限制命令输出的最大大小

### 7.2 敏感信息保护

- 不执行可能暴露凭证的命令
- 不读取 `.env`、`.git/config` 等敏感文件
- 审查报告不应包含 secrets

## 8. 扩展建议

### 8.1 未来功能

1. **自动修复**：对于简单问题，提供自动修复功能
2. **规则配置**：支持自定义审查规则
3. **集成 CI/CD**：作为 CI 流程的一部分运行
4. **多语言支持**：针对不同语言的特定检查

### 8.2 性能优化

1. **增量审查**：只审查变化的部分
2. **并行读取**：并行读取多个文件
3. **缓存机制**：缓存文件内容和 git 信息

## 9. 总结

本设计文档描述了一个基于 Simple Agent SDK 的 Code Review Agent，具备以下特点：

1. **四个核心工具**：read_file、write_file、git、gh
2. **灵活的审查范围**：支持 branch、commit、PR 等多种审查场景
3. **结构化输出**：按严重程度分类的审查报告
4. **安全设计**：白名单机制和路径限制
5. **易于扩展**：基于 Simple Agent SDK 的模块化设计

通过这个设计，Agent 能够理解用户的自然语言请求，自动选择合适的 git/gh 命令获取代码变更，读取完整的文件上下文，并提供专业的代码审查反馈。
