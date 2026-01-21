import { runCodeReview } from "../src/index.js";

async function main() {
  // Get PR number from command line args
  const prNumber = process.argv[2];
  
  if (!prNumber) {
    console.error("Usage: npx tsx examples/review-pr.ts <pr-number>");
    process.exit(1);
  }

  const review = await runCodeReview(`帮我 review pull request ${prNumber} 的代码`, {
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
