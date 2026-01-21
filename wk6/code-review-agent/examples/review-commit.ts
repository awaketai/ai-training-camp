import { runCodeReview } from "../src/index.js";

async function main() {
  // Get commit hash from command line args
  const commitHash = process.argv[2];
  
  if (!commitHash) {
    console.error("Usage: npx tsx examples/review-commit.ts <commit-hash>");
    process.exit(1);
  }

  const review = await runCodeReview(`帮我 review commit ${commitHash} 之后的代码`, {
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
