"""ChatAgent模块负责管理用户对话和与MCP服务的交互。"""

import asyncio
import copy
import json
import os
import uuid
from typing import Any, AsyncGenerator, Dict, List

from loguru import logger
from mem0 import AsyncMemoryClient
from openai.types.chat import ParsedFunctionToolCall, ParsedFunction
from app.config.configuration import MCPConfiguration
from app.services.llm_client import LLMClient
from app.services.mcp_client import Client
from app.core.exception import ToolExecutionException

# 定义SSE事件前缀
DATA_PREFIX = "data: "


class ChatAgent:
    """管理用户对话和MCP服务交互的代理类。

    每个用户对应一个ChatAgent实例，负责管理该用户的对话历史
    和与MCP服务的交互。
    """

    def __init__(
        self,
        user_id: str,
        chat_id: str,
        system_prompt: str,
        max_history: int = 20,
    ):
        """初始化ChatAgent。

        Args:
            chat_id: 对话ID，通常是用户ID
            max_history: 最大保留的对话历史条数，默认为20
        """
        self.user_id = user_id  # 用户id
        self.chat_id = chat_id  # 当前对话id
        self.system_prompt: str = system_prompt
        self.full_messages: List[Dict[str, str]] = []  # 完整对话历史，可用于回溯
        self.user_messages: List[Dict[str, str]] = []  # 用户对话历史
        self.servers: List[Client] = []
        self.max_history = max_history
        self.llm_client: LLMClient | None = None
        self.mem0_client: AsyncMemoryClient | None = None
        self.config_path = os.getenv("MCP_CONFIG_PATH", "servers_config.json")

    async def init_mcp_client(self) -> None:
        """初始化MCP客户端。

        Raises:
            FileNotFoundError: 如果配置文件不存在
            RuntimeError: 如果初始化服务器失败
        """
        try:
            # 读取mcp配置
            config = MCPConfiguration()
            server_config = config.load_config_file(self.config_path)
            self.servers = [
                Client(name, srv_config)
                for name, srv_config in server_config["mcpServers"].items()
            ]

            if not self.servers:
                logger.warning(f"未找到MCP服务器配置，请检查{self.config_path}文件")
                raise RuntimeError(f"未找到MCP服务器配置，请检查{self.config_path}文件")

            # 初始化服务器
            initialized_servers = []
            for server in self.servers:
                try:
                    await server.initialize()
                    initialized_servers.append(server)
                except Exception as e:
                    logger.error(f"初始化服务器 {server.name} 失败: {e}")
                    # 清理已初始化的服务器
                    for s in initialized_servers:
                        await s.cleanup()
                    raise RuntimeError(f"初始化服务器 {server.name} 失败: {str(e)}")
            logger.info(f"用户 {self.chat_id} 的ChatAgent初始化成功")
        except Exception as e:
            logger.error(f"初始化MCP客户端失败: {e}")
            raise

    async def init_llm_client(self) -> None:
        # 创建LLM客户端话
        self.llm_client = await LLMClient.create(self.servers)

    async def init_mem0_client(self) -> None:
        self.mem0_client = AsyncMemoryClient(
            api_key=os.getenv("MEM0_API_KEY", "123456")
        )

    async def cleanup_servers(self) -> None:
        """正确清理所有服务器。"""
        for server in reversed(self.servers):
            try:
                await server.cleanup()
                logger.debug(f"服务器 {server.name} 已清理")
            except Exception as e:
                logger.warning(f"清理服务器 {server.name} 时出现警告: {e}")

    async def run_tool(self, tool_call: ParsedFunctionToolCall) -> dict[str, str | Any]:
        """执行工具调用。

        Args:
            tool_call: 工具列表

        Returns:
            处理后的响应字典
        """
        tool_call_id: str = tool_call.id
        tool_call_function: ParsedFunction = tool_call.function
        tool_call_name = tool_call_function.name
        tool_call_args = tool_call_function.arguments

        logger.info(f"执行工具: {tool_call_name}, 参数: {tool_call_args}")

        # 查找可以处理该工具的服务器
        target_server = None
        for server in self.servers:
            try:
                tools = await server.list_tools()
                if any(tool.name == tool_call_name for tool in tools):
                    target_server = server
                    break
            except Exception as e:
                logger.error(f"获取服务器 {server.name} 工具列表失败: {e}")

        # 如果找到了可以处理该工具的服务器，执行工具调用
        if target_server:
            try:
                # 解析工具参数
                try:
                    args = json.loads(tool_call_args)
                except json.JSONDecodeError as e:
                    logger.error(f"解析工具参数失败: {e}")
                    raise ToolExecutionException(
                        f"The tool argument cannot be parsed by json.loads()."
                    )

                # 执行工具调用
                response = await target_server.execute_tool(tool_call_name, args)

                # 此处工具执行进度的展示 ，需要在服务端 使用 如下代码
                if isinstance(response, dict) and "progress" in response:
                    progress: int = response["progress"]
                    total: int = response["total"]
                    percentage: float = (progress / total) * 100
                    logger.info(
                        f"Tool Run Progress: {progress}/{total} ({percentage:.1f}%)"
                    )

                logger.info(f"工具执行结果: {response}")
                result = ""
                for content in response.content:
                    if content.type == "text":
                        result += content.text
                    else:
                        logger.error(
                            f"工具{tool_call_name},返回的结果type为{content.type}, 原始结果为{response}"
                        )
                return {
                    "tool_call_id": tool_call_id,
                    "tool_call_name": tool_call_name,
                    "tool_call_args": tool_call_args,
                    "tool_call_result": result,
                }
            except ToolExecutionException as e:
                error_msg = f"执行工具 {tool_call_name} 时出错: {str(e)}"
                logger.error(error_msg)
                raise ToolExecutionException(
                    f"Execution tool finds an error : {str(e)}"
                )
        else:
            error_msg = f"找不到可以处理工具 {tool_call_name} 的服务器"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def run_all_tools(
        self, tool_calls: list[ParsedFunctionToolCall]
    ) -> AsyncGenerator[dict[str, str | Any], None]:
        """ """
        for coro in asyncio.gather(
            *(self.run_tool(tc) for tc in tool_calls), return_exceptions=True
        ):
            result = await coro
            yield result

    async def ask(self, user_message: str) -> AsyncGenerator[str, Any]:
        """处理用户输入并返回响应。

        Args:
            user_message: 用户消息

        Returns:
            助手响应

        Raises:
            RuntimeError: 如果MCP客户端未初始化或处理过程中出错
        """
        # 本次任务对话历史, 从用户对话中提取，先检查长度
        if (
            len(self.user_messages) > self.max_history * 2
        ):  # 因为每次对话有用户和助手两条消息
            self.user_messages = self.user_messages[-self.max_history * 2 :]
        messages = copy.deepcopy(self.user_messages)
        messages_len = len(messages)
        # 查询用户记忆
        search_memory = await self.mem0_client.search(
            user_message,
            version="v2",
            filters={"AND": [{"user_id": self.user_id}]},
        )
        memory = "之前对话中的相关信息：\n"
        for m in search_memory:
            memory += f"- {m.get('memory', '')} \n"
        # 添加到完整对话历史
        messages.append(
            # {"role": "user", "content": "/no_think \n" + memory + user_message}
            {"role": "user", "content": memory + user_message}
        )
        # 添加系统提示
        if self.system_prompt:
            messages.insert(0, {"role": "system", "content": self.system_prompt})

        async def run(
            tool_call_count: int = 0, max_tools: int = 5
        ) -> AsyncGenerator[str | dict[str, str | dict[str, str]] | Any, Any]:
            """获取LLM响应并处理工具调用。

            Args:
                tool_call_count: 当前工具调用计数
                max_tools: 最大工具调用次数

            Returns:
                更新后的消息历史
            """
            # 检查工具调用次数是否超过限制
            if tool_call_count >= max_tools:
                yield f"已达到最大工具调用次数限制({max_tools}次)"
                return

            message_status: dict[str, str | None] = {
                "reasoning": None,  # 当前 reasoning message_id
                "text": None,  # 当前 text message_id
            }
            async for message_chunk in self.llm_client.get_response(messages):
                match message_chunk.type:
                    case "reasoning":
                        if message_status["reasoning"] is None:
                            message_status["reasoning"] = f"reasoning-{uuid.uuid4()}"
                            yield f"{DATA_PREFIX}{json.dumps({'id': message_status['reasoning'], 'type': 'reasoning-start'}, ensure_ascii=False)}\n\n"

                        # reasoning delta
                        yield f"{DATA_PREFIX}{json.dumps({'id': message_status['reasoning'], 'type': 'reasoning-delta', 'delta': message_chunk.data}, ensure_ascii=False)}\n\n"

                    case "message":
                        # 如果reasoning 关闭
                        if message_status["reasoning"]:
                            yield f"{DATA_PREFIX}{json.dumps({'id': message_status['reasoning'], 'type': 'reasoning-end'})}\n\n"
                            message_status["reasoning"] = None
                        if message_status["text"] is None:
                            message_status["text"] = f"text-{uuid.uuid4()}"
                            yield f"{DATA_PREFIX}{json.dumps({'id': message_status['text'], 'type': 'text-start'}, ensure_ascii=False)}\n\n"

                        # text delta
                        yield f"{DATA_PREFIX}{json.dumps({'id': message_status['text'], 'type': 'text-delta', 'delta': message_chunk.data}, ensure_ascii=False)}\n\n"

                    case "tool_call":
                        # 关闭
                        if message_status["reasoning"]:
                            yield f"{DATA_PREFIX}{json.dumps({'id': message_status['reasoning'], 'type': 'reasoning-end'})}\n\n"
                            message_status["reasoning"] = None

                        if message_status["text"]:
                            yield f"{DATA_PREFIX}{json.dumps({'id': message_status['text'], 'type': 'text-end'})}\n\n"
                            message_status["text"] = None

                        # 模型正在生成工具调用输入
                        for tool_call in message_chunk.data:
                            tool_id = tool_call.id
                            tool_name = tool_call.function.name

                            # 开始事件
                            chunk = {
                                "type": "tool-input-start",
                                "toolCallId": tool_id,
                                "toolName": tool_name,
                            }

                            yield f"{DATA_PREFIX}{json.dumps(chunk, ensure_ascii=False)}\n\n"

                            # 如果有增量输入 (比如模型逐字输出参数)
                            # if hasattr(tool_call.function, "arguments_stream"):
                            #     async for delta in tool_call.function.arguments_stream:
                            #         yield self._wrap_data({
                            #             "type": "tool-input-delta",
                            #             "toolCallId": tool_id,
                            #             "inputTextDelta": delta,
                            #         })

                            # 工具输入可用（参数生成完毕）
                            chunk = {
                                "type": "tool-input-available",
                                "toolCallId": tool_id,
                                "toolName": tool_name,
                                "input": tool_call.function.arguments,
                            }

                            yield f"{DATA_PREFIX}{json.dumps(chunk, ensure_ascii=False)}\n\n"

                            # 执行工具逻辑
                            async for result in self.run_all_tools([tool_call]):
                                chunk = {
                                    "type": "tool-output-available",
                                    "toolCallId": result["tool_call_id"],
                                    "output": result["tool_call_result"],
                                }
                                messages.append(
                                    {
                                        "role": "tool",
                                        "tool_call_id": result["tool_call_id"],
                                        "content": result["tool_call_result"],
                                    }
                                )
                                yield f"{DATA_PREFIX}{json.dumps(chunk, ensure_ascii=False)}\n\n"

                        # 工具调用完成，递归继续主流程
                        tool_call_count += 1
                        if tool_call_count < max_tools:
                            await asyncio.sleep(0.05)
                            async for msg in run(tool_call_count):
                                yield msg
            # 补 所有的结束
            if message_status["reasoning"]:
                yield f"{DATA_PREFIX}{json.dumps({'id': message_status['reasoning'], 'type': 'reasoning-end'})}\n\n"

            if message_status["text"]:
                yield f"{DATA_PREFIX}{json.dumps({'id': message_status['text'], 'type': 'text-end'})}\n\n"

        return run()

    async def connect(self) -> None:
        """连接到MCP服务。"""
        await self.init_mcp_client()
        await self.init_llm_client()
        await self.init_mem0_client()

    async def close(self) -> None:
        """关闭连接并清理资源。"""
        try:
            await self.cleanup_servers()
            logger.info(f"用户 {self.chat_id} 的ChatAgent资源已清理")
        except Exception as e:
            logger.error(f"清理ChatAgent资源时出错: {e}")

    async def reconnect(self) -> bool:
        """重新连接MCP服务。

        Returns:
            连接是否成功
        """
        try:
            # 先清理现有资源
            await self.close()
            # 重新初始化
            await self.init_mcp_client()
            return True
        except Exception as e:
            logger.error(f"重新连接MCP服务失败: {e}")
            return False
