帮我参照 @.claude/commands/speckit.specify.md 的结构，think ultra hard，构建一个对 Python 和Tyspecript 代码进行深度代码审查的命令，放在 @.claude/commands/下。主要考虑以下几个问题：

- 架构和设计：是否考虑 Python 和 Typescript的架构和设计最佳实践？是否有清晰的接口设计？是否考虑一定程度的扩展性
- KISS 原则
- 代码质量：DRY,YAGNI, SOLIC,etc。函数原则上不超过 150 行，参数原则上不超过 7 个。
- 使用 builder 模式
