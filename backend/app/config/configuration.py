import json
import os
from pathlib import Path
import yaml
from loguru import logger
from pydantic_settings import BaseSettings, SettingsConfigDict


class Setting(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    OPENAI_API_KEY: str
    OPENAI_BASE_URL: str
    LLM_MODEL: str
    MEM0_API_KEY: str


class MCPConfiguration:
    """MCP Server config"""

    @staticmethod
    def load_config_file(file_path: str) -> dict:
        """从文件加载配置，支持JSON和YAML格式。

        Args:
            file_path: 配置文件的路径

        Returns:
            包含配置的字典

        Raises:
            FileNotFoundError: 如果配置文件不存在
            ValueError: 如果配置文件格式不支持或无效
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"配置文件不存在: {file_path}")

        path = Path(file_path)
        suffix = path.suffix.lower()

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                if suffix == ".json":
                    return json.load(f)
                else:
                    raise ValueError(f"不支持的配置文件格式: {suffix}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON配置文件格式无效: {file_path}, 错误: {e}")
            raise ValueError(f"JSON配置文件格式无效: {e}")
        except yaml.YAMLError as e:
            logger.error(f"YAML配置文件格式无效: {file_path}, 错误: {e}")
            raise ValueError(f"YAML配置文件格式无效: {e}")
        except Exception as e:
            logger.error(f"加载配置文件时出错: {file_path}, 错误: {e}")
            raise


setting = Setting()
