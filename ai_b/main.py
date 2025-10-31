from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from openai import AsyncOpenAI
import asyncio

app = FastAPI()

# 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    model: str = "gpt-4"
    temperature: float = 0.7
    stream: bool = True


# 配置你的 API keys

openai_client = AsyncOpenAI(
    api_key="your-openai-api-key", base_url="http://192.168.11.199:1282/v1"
)


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    处理聊天请求，支持流式响应
    """
    return StreamingResponse(
        stream_chat_completion(request), media_type="text/event-stream"
    )


async def stream_chat_completion(request: ChatRequest):
    """
    生成流式响应，符合 AI SDK 的格式
    """
    # 发送思考消息
    reasoning = [
        {"type": "reasoning-start", "id": "reasoning_123"},
        {
            "type": "reasoning-delta",
            "id": "reasoning_123",
            "delta": "This is some reasoning",
        },
        {
            "type": "reasoning-delta",
            "id": "reasoning_123",
            "delta": "This is some reasoning",
        },
        {
            "type": "reasoning-delta",
            "id": "reasoning_123",
            "delta": "This is some reasoning",
        },
        {
            "type": "reasoning-delta",
            "id": "reasoning_123",
            "delta": "This is some reasoning",
        },
        {
            "type": "reasoning-delta",
            "id": "reasoning_123",
            "delta": "This is some reasoning",
        },
        {
            "type": "reasoning-delta",
            "id": "reasoning_123",
            "delta": "This is some reasoning",
        },
        {
            "type": "reasoning-delta",
            "id": "reasoning_123",
            "delta": "This is some reasoning",
        },
        {"type": "reasoning-end", "id": "reasoning_123"},
    ]

    for r in reasoning:
        yield f"data: {json.dumps(r)}\n\n"
        await asyncio.sleep(0.1)

    # 发送工具调用
    tools = [
        {
            "type": "tool-input-start",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "toolName": "getWeatherInformation",
        },
        {
            "type": "tool-input-delta",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "inputTextDelta": "San Francisco",
        },
        {
            "type": "tool-input-delta",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "inputTextDelta": "San Francisco",
        },
        {
            "type": "tool-input-delta",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "inputTextDelta": "San Francisco",
        },
        {
            "type": "tool-input-delta",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "inputTextDelta": "San Francisco",
        },
        {
            "type": "tool-input-delta",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "inputTextDelta": "San Francisco",
        },
        {
            "type": "tool-input-delta",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "inputTextDelta": "San Francisco",
        },
        {
            "type": "tool-input-available",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "toolName": "getWeatherInformation",
            "input": {"city": "San Francisco"},
        },
        {
            "type": "tool-output-available",
            "toolCallId": "call_fJdQDqnXeGxTmr4E3YPSR7Ar",
            "output": {"city": "San Francisco", "weather": "sunny"},
        },
    ]

    for r in tools:
        yield f"data: {json.dumps(r)}\n\n"
        await asyncio.sleep(0.1)

    # 发送正常
    yield f'data: {json.dumps({"type":"text-start","id":"msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d"})}\n\n'
    for s in "hello my name is wiley, i am ai developer.".split(" "):
        yield f'data: {json.dumps({"type":"text-delta","id":"msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d","delta":s})}\n\n'
        await asyncio.sleep(0.1)
    yield f'data: {json.dumps({"type":"text-end","id":"msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d"})}\n\n'


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
