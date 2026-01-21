import { runCodeReview } from "../src/index.js";

async function main() {
  // Review all changes (both staged and unstaged)
  const review = await runCodeReview("帮我 review 所有的代码改动（包括已暂存和未暂存的）", {
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
