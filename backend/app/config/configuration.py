import json
import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional, Union

from dotenv import load_dotenv
from loguru import logger


class Configuration:
    """管理应用程序的配置和环境变量。"""
    
    DEFAULT_CONFIG = {
        "llm": {
            "model": "qwen3_32",
            "api_key": "",
            "api_base": "http://192.168.11.199:1282/v1",
            "timeout": 60,
            "max_retries": 3
        },
        "server": {
            "host": "0.0.0.0",
            "port": 8000,
            "debug": False,
            "log_level": "INFO"
        },
        "chat": {
            "max_history": 100,
            "max_tools": 5
        }
    }

    def __init__(self, config_path: Optional[str] = None) -> None:
        """初始化配置管理器。
        
        Args:
            config_path: 配置文件路径，支持.json和.yaml格式
        """
        self.config_path = config_path or os.getenv("CONFIG_PATH")
        self.load_env()
        self.config = self.DEFAULT_CONFIG.copy()
        
        # 如果指定了配置文件，则加载它
        if self.config_path:
            try:
                user_config = self.load_config_file(self.config_path)
                self.config = self._merge_configs(self.config, user_config)
            except Exception as e:
                logger.error(f"加载配置文件失败: {e}")
                
        self._validate_config()

    @staticmethod
    def load_env(env_file: str = ".env") -> None:
        """从.env文件加载环境变量。
        
        Args:
            env_file: .env文件路径
        """
        try:
            load_dotenv(dotenv_path=env_file, verbose=True)
            logger.debug(f"已从 {env_file} 加载环境变量")
        except Exception as e:
            logger.warning(f"加载环境变量失败: {e}")
            # 继续执行，因为环境变量可能已经设置

    @staticmethod
    def load_config_file(file_path: str) -> Dict[str, Any]:
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
                elif suffix in [".yml", ".yaml"]:
                    return yaml.safe_load(f) or {}
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

    def _merge_configs(self, default_config: Dict[str, Any], user_config: Dict[str, Any]) -> Dict[str, Any]:
        """递归合并配置字典，用户配置优先级更高。
        
        Args:
            default_config: 默认配置
            user_config: 用户配置
            
        Returns:
            合并后的配置
        """
        result = default_config.copy()
        
        for key, value in user_config.items():
            # 如果用户配置中的值是字典，且默认配置中对应的值也是字典，则递归合并
            if key in result and isinstance(value, dict) and isinstance(result[key], dict):
                result[key] = self._merge_configs(result[key], value)
            else:
                # 否则直接覆盖
                result[key] = value
                
        return result
        
    def _validate_config(self) -> None:
        """验证配置是否有效。"""
        # 检查必要的配置项
        if not self.get(["llm", "model"]):
            logger.warning("未配置LLM模型，使用默认值")
            
        # 检查服务器配置
        if not self.get(["server", "port"]):
            logger.warning("未配置服务器端口，使用默认值")
    
    def get(self, key: Union[str, list], default: Any = None) -> Any:
        """获取配置项，支持嵌套键。
        
        Args:
            key: 配置项键名，可以是字符串或字符串列表（用于嵌套配置）
            default: 默认值
            
        Returns:
            配置项值
        """
        if isinstance(key, str):
            return self.config.get(key, default)
            
        # 处理嵌套键
        current = self.config
        for k in key:
            if not isinstance(current, dict) or k not in current:
                return default
            current = current[k]
            
        return current
        
    def set(self, key: Union[str, list], value: Any) -> None:
        """设置配置项，支持嵌套键。
        
        Args:
            key: 配置项键名，可以是字符串或字符串列表（用于嵌套配置）
            value: 配置项值
        """
        if isinstance(key, str):
            self.config[key] = value
            return
            
        # 处理嵌套键
        current = self.config
        for i, k in enumerate(key):
            if i == len(key) - 1:
                # 最后一个键，设置值
                current[k] = value
            else:
                # 确保路径存在
                if k not in current or not isinstance(current[k], dict):
                    current[k] = {}
                current = current[k]
