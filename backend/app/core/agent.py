"""ChatAgent模块负责管理用户对话和与MCP服务的交互。"""
import asyncio
import json
import os
import uuid
from typing import List, Dict, Any, AsyncGenerator

from loguru import logger
from openai.types.chat import ParsedFunctionToolCall, ParsedChatCompletion

from app.config.configuration import Configuration
from app.services.mcp_server import Server
from app.services.llm_client import LLMClient

# 定义SSE事件前缀
DATA_PREFIX = "data: "

class ChatAgent:
    """管理用户对话和MCP服务交互的代理类。
    
    每个用户对应一个ChatAgent实例，负责管理该用户的对话历史
    和与MCP服务的交互。
    """

    def __init__(self, chat_id: str, max_history: int = 20):
        """初始化ChatAgent。
        
        Args:
            chat_id: 对话ID，通常是用户ID
            max_history: 最大保留的对话历史条数，默认为20
        """
        self.chat_id = chat_id  # 对话id
        self.messages: List[Dict[str, str]] = []  # 对话历史
        self.servers: List[Server] = []
        self.max_history = max_history
        self.llm_client = None
        self.config_path = os.getenv("MCP_CONFIG_PATH", "servers_config.json")

    async def init_mcp_client(self) -> None:
        """初始化MCP客户端。
        
        Raises:
            FileNotFoundError: 如果配置文件不存在
            RuntimeError: 如果初始化服务器失败
        """
        try:
            # 读取mcp配置
            config = Configuration()
            server_config = config.load_config_file(self.config_path)
            self.servers = [Server(name, srv_config) for name, srv_config in server_config["mcpServers"].items()]
            
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
        tool_id = tool_call.id
        tool_call = tool_call.function
        tool_name = tool_call.name
        tool_args = tool_call.arguments


        logger.info(f"执行工具: {tool_name}, 参数: {tool_args}")

        # 查找可以处理该工具的服务器
        target_server = None
        for server in self.servers:
            try:
                tools = await server.list_tools()
                if any(tool.name == tool_name for tool in tools):
                    target_server = server
                    break
            except Exception as e:
                logger.error(f"获取服务器 {server.name} 工具列表失败: {e}")

        # 如果找到了可以处理该工具的服务器，执行工具调用
        if target_server:
            try:
                # 解析工具参数
                try:
                    args = json.loads(tool_args)
                except json.JSONDecodeError as e:
                    logger.error(f"解析工具参数失败: {e}")
                    raise Exception("工具参数无法被解析")

                # 执行工具调用
                response = await target_server.execute_tool(tool_name, args)
                logger.info(f"工具执行结果: {response}")
                result = ""
                for content in response.content:
                    if content.type == "text":
                        result += content.text
                    else:
                        logger.error(f"工具{tool_name},返回的结果type为{content.type}, 原始结果为{response}")
                return {
                    "tool_id": tool_id,
                    "tool_name": tool_name,
                    "tool_args": tool_args,
                    "tool_result": result
                }
            except Exception as e:
                error_msg = f"执行工具 {tool_name} 时出错: {str(e)}"
                logger.error(error_msg)
                raise Exception(f"执行工具时出错: {str(e)}")
        else:
            error_msg = f"找不到可以处理工具 {tool_name} 的服务器"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def run_all_tools(self, tool_calls: List[ParsedFunctionToolCall]) -> AsyncGenerator[
        dict[str, str | Any], None]:
        """

        """
        tasks = [self.run_tool(tc) for tc in tool_calls]
        for coro in asyncio.as_completed(tasks):
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
        # 添加用户消息到历史
        self.messages.append({"role": "user", "content": user_message})
        
        # 限制历史消息数量
        if len(self.messages) > self.max_history * 2:  # 因为每次对话有用户和助手两条消息
            self.messages = self.messages[-self.max_history*2:]

        async def run(tool_call_count: int = 0, max_tools: int = 5) -> AsyncGenerator[
            str | dict[str, str | dict[str, str]] | Any, Any]:
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

            # 增加工具调用计数
            tool_call_count += 1

            try:
                message_id = None
                async for event in self.llm_client.get_response(self.messages):
                    if isinstance(event, str):
                        if message_id is None:
                            message_id = str(uuid.uuid4())
                            yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-start'})}\n\n"
                        delta_chunk = {"id": message_id, "type": "text-delta", "delta": event}
                        yield f"{DATA_PREFIX}{json.dumps(delta_chunk)}\n\n"
                    if isinstance(event, ParsedChatCompletion):
                        if message_id:
                            yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-end'})}\n\n"
                            message_id = None

                        choice = event.choices[0]
                        if choice.finish_reason == "tool_calls":
                            # 返回工具调用信息
                            for tool_call in choice.message.tool_calls:
                                # 开始调用工具
                                chunk = {
                                    "id": tool_call.id,
                                    "type": f"data-event",  # Add data- prefix
                                    "data": {
                                        "title": "调用工具执行",
                                        "status": "pending"
                                    }
                                }
                                yield f"{DATA_PREFIX}{json.dumps(chunk)}\n\n"
                            # 并行调用工具
                            async for result in self.run_all_tools(tool_calls=choice.message.tool_calls):
                                # 发送工具调用结果
                                chunk = {
                                    "id": result["tool_id"],
                                    "type": f"data-event",  # Add data- prefix
                                    "data": {
                                        "title": "工具调用完成",
                                        "status": "success",
                                        "data": {"result": result["tool_result"]}
                                    }
                                }
                                yield f"{DATA_PREFIX}{json.dumps(chunk)}\n\n"
                                self.messages.append({"role":"tool", "content": result["tool_result"]})
                            logger.debug(self.messages)
                            # 如果是工具响应，继续递归调用
                            await asyncio.sleep(0.1) # 添加短暂延迟，避免过快的递归调用
                            async for message in run(tool_call_count, max_tools):
                                yield message
                        else:
                            # 此处将最终的答案填充到消息列表中
                            self.messages.append({"role": "assistant", "content": choice.message.content})
                return
            except Exception as e:
                logger.error(f"运行聊天会话时出错: {e}")
                yield f"处理您的请求时出现错误: {str(e)}"
        return run()

    async def connect(self) -> None:
        """连接到MCP服务。"""
        await self.init_mcp_client()
        await self.init_llm_client()

    async def close(self) -> None:
        """关闭连接并清理资源。"""
        try:
            await self.cleanup_servers()
            logger.info(f"用户 {self.chat_id} 的ChatAgent资源已清理")
        except Exception as e:
            logger.error(f"清理ChatAgent资源时出错: {e}")
                
    def get_history(self) -> List[Dict[str, str]]:
        """获取对话历史。
        
        Returns:
            对话历史列表
        """
        return self.messages
        
    def clear_history(self) -> None:
        """清除对话历史。"""
        self.messages = []
        logger.info(f"用户 {self.chat_id} 的对话历史已清除")
        
    def add_system_message(self, content: str) -> None:
        """添加系统消息到对话历史。
        
        Args:
            content: 系统消息内容
        """
        # 如果第一条消息已经是系统消息，则替换它
        if self.messages and self.messages[0].get("role") == "system":
            self.messages[0] = {"role": "system", "content": content}
        else:
            # 否则在开头插入系统消息
            self.messages.insert(0, {"role": "system", "content": content})
            
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