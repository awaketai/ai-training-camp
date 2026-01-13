"""pg-mcp 入口点

提供命令行启动入口。
"""

from pg_mcp.server import mcp


def main() -> None:
    """主入口

    启动 FastMCP Server，自动处理 stdio 通信。
    """
    mcp.run()


if __name__ == "__main__":
    main()
