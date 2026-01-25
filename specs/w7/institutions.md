# Institutions

## 作业

用 ai 构建一个使用自然语言进行 Postgres 表接结构设计，以及后续迭代生成 migration 的智能体

## gemini 探索 slides 生成工具

帮我研究一下市面上关于使用 AI 进行 slieces 生成的工具，尤其是 Manus 和 NoteboolLLM 的 slide 功能。探索它实现的原理，另外，探索如果使用 google 最新退出的 nana banana pro 来做 slides 生成(思考：根据文本生成图片，把所有图片以幻灯片的形似连起来播放，就构成了 slidex，类似 NoteboolLLM 里的 slides 生成，要求：图片的视觉风格统一，用户可以提供一个视觉风格图片或者文字描述)。

## 生成 slides 设计文档

根据 @specs/w7/genslides.jpg 的内容，仔细阅读并思考，生成一个 PR，要求：使用中文，这个 app 是一个本地运行的单页 app，使用 nano banana pro 生成图片 slides,可以以走马灯的形式全屏播出。后端使用 python，前端使用 typescript，文件保存在 ./specs/w7/0001-gen-slides-prd.md

## 优化

1.对于侧边栏 slide ,可以选中并拖拽改变顺序
2.文本内容变化后，如果图片中没有对应文本 hash 的图片，在主图片区域下放一个按钮，用户点击可以生成新的图片
3.outline.yml 中需要保存用户选择的风格图片，当第一次打开时，如果没有风格图片，需要有个 popup，用户可以输入一段文字，生成两个图片，让用户选择，用户选中的作为 slides 的风格，以后生成新的图片时参考这张图片
5. Nano Banana Pro API Key -> Gemini API key

## 生成 gen slides 项目 design spec

根据 ./specs/w7/0001-gen-slides-prd.md 和 @specs/w7/genslides.jpg 的内容，生成一个 design spec，放在 ./specs/w7/0002-design-spec.md 文件中，要求：使用中文，注意所有前端锁需要的 API 接口要定义清楚，整体项目的目录结构也要定义清楚，后端代码层次清晰，API / 业务 / 存储要保持清晰的边界

## 生成项目结构

根据 ./specs/w7/0002-design-spec.md 的内容，生成项目的空的目录结构。先不要生成代码，在 ./wk7/gen-slides/backend 和 ./wk7/gen-slides/frontend 目录下分别生成 CLAUDE.md 文件，内容考虑：

- 所使用语言框架的 best practices
- 架构设计遵循原则：SOLIC/YAGNI/KISS
- 代码的组织结构
- 并发处理
- 错误处理和日志处理

## 生成 SKILL

根据 @wk7/gen-slides/backend 下面的代码使用 google-genai 的情况，构建一个使用 google-genai 调用 gemini-3-pro-image-preview 生成图片（可以有 reference 图片）的 skill，然后进一步探索网络上的资料和本地已经安装的 google-genai 包的源码，让使用 skill 的 agent 能很快上手生成各种 image，这个 skill 的目的是当做新的项目的时候，知道如何调用 google genai 库来使用 gemini-3-pro-image-preview。目前只支持 python,未来支持更多语言

