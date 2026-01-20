# Instructions

## codex 的实现

查看 codex 的实现，找出其所有 system prompt 和工具调用相关的 prompt，撰写文档介绍它，放在 .learnings 下，必要时画 ascii 图表帮助理解

## claude code 旧版本反解析后的代码逆向设计实现

基于 @specs/js-decypher-design-doc.md 完整实现其功能

## claude 核心原理还原

查找网上 js decypher unuglify 或者处理 js ast 的工具，想办法把 ./vendors/claude 里面的核心要素还原出来。撰写一个 design doc，放在 ./specs 下，design doc 使用中文

## open code 与 LLM 交互原理分析

查看 ./vendors/opencode 源码，帮我了解如何最方便的获得 opencode 每次向 llm 发送的包含完整内容的输入输出，最好是有 hook / plugin 什么的，避免我直接修改源码。先不要撰写，告诉我方案，将输出保存在 ./specs/wk6/opencode-interaction-llm.md 

## opencode-llm 交互方式生成 jsonl

使用方案1，注意一次完整的对话(用户输入，agent 多轮工具调用，最后得到完整结果)的内容放在同一个 jsonl 里，新的内容 append 进去，不同的对话使用不同的 jsonl，请捕获每个 turn 到 llm 的完整输入和输出。脚本放在 ./wk6/plugins/log-conversation.ts 中，确保代码的正确性，然后部署，输出内容放在 ./wk6/logs 下

## 构建 simple agent

基于 ./specs/wk6/0001-simple-agent-design.md 的规范，使用 openai 构建一个 agent sdk，提供 agent 的核心功能，用户可以很方便的为 agent 添加自定义工具和 mcp，完成构建后，确保所有实现符合 design spec，并提供几个 example 来展示如何使用(包含至少一个使用 mcp 的例子)。代码放在 ./wk6/simple-agent 目录下

# 不基于已有 sepc 的 llm 自主构建 agent

帮我构建一个实验性质简单但是完整的 Simple Agent，它可以完成多步的 agent loop，如图，think ultra hard 构建一个 typescript 的 design 放在 ./specs/wk6/0004-simple-agent-auto.md，使用中文输出
