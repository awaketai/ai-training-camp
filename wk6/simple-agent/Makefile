.PHONY: help install build dev clean test example-weather example-calculator example-mcp example-combined docs

# 默认目标
help:
	@echo "Simple Agent SDK - 可用命令:"
	@echo ""
	@echo "  make install          - 安装依赖"
	@echo "  make build            - 编译 TypeScript"
	@echo "  make dev              - 监听模式编译"
	@echo "  make clean            - 清理构建产物"
	@echo ""
	@echo "  make example-weather     - 运行天气工具示例"
	@echo "  make example-calculator  - 运行计算器示例"
	@echo "  make example-mcp         - 运行 MCP 文件系统示例"
	@echo "  make example-combined    - 运行组合示例"
	@echo "  make examples            - 运行所有示例"
	@echo ""
	@echo "  make docs             - 查看架构文档"
	@echo ""

# 安装依赖
install:
	npm install

# 编译
build:
	npm run build

# 监听模式
dev:
	npm run dev

# 清理
clean:
	rm -rf dist
	rm -f test-output.txt agent-log.txt

# 示例
example-weather:
	npx tsx examples/weather.ts

example-calculator:
	npx tsx examples/calculator.ts

example-mcp:
	npx tsx examples/mcp-filesystem.ts

example-combined:
	npx tsx examples/combined.ts

examples: example-weather example-calculator example-mcp example-combined

# 查看文档
docs:
	@cat docs/architecture.md
