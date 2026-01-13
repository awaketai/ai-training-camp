"""日志配置模块

使用 structlog 提供结构化日志功能。
"""

import logging
import sys
from typing import Literal

import structlog
from structlog.typing import Processor


def setup_logging(
    level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO",
    log_format: Literal["json", "console"] = "console",
) -> None:
    """配置日志系统

    配置 structlog 和标准库 logging，支持 JSON 和 console 两种输出格式。

    Args:
        level: 日志级别，可选 DEBUG, INFO, WARNING, ERROR
        log_format: 输出格式，可选 json 或 console
    """
    # 设置标准库日志级别
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level),
    )

    # 通用处理器
    shared_processors: list[Processor] = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    # 根据格式选择渲染器
    if log_format == "json":
        renderer: Processor = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # 配置标准库的格式化器
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    # 应用格式化器到所有处理器
    for handler in logging.root.handlers:
        handler.setFormatter(formatter)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """获取结构化日志记录器

    Args:
        name: 日志记录器名称，如果为 None 则使用调用模块的名称

    Returns:
        structlog BoundLogger 实例
    """
    return structlog.get_logger(name)
