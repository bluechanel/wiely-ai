"""日志配置模块。"""
import logging
import sys
import os
from typing import Dict, Any, Optional

from loguru import logger


class InterceptHandler(logging.Handler):
    """将标准库日志重定向到loguru的处理程序。"""
    
    def emit(self, record):
        """发送日志记录到loguru。
        
        Args:
            record: 日志记录
        """
        # 获取对应的 Loguru 日志级别
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # 找到日志调用的堆栈位置
        frame, depth = logging.currentframe(), 2
        while frame and frame.f_back and depth > 0:
            frame = frame.f_back
            depth -= 1
            
        # 提取额外的上下文信息
        extras = {}
        if hasattr(record, "props"):
            extras.update(record.props)

        logger.opt(depth=6, exception=record.exc_info).log(level, record.getMessage(), **extras)


def setup_logging(config: Optional[Dict[str, Any]] = None):
    """设置应用程序日志配置。
    
    Args:
        config: 日志配置字典，包含以下可选键：
            - level: 控制台日志级别 (默认: "INFO")
            - file_level: 文件日志级别 (默认: "DEBUG")
            - log_dir: 日志文件目录 (默认: "logs")
            - rotation: 日志文件轮转策略 (默认: "10 MB")
            - retention: 日志文件保留策略 (默认: "1 week")
            - format: 日志格式 (默认: 详细格式)
    """
    # 默认配置
    default_config = {
        "level": "INFO",
        "file_level": "DEBUG",
        "log_dir": "logs",
        "rotation": "10 MB",
        "retention": "1 week",
        "format": "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        "file_format": "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}"
    }
    
    # 合并配置
    if config is None:
        config = {}
    log_config = {**default_config, **config}
    
    # 移除所有默认处理器
    logger.remove()
    
    # 添加控制台处理器
    logger.add(
        sys.stderr,
        format=log_config["format"],
        level=log_config["level"]
    )
    
    # 确保日志目录存在
    log_dir = log_config["log_dir"]
    os.makedirs(log_dir, exist_ok=True)
    
    # 添加文件处理器
    logger.add(
        f"{log_dir}/app.log",
        rotation=log_config["rotation"],
        retention=log_config["retention"],
        format=log_config["file_format"],
        level=log_config["file_level"]
    )
    
    # 添加错误日志文件处理器
    logger.add(
        f"{log_dir}/error.log",
        rotation=log_config["rotation"],
        retention=log_config["retention"],
        format=log_config["file_format"],
        level="ERROR"
    )
    
    # 将标准库日志重定向到loguru
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(logging.getLevelName(log_config["level"]))

    # 为所有已存在的日志器设置处理程序
    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = [InterceptHandler()]
        logging.getLogger(name).propagate = False
        
    logger.info(f"日志系统已初始化，控制台级别: {log_config['level']}, 文件级别: {log_config['file_level']}")
    
    return logger