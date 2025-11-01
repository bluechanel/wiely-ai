from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
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


# 配置你的 API keys

openai_client = AsyncOpenAI(
    api_key="your-openai-api-key", base_url="http://192.168.11.199:1282/v1"
)


@app.post("/api/chat")
async def chat(request: Request):
    """
    处理聊天请求，支持流式响应
    """
    return StreamingResponse(
        stream_chat_completion(request),
        media_type="text/event-stream",
        headers={"x-vercel-ai-ui-message-stream": "v1"},
    )


async def stream_chat_completion(request):
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

    # todo 不显示
    for r in tools:
        yield f"data: {json.dumps(r)}\n\n"
        await asyncio.sleep(0.1)

    yield f"data: {json.dumps({'type': 'source-url', 'sourceId': 'https://example.com', 'url': 'https://example.com'})}\n\n"
    await asyncio.sleep(0.1)
    # todo 不显示
    yield f"data: {json.dumps({'type': 'source-document', 'sourceId': 'https://example.com', 'mediaType': 'file', 'title': 'Title'})}\n\n"

    await asyncio.sleep(0.1)
    yield f"data: {json.dumps({'type': 'file', 'url': 'https://v2fy.com/asset/0i/ChineseBQB/107_FLittleBrother_%E8%91%AB%E8%8A%A6%E5%85%84%E5%BC%9F_BQB/0000000107.gif', 'mediaType': 'image/gif'})}\n\n"
    # todo 不显示
    await asyncio.sleep(0.1)
    yield f"data: {json.dumps({'type': 'data-weather', 'data': {'location': 'SF', 'temperature': 100}})}\n\n"

    # 发送正常
    yield f"data: {json.dumps({'type': 'text-start', 'id': 'msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d'})}\n\n"
    for s in "hello my name is wiley, i am ai developer.".split(" "):
        yield f"data: {json.dumps({'type': 'text-delta', 'id': 'msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d', 'delta': s})}\n\n"
        await asyncio.sleep(0.1)
    yield f"data: {json.dumps({'type': 'text-end', 'id': 'msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d'})}\n\n"

    # 使用error，就是最后一条，会被打断
    await asyncio.sleep(0.1)
    # yield f"data: {json.dumps({'type': 'error', 'errorText': 'error message'})}\n\n"
