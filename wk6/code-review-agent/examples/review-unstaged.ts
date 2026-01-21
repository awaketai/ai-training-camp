import { runCodeReview } from "../src/index.js";

async function main() {
  // Review unstaged changes
  const review = await runCodeReview("帮我 review 当前工作区的改动（unstaged changes）", {
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
