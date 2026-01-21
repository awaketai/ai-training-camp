import { createCodeReviewAgent } from "../src/index.js";

async function main() {
  // 创建 agent 时可以指定模型
  const agent = await createCodeReviewAgent({
    model: "gpt-4o",  // 或 gpt-4o-mini, gpt-3.5-turbo 等
    maxSteps: 30
  });

  const review = await agent.run("帮我 review 当前 branch 代码", {
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
