import logging
from loguru import logger

class InterceptHandler(logging.Handler):
    def emit(self, record):
        # 获取对应的 Loguru 日志级别
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # 找到日志调用的堆栈位置
        frame, depth = logging.currentframe(), 2
        while frame.f_back and depth > 0:
            frame = frame.f_back
            depth -= 1

        logger.opt(depth=6, exception=record.exc_info).log(level, record.getMessage())


def setup_logging():
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(logging.DEBUG)

    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = [InterceptHandler()]
