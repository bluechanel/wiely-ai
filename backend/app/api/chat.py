"""聊天API路由模块。"""
import json
import uuid
from typing import Dict, AsyncGenerator

from fastapi import APIRouter, Request, Query, Depends
from fastapi.responses import StreamingResponse
from loguru import logger

from app.core.agent import ChatAgent

# 定义SSE事件前缀
DATA_PREFIX = "data: "

class AgentManager:
    """管理ChatAgent实例的单例类。"""
    
    def __init__(self):
        """初始化AgentManager。"""
        self.agents: Dict[str, ChatAgent] = {}

    async def get_agent(self, user_id: str) -> ChatAgent:
        """获取或创建用户的ChatAgent实例。
        
        Args:
            user_id: 用户ID
            
        Returns:
            ChatAgent实例
        """
        if user_id not in self.agents:
            agent = ChatAgent(user_id)
            await agent.connect()
            self.agents[user_id] = agent
        return self.agents[user_id]


# 创建单例管理器
manager = AgentManager()


async def get_agent(user_id: str = Query(...)) -> ChatAgent:
    """根据user_id返回ChatAgent实例（依赖注入）。
    
    Args:
        user_id: 用户ID
        
    Returns:
        ChatAgent实例
    """
    return await manager.get_agent(user_id)


# 创建路由器
router = APIRouter(prefix="/chat")




async def event_generator(agent: ChatAgent, user_message: str) -> AsyncGenerator[str, None]:
    """生成SSE事件流。
    
    Args:
        agent: ChatAgent实例
        user_message: 用户消息
        
    Yields:
        SSE格式的事件数据
    """
    try:
        # 获取回复
        answer = await agent.ask(user_message)
        async for item in answer:
            yield item
    except Exception as e:
        # 生成消息ID
        message_id = str(uuid.uuid4())
        # 发送开始事件
        yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-start'})}\n\n"
        logger.error(f"生成回复时出错: {e}")
        error_message = {"id": message_id, "type": "text-delta", "delta": f"处理您的请求时出现错误: {str(e)}"}
        yield f"{DATA_PREFIX}{json.dumps(error_message)}\n\n"
        # 发送结束事件
        yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-end'})}\n\n"


@router.post("/")
async def chat(request: Request, agent: ChatAgent = Depends(get_agent)) -> StreamingResponse:
    """处理聊天请求。
    
    Args:
        request: FastAPI请求对象
        agent: ChatAgent实例（通过依赖注入）
        
    Returns:
        流式响应
    """
    try:
        # 解析请求数据
        data = await request.json()
        messages = data.get("messages", [])

        # 获取最后一条消息
        if not messages:
            return StreamingResponse(
                event_generator(agent, "请提供消息内容"),
                media_type="text/event-stream"
            )

        last_message = messages[-1]
        content = last_message.get("parts", [{}])[0].get("text", "")

        if not content:
            return StreamingResponse(
                event_generator(agent, "请提供消息内容"),
                media_type="text/event-stream"
            )

        # 返回流式响应
        return StreamingResponse(
            event_generator(agent, content),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"处理聊天请求时出错: {e}")
        # 返回错误响应
        async def error_generator():
            message_id = str(uuid.uuid4())
            yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-start'})}\n\n"
            yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-delta', 'delta': f'处理请求时出错: {str(e)}'})}\n\n"
            yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-end'})}\n\n"

        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream"
        )
