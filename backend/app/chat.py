import json
import uuid
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from app.store import add_message, get_messages
from loguru import logger


router = APIRouter(prefix="/chat")
async_client = AsyncOpenAI(base_url="http://192.168.11.199:1282/v1", api_key="1213213")
DATA_PREFIX = "data: "

async def event_generator(chat_id: str, query: str):
    # 保存用户输入
    await add_message(user_id=chat_id, message={"role": "user", "content": query})
    # 获取上下文
    open_m = await get_messages(user_id=chat_id)
    logger.debug("open_m: {}".format(open_m))
    message_id = str(uuid.uuid4())
    assistant_message = ""

    # 先发起开始事件
    yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-start'})}\n\n"
    # 流式调用
    response = await async_client.chat.completions.create(
        model="qwen3_32",
        messages=open_m,
        stream=True
    )
    async for chunk in response:
        if chunk.object == "chat.completion.chunk":
            text = chunk.choices[0].delta.content
            if text:
                assistant_message += text
                delta_chunk = {"id": message_id, "type": "text-delta", "delta": text}
                yield f"{DATA_PREFIX}{json.dumps(delta_chunk)}\n\n"
    # 结束事件
    yield f"{DATA_PREFIX}{json.dumps({'id': message_id, 'type': 'text-end'})}\n\n"
    # 保存 AI 回复
    await add_message(user_id=chat_id, message={"role": "assistant", "content": assistant_message})

@router.post("/")
async def chat(request: Request) -> StreamingResponse:
    data = await request.json()
    messages = data.get("messages", [])
    user_id = data.get("user_id", "default")
    session_id = data.get("id", "default")
    last_message = messages[-1] if messages else {}
    content = last_message["parts"][0]["text"]
    return StreamingResponse(event_generator(session_id, content), media_type="text/event-stream")