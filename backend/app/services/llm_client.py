import asyncio
from typing import Any, AsyncGenerator, Dict, List, TypedDict, Literal

from loguru import logger
from openai import AsyncOpenAI
from openai.types.chat import ParsedFunctionToolCall
from pydantic import BaseModel
from app.services.mcp_client import Client
from app.config.configuration import setting


class MessageChunk(BaseModel):
    type: Literal["reasoning", "message", "tool_call"]
    data: str | list[ParsedFunctionToolCall]


class ToolDefinition(TypedDict):
    """工具定义的类型。"""

    type: str
    function: Dict[str, Any]


class LLMClient:
    """管理与LLM提供商的通信。"""

    def __init__(self, servers: list[Client], timeout: int = 60, max_retries: int = 3):
        """初始化LLM客户端。

        Args:
            servers: MCP服务器列表
            timeout: API请求超时时间（秒）
            max_retries: 最大重试次数
        """
        self.mcp_servers = servers
        self.openai_tools = None
        self.timeout = timeout
        self.max_retries = max_retries
        self.openai_client = self._init_openai_client()

    def _init_openai_client(self) -> AsyncOpenAI:
        """初始化OpenAI客户端。

        Returns:
            OpenAI客户端实例
        """
        api_key = setting.OPENAI_API_KEY
        base_url = setting.OPENAI_BASE_URL
        return AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=self.timeout)

    @classmethod
    async def create(cls, servers: list[Client]):
        """工厂方法，构造时就缓存 tools

        Args:
            servers: MCP服务器列表

        Returns:
            LLMClient实例
        """
        self = cls(servers)
        self.openai_tools = await self.convert_mcp_to_openai_tools()
        logger.info(f"已加载OpenAI工具: {len(self.openai_tools)}个")
        return self

    async def convert_mcp_to_openai_tools(self) -> List[ToolDefinition]:
        """将MCP Server返回的工具列表转换为OpenAI函数调用格式

        Returns:
            OpenAI工具列表
        """
        all_tools = []
        for server in self.mcp_servers:
            try:
                tools = await server.list_tools()
                all_tools.extend(tools)
            except Exception as e:
                logger.error(f"从服务器获取工具列表失败: {e}")

        openai_tools: List[ToolDefinition] = []

        for tool in all_tools:
            try:
                tool_schema: ToolDefinition = {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": {},
                        "strict": True,
                    },
                }

                input_schema = tool.inputSchema

                parameters = {
                    "type": input_schema["type"],
                    "properties": input_schema["properties"],
                    "required": input_schema.get("required", ""),
                    "additionalProperties": False,
                }
                for prop in parameters["properties"].values():
                    # 特殊处理枚举值
                    if "enum" in prop:
                        prop["description"] = f"可选值: {', '.join(prop['enum'])}"

                tool_schema["function"]["parameters"] = parameters
                openai_tools.append(tool_schema)
            except Exception as e:
                logger.warning(f"转换工具定义失败: {e}")

        return openai_tools

    async def get_response(
        self, messages: list[dict[str, str]], model: str = None
    ) -> AsyncGenerator[MessageChunk, None]:
        """从LLM获取响应。

        Args:
            messages: 消息字典列表。
            model: 模型名称，默认为None，将使用环境变量中的设置。

        Returns:
            LLM的响应，如果出错则返回None。
        """
        retry_count = 0
        last_error = None
        model = model or setting.LLM_MODEL
        logger.debug(messages)

        while retry_count < self.max_retries:
            try:
                # 记录请求信息
                logger.debug(
                    f"发送请求到LLM，模型: {model}, 工具数量: {len(self.openai_tools) if self.openai_tools else 0}"
                )
                async with self.openai_client.chat.completions.stream(
                    model=model,
                    messages=messages,
                    tools=self.openai_tools,
                    tool_choice="auto",
                ) as stream:
                    async for event in stream:
                        if event.type != "chunk":
                            continue
                        chunk_choices = event.chunk.choices or []
                        snapshot_choices = event.snapshot.choices or []
                        for index, choice in enumerate(chunk_choices):
                            if choice.finish_reason == "tool_calls":
                                yield MessageChunk(
                                    type="tool_call",
                                    data=snapshot_choices[index].message.tool_calls,
                                )
                            elif getattr(choice.delta, "reasoning_content", None):
                                yield MessageChunk(
                                    type="reasoning",
                                    data=choice.delta.reasoning_content,
                                )
                            elif getattr(choice.delta, "content", None):
                                yield MessageChunk(
                                    type="message", data=choice.delta.content
                                )
                            else:
                                pass
                return

            except (ConnectionError, OSError, asyncio.TimeoutError) as e:
                last_error = e
                retry_count += 1
                wait_time = 2**retry_count  # 指数退避策略

                logger.warning(
                    f"获取LLM响应失败 (尝试 {retry_count}/{self.max_retries}): {e}"
                )

                if retry_count < self.max_retries:
                    logger.info(f"等待 {wait_time} 秒后重试...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"获取LLM响应失败，已达到最大重试次数: {last_error}")
                    raise last_error
            except Exception as e:
                logger.exception(f"解析 LLM 响应时出错: {e}")
                break
