# Code Review Agent

A code review agent built on Simple Agent SDK that can review code changes, analyze pull requests, and provide actionable feedback.

## Features

- **Multiple Review Scenarios**: Review branches, commits, staged changes, or pull requests
- **Git Integration**: Execute git commands to get diffs, logs, and blame information
- **GitHub PR Support**: Interact with GitHub Pull Requests using gh CLI
- **Structured Output**: Provides reviews organized by severity (Critical, Warning, Suggestion)
- **Security**: Whitelist-based security for git and gh commands
- **Flexible CLI**: Run from any directory to review any project

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Using the CLI (Recommended)

The CLI tool allows you to run code reviews from **any directory** and review **any project**:

```bash
# Review unstaged changes in current project
npx tsx wk6/code-review-agent/src/cli.ts "review unstaged"

# Review all changes (staged + unstaged)
npx tsx wk6/code-review-agent/src/cli.ts "review all"

# Review current branch vs main
npx tsx wk6/code-review-agent/src/cli.ts "review current branch"

# Review specific commit
npx tsx wk6/code-review-agent/src/cli.ts "review commit abc123"

# Review pull request
npx tsx wk6/code-review-agent/src/cli.ts "review PR 123"

# With streaming output (see progress in real-time)
npx tsx wk6/code-review-agent/src/cli.ts "review unstaged" -s

# Custom model
npx tsx wk6/code-review-agent/src/cli.ts "review unstaged" --model gpt-4o-mini
```

#### CLI Usage from Any Directory

```bash
# From project root
cd /path/to/your/project
npx tsx ../wk6/code-review-agent/src/cli.ts "review unstaged"

# From any directory
npx tsx /absolute/path/to/wk6/code-review-agent/src/cli.ts "review branch"

# Pipe request from stdin
echo "review all" | npx tsx wk6/code-review-agent/src/cli.ts

# Interactive mode
npx tsx wk6/code-review-agent/src/cli.ts
```

### Using Example Scripts

For quick testing within the code-review-agent directory:

```bash
cd wk6/code-review-agent

# Review unstaged changes
npx tsx examples/review-unstaged.ts

# Review staged changes
npx tsx examples/review-staged.ts

# Review all changes
npx tsx examples/review-all.ts

# Review current branch
npx tsx examples/review-branch.ts

# Review specific commit
npx tsx examples/review-commit.ts <commit-hash>

# Review pull request
npx tsx examples/review-pr.ts <pr-number>
```

## Usage

### CLI Tool

The CLI tool supports natural language review requests. Just describe what you want to review:

```bash
npx tsx wk6/code-review-agent/src/cli.ts "your review request here"
```

**Supported Review Requests**:

| Request Type | Example |
|-------------|---------|
| Unstaged changes | `review unstaged` |
| Staged changes | `review staged` |
| All changes | `review all` |
| Current branch | `review current branch` |
| Branch vs main | `review branch vs main` |
| Specific commit | `review commit abc123` |
| After commit | `review after commit abc123` |
| Pull request | `review PR 123` |
| Specific file | `review src/index.ts` |

**CLI Options**:

| Option | Description |
|--------|-------------|
| `-r, --request` | Review request (or pass as argument) |
| `-m, --model` | OpenAI model to use (default: gpt-4o) |
| `--max-steps` | Maximum agent steps (default: 30) |
| `-s, --streaming` | Enable streaming output |

### Using the Agent Class

```typescript
import { createCodeReviewAgent } from "./src/index.js";

async function main() {
  const agent = await createCodeReviewAgent({
    model: "gpt-4o",
    maxSteps: 30
  });

  const review = await agent.run("review current branch", (event) => {
    if (event.type === "text") {
      process.stdout.write(event.text);
    }
  });

  console.log(review);
}

main();
```

### Using the Convenience Function

```typescript
import { runCodeReview } from "./src/index.js";

async function main() {
  const review = await runCodeReview("review PR 123", {
    onEvent: (event) => {
      if (event.type === "text") {
        process.stdout.write(event.text);
      }
    }
  });

  console.log(review);
}

main();
```

### Using the Convenience Function

```typescript
import { runCodeReview } from "./src/index.js";

async function main() {
  const review = await runCodeReview("帮我 review pull request 123 的代码", {
    onEvent: (event) => {
      if (event.type === "text") {
        process.stdout.write(event.text);
      }
    }
  });

  console.log(review);
}

main();
```

## Supported Review Scenarios

| User Request | Action |
|--------------|--------|
| "review current branch" | Reviews diff between current branch and main |
| "review staged" | Reviews staged changes |
| "review unstaged" | Reviews unstaged changes |
| "review commit X" | Reviews a specific commit |
| "review after commit X" | Reviews changes after a specific commit |
| "review PR N" | Reviews a specific Pull Request |

## Available Tools

### 1. read_file
Read file contents with optional line range.

### 2. write_file
Write review reports to files.

### 3. git
Execute git commands (diff, show, log, blame, status, branch).

### 4. gh
Execute GitHub CLI commands for PR operations.

## Architecture

```
src/
├── agent.ts              # Agent factory and convenience functions
├── cli.ts               # CLI tool (new - run from any directory)
├── index.ts              # Main exports
├── prompts/
│   └── system.md         # System prompt with review guidelines
└── tools/
    ├── index.ts          # Tool exports
    ├── read-file.ts      # File reading tool
    ├── write-file.ts     # File writing tool
    ├── git.ts            # Git command tool with security whitelist
    └── gh.ts             # GitHub CLI tool with security whitelist
```

## Security

- Git and gh commands are restricted to a whitelist of safe subcommands
- File operations are limited to the current working directory
- Output size is limited to prevent buffer overflows

## Building

```bash
npm run build
```

## Development

```bash
npm run dev  # Watch mode
```

## Examples

See `examples/` directory for usage examples:

- `review-unstaged.ts` - Review unstaged changes (current working directory)
- `review-staged.ts` - Review staged changes
- `review-all.ts` - Review all changes (staged + unstaged)
- `review-branch.ts` - Review current branch (vs main)
- `review-commit.ts` - Review changes after a commit
- `review-pr.ts` - Review a Pull Request

## License

MIT
