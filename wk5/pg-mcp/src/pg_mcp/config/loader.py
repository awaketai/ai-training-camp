"""配置加载器

支持从 YAML 文件和环境变量加载配置。
"""

import os
import re
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

from pg_mcp.config.settings import Settings
from pg_mcp.utils.errors import ConfigurationError


def _expand_env_vars(value: Any) -> Any:
    """递归展开配置值中的环境变量

    支持 ${VAR_NAME} 格式的环境变量引用。

    Args:
        value: 配置值，可以是字符串、字典或列表

    Returns:
        展开环境变量后的值
    """
    if isinstance(value, str):
        # 匹配 ${VAR_NAME} 格式
        pattern = r"\$\{(\w+)\}"
        matches = re.findall(pattern, value)
        for var_name in matches:
            env_value = os.getenv(var_name, "")
            value = value.replace(f"${{{var_name}}}", env_value)
        return value
    elif isinstance(value, dict):
        return {k: _expand_env_vars(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [_expand_env_vars(item) for item in value]
    else:
        return value


def load_yaml_config(config_path: str | Path | None = None) -> dict[str, Any]:
    """加载 YAML 配置文件

    Args:
        config_path: 配置文件路径，为空时搜索默认位置

    Returns:
        配置字典

    Raises:
        ConfigurationError: 配置文件不存在或格式错误
    """
    # 搜索配置文件
    search_paths = []
    if config_path:
        search_paths.append(Path(config_path))
    else:
        # 默认搜索路径
        search_paths = [
            Path.cwd() / "config.yaml",
            Path.cwd() / "config.yml",
            Path.home() / ".config" / "pg-mcp" / "config.yaml",
        ]

    config_file = None
    for path in search_paths:
        if path.exists():
            config_file = path
            break

    if not config_file:
        # 没有配置文件，返回空字典
        return {}

    try:
        with open(config_file, encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
            return _expand_env_vars(config)
    except yaml.YAMLError as e:
        raise ConfigurationError(f"YAML 配置文件格式错误: {e}") from e
    except OSError as e:
        raise ConfigurationError(f"无法读取配置文件: {e}") from e


def load_settings(
    config_path: str | Path | None = None,
    env_file: str | Path | None = None,
) -> Settings:
    """加载完整配置

    配置加载优先级（高到低）：
    1. 环境变量（PG_MCP_ 前缀）
    2. .env 文件
    3. YAML 配置文件
    4. 默认值

    Args:
        config_path: YAML 配置文件路径
        env_file: .env 文件路径

    Returns:
        Settings 实例

    Raises:
        ConfigurationError: 配置加载失败
    """
    # 加载 .env 文件
    if env_file:
        load_dotenv(env_file)
    else:
        # 尝试加载默认 .env 文件
        default_env = Path.cwd() / ".env"
        if default_env.exists():
            load_dotenv(default_env)

    # 加载 YAML 配置
    yaml_config = load_yaml_config(config_path)

    try:
        # 从 YAML 配置创建 Settings
        # pydantic-settings 会自动从环境变量覆盖
        return Settings(**yaml_config)
    except Exception as e:
        raise ConfigurationError(f"配置加载失败: {e}") from e
