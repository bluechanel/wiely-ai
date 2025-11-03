from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
from openai import AsyncOpenAI
import asyncio

from pydantic import BaseModel, Field, constr

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


class TextPart(BaseModel):
    type: str = "text"
    text: str
    state: str | None


class ReasoningPart(BaseModel):
    type: str = "reasoning"
    text: str
    state: str


class ToolPart(BaseModel):
    type: constr(pattern=r"^tool-.+")
    toolCallId: str
    state: str
    input: dict | None
    output: dict | None


class DataPart(BaseModel):
    type: constr(pattern=r"^datal-.+")
    data: dict | None


class SourceUrlPart(BaseModel):
    type: str = "source-url"
    sourceId: str
    url: str


class SourceDocumentPart(BaseModel):
    type: str = "source-document"
    sourceId: str
    mediaType: str
    title: str


class FilePart(BaseModel):
    type: str = "file"
    mediaType: str
    url: str


class Message(BaseModel):
    id: str = Field(..., description="消息id")
    role: str = Field(..., description="消息角色 user assistant")
    parts: list[
        TextPart
        | ReasoningPart
        | ToolPart
        | DataPart
        | SourceUrlPart
        | SourceDocumentPart
        | FilePart
    ]


class RequestModel(BaseModel):
    id: str = Field(..., description="对话 conversation id")
    model: str = Field(..., description="模型名称")
    webSearch: bool = Field(..., description="是否启用搜索工具")
    messages: list[Message]
    trigger: str


@app.post("/api/chat")
async def chat(request: Request):
    # async def chat(request: RequestModel):
    """
    处理聊天请求，支持流式响应
    """
    print(await request.json())
    # print(request)
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
