# Instructions

## 阅读 codex 的代码

仔细阅读 ./venders/codex 的代码，撰写一个详细的架构分析文档，如需图表，使用 mermaid chart。
文档放在 ./specs/w4/codex-arch-by-codex.md

## 阅读 codex 的 history

查看 repo 的所有 commit history，梳理其代码变更的脉络，必要时辅以 mermaid chart，写入 ./specs/w4/codex-changes-by-claude.md

*你感兴趣的一切*

## codex 事件循环

帮我梳理 codex 代码处理事件循环的部分，详细解读当用户发起一个任务后，codex 是如何分解处理这个任务，并不断自我迭代，到最终完成整个任务。这个过程中发生了审核，codex 如何决定任务完成还是未完成需要继续迭代。如果需要，可以使用 mermaid chart 来辅助说明。将结果写入 ./specs/w4/codex-event-loop-claude.md

## codex 工具调用

帮我梳理codex 代码处理工具调用的部分，详细解读 codex 是如何知道有哪些工具可以调用，如何选择工具，如何调用工具，如何处理工具的返回结果等，如何决定工具调用是否成功等等。如果需要，可以使用 mermaid chart 来辅助说明。将结果写入 ./specs/w4/codex-tool-call-claude.md

## 了解 codex 的 appply_patch 工具

帮我梳理 ./vendors/codex 的 apply_patch 工具，详细解读 apply_patch 工具的原理，如何使用，如何实现，如何测试等等，以及 apply_patch 工具的代码是如何跟 codex 其他部分集成的，另外我注意到 apply_patch_tool_instructions.md 文件，这个文件是做什么的，如何跟 apply_patch crate 打交道，如果需要，可以使用 mermain chart 来辅助说明。写入 ./specs/w4/apply-patch.md

## appply_patch 集成

如果我要把 apply_patch 工具集成到我自己的项目中，我需要做哪些工作，如何做。如果需要，可以用 mermaid chart 来辅助说明。
写入 ./specs/w4/codex-apply-patch-integration.md

## 阅读 gin 框架的代码

仔细阅读./vendors/gin 的代码，撰写一个详细的架构设计文档，如需图表仔细阅读./vendors/gin 的代码，撰写一个详细的架构设计文档，如需图标，使用 mermaid chart。
文档放在 ./specs/w4/gin-arch-claude.md ，使用 mermaid chart。
文档放在 ./specs/w4/gin-arch-claude.md 

## 分析 gin 框架路由实现原理

仔细阅读 ./vendors/gin 的代码，分析其路由实现原理，包括路由注册、路由请求分发、路由查找等，撰写一个详细的设计实现文档，如需图表，使用 mermain chart，将结果放在 ./specs/w4/gin-router.md