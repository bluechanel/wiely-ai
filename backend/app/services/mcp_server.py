import asyncio
import os
import shutil
from contextlib import AsyncExitStack
from datetime import timedelta
from typing import Any, List

from loguru import logger
from mcp import Tool, ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.streamable_http import streamablehttp_client


class Server:
    """管理MCP服务器连接和工具执行。"""

    def __init__(self, name: str, config: dict[str, Any]) -> None:
        """初始化服务器实例。
        
        Args:
            name: 服务器名称
            config: 服务器配置字典
        """
        self.name: str = name
        self.config: dict[str, Any] = config
        self.stdio_context: Any | None = None
        self.session: ClientSession | None = None
        self._cleanup_lock: asyncio.Lock = asyncio.Lock()
        self.exit_stack: AsyncExitStack = AsyncExitStack()
        self._tools_cache: List[Tool] | None = None
        self._last_tools_fetch: float = 0

    async def initialize(self) -> None:
        """初始化所有 MCP Server"""
        try:
            # streamable-http 方式
            if "type" in self.config and self.config["type"] == "streamable-http":
                streamable_http_transport = await self.exit_stack.enter_async_context(
                    streamablehttp_client(
                        url=self.config["url"],
                        timeout=timedelta(seconds=60)
                    )
                )
                read_stream, write_stream, _ = streamable_http_transport
                session = await self.exit_stack.enter_async_context(
                    ClientSession(read_stream, write_stream)
                )
                await session.initialize()
                self.session = session
            # stdio 方式
            if "command" in self.config and self.config["command"]:
                command = (
                    shutil.which("npx")
                    if self.config["command"] == "npx"
                    else self.config["command"]
                )
                server_params = StdioServerParameters(
                    command=command,
                    args=self.config["args"],
                    env={**os.environ, **self.config["env"]}
                    if self.config.get("env")
                    else None,
                )
                stdio_transport = await self.exit_stack.enter_async_context(
                    stdio_client(server_params)
                )
                read, write = stdio_transport
                session = await self.exit_stack.enter_async_context(
                    ClientSession(read, write)
                )
                await session.initialize()
                self.session = session
            logger.info(f"🔗 连接MCP服务 {self.name}...")
        except Exception as e:
            logger.error(f"❌ 初始化错误 {self.name}: {e}")
            await self.cleanup()
            raise

    async def list_tools(self) -> list[Tool]:
        """从MCP Server列出所有工具
        
        Returns:
            工具列表
            
        Raises:
            RuntimeError: 如果服务器未初始化
        """
        import time
        current_time = time.time()
        
        # 使用缓存的工具列表，如果存在且未过期（10秒内）
        if self._tools_cache is not None and (current_time - self._last_tools_fetch) < 10:
            return self._tools_cache
            
        if not self.session:
            raise RuntimeError(f"服务器 {self.name} 未初始化")

        try:
            tools_response = await self.session.list_tools()
            self._tools_cache = tools_response.tools
            self._last_tools_fetch = current_time
            return self._tools_cache
        except Exception as e:
            logger.error(f"获取工具列表失败: {e}")
            raise

    async def execute_tool(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        retries: int = 2,
        delay: float = 1.0,
    ) -> Any:
        """执行工具并具有重试机制。

        Args:
            tool_name: 要执行的工具名称。
            arguments: 工具参数。
            retries: 重试次数。
            delay: 重试之间的延迟（秒）。

        Returns:
            工具执行结果。

        Raises:
            RuntimeError: 如果服务器未初始化。
            Exception: 如果工具执行在所有重试后失败。
        """
        if not self.session:
            raise RuntimeError(f"服务器 {self.name} 未初始化")

        attempt = 0
        while attempt < retries:
            try:
                logger.info(f"执行工具 {tool_name} 在服务器 {self.name}...")
                result = await self.session.call_tool(tool_name, arguments)
                logger.debug(f"工具 {tool_name} 执行成功")
                return result

            except Exception as e:
                attempt += 1
                logger.warning(f"执行工具 {tool_name} 出错: {e}。尝试 {attempt}/{retries}。")
                if attempt < retries:
                    logger.info(f"{delay} 秒后重试...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"工具 {tool_name} 达到最大重试次数。失败。")
                    raise

    async def cleanup(self) -> None:
        """清理服务器资源。"""
        async with self._cleanup_lock:
            try:
                await self.exit_stack.aclose()
                self.session = None
                self.stdio_context = None
                # 清除缓存
                self._tools_cache = None
                logger.info(f"已清理服务器 {self.name} 资源")
            except Exception as e:
                logger.error(f"清理服务器 {self.name} 时出错: {e}")