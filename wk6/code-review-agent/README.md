# Code Review Agent

A code review agent built on Simple Agent SDK that can review code changes, analyze pull requests, and provide actionable feedback.

## Features

- **Multiple Review Scenarios**: Review branches, commits, staged changes, or pull requests
- **Git Integration**: Execute git commands to get diffs, logs, and blame information
- **GitHub PR Support**: Interact with GitHub Pull Requests using gh CLI
- **Structured Output**: Provides reviews organized by severity (Critical, Warning, Suggestion)
- **Security**: Whitelist-based security for git and gh commands

## Installation

```bash
npm install
```

## Quick Start

### Review Unstaged Changes (Current Working Directory)

```bash
npx tsx examples/review-unstaged.ts
```

### Review Staged Changes

```bash
npx tsx examples/review-staged.ts
```

### Review All Changes (Staged + Unstaged)

```bash
npx tsx examples/review-all.ts
```

### Review Current Branch (vs main)

```bash
# Note: Only works if you're on a different branch than main
npx tsx examples/review-branch.ts
```

### Review Specific Commit

```bash
npx tsx examples/review-commit.ts <commit-hash>
```

### Review Pull Request

```bash
npx tsx examples/review-pr.ts <pr-number>
```

## Usage

### Using the Agent Class

```typescript
import { createCodeReviewAgent } from "./src/index.js";

async function main() {
  const agent = await createCodeReviewAgent({
    model: "gpt-4o",
    maxSteps: 30
  });

  const review = await agent.run("帮我 review 当前 branch 代码", (event) => {
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
