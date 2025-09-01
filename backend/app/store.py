# 在此文件模拟数据库
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionSystemMessageParam

user_messgaes = {}

async def add_message(user_id: str, message: ChatCompletionMessageParam):
    """添加消息 单条"""
    user_messgaes.setdefault(user_id, [{"role":"system", "content":"你是一个智能助手"}]).append(message)

async def get_messages(user_id: str) -> list[ChatCompletionMessageParam]:
    """获取所有历史消息"""
    return user_messgaes.get(user_id, [])
