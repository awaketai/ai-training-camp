# Instruction

## 初始化项目

```
cargo install cargo-generate
cargo generate tyrchen/rust-lib-template

```

这是一个 geektime bootcamp agetn(GBA)项目，它的主要功能是封装 claude agent sdk，让用户可以很方便的围绕要给 repo 来添加新的功能。请把这个 rust 项目转换成一个 workspace，里面包含 crates/gba-core (core execute engine)，crates/gba-pm(prompt managet)，以及 apps/gba-cli(command line interface)。生成的是一个 gba cli。所有的 deps 放在 workspace 下，各个 crate 通过 `xx = { workspace = true }` 来引用。CLI 使用 clap /ratatui 来构建。prompt manager 使用 minijinja 来构建。core execute engine 使用 tokio / claude-agent-sdk-rs 0.6 来构建。所有 deps 都要使用最新版本。先不要撰写代码，生成各个 crate 的 skeletong 即可，不要使用 derive_builder 使用 typed_builder

## 生成设计文档

根据截图生成设计文档：

- 包括核心架构的 ascii diagram，及重要的流程
- 各个 crate 有清晰的职责和 public interface
- gba-core: 有核心的执行引擎，根据不同场景下的 Prompt、，调用 claude agent sdk 来执行任务。务必提供非常精简可用的接口
- gba-pm: 提示词管理器，负责加载、渲染、管理提示词。务必提供非常精简可用的接口
- gba-cli：命令行界面，负责与用户交互，并调用 gba-core 来执行任务
- 代码结构尽可能职责单一，不要出现重复代码，follow SOLID principles，尽可能使用 Rust 的最新特性
- 提供开发计划，包括每个阶段的任务

## 设计文档修改

1. .gba/config.toml 是干啥的？为什么需要？如果需要这样一个配置，请在设计里面说明，并使用 config.yml 格式。每个 feature 下面的 state.json 也使用 state.yml，需要定义它的结构
2.task kind 应该还有 verification
3.任务执行结果应该记录 turns / cost，放在state.yml 中，最后的 PR link 也放进去
4.在 `gba run` 过程中，如果中断，下次运行可以继续回复（在提示词中需要体现）
5.预先思考好所有场景下的提示词，放在 crates/gba-pm/templates 下，提示词用英文，我来 review

## 优化

init 的提示词还应该生成 .gba / .trees 等目录，以及更改 .gitignore；execute 的提示词最后要使用 gh cli 生成 pull request 并且提供详尽的 PR description 

请仔细 review 提示词中的变量以及条件判断：
1.是否有必要 - 我们要尽可能 follow convention over configuration
2.是否能在 execution engine 的上下文提供

那些提示词是作为 sys prompt 提供给 claude code sdk，那些提示词是作为 user prompt 提供

请思考在不同的场景下，那些需要 claude code preset，哪些不需要，哪些需要完整的工具，哪些不需要，这个应该在哪里定义，是写在 engine 中，还是配置中。

preset 不需要这么复杂吧，应该就是使用 claude code preset 与否，请查看 https://github.com/tyrchen/claude-agent-sdk-rs/blob/master/API.md 文档。如果每个任务都有 config.yml，那么是否还适合放在 crates/gba-pm 下？或者 templates 直接放在根目录下，改个其他的名字？

## 添加 submodule

创建目录 vendors，将项目 https://github.com/tyrchen/claude-agent-sdk-rs 作为 submodule 

## 构建gba

构建一个新的 git worktree(branch from main)，放在 .trees 下，仔细阅读 @specs/0001-design.md，根据其要求，使用 sub agent 分阶段完成其功能。每次完成一个阶段后提交代码，并确保 precommit hooks 通过。完成所有阶段后

启动一个新的 sub agent 调用 codex code review skill 对照 design spec 来 review 代码，然后根据 review 结果仔细思考，对合理的问题进行修改，并提交代码。最后，保证所有的测试通过，并确保所有的功能都符合 design spec 的要求后，生成一个 pull request，提供详细的 PR description。