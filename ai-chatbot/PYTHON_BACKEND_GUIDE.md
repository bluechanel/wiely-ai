# Python Backend Integration Guide

本项目已修改为使用自己的 Python 后端来调用大模型，不再依赖 AI Gateway。

## 架构概览

```
前端 (Next.js) → Python 后端 (FastAPI) → 大模型 API (OpenAI/Claude/etc)
```

## 1. Python 后端设置

### 安装依赖

```bash
cd backend  # 假设你的后端在 backend 目录
pip install -r requirements.txt
```

### requirements.txt

```
fastapi
uvicorn
openai
anthropic  # 如果使用 Claude
pydantic
python-dotenv
```

### 后端代码结构

你的 Python 后端应该提供以下 API endpoint：

#### POST /api/chat

**请求格式:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ],
  "model": "gpt-4",
  "temperature": 0.7,
  "stream": true
}
```

**响应格式 (流式):**

后端应该返回 SSE (Server-Sent Events) 格式的流式响应：

```
0:{"type":"text-delta","textDelta":"你"}
0:{"type":"text-delta","textDelta":"好"}
0:{"type":"text-delta","textDelta":"！"}
d:{"type":"finish","finishReason":"stop"}
```

格式说明：
- 每行以数字开头（0, d, 9 等）表示不同的消息类型
- `0:` 表示文本增量
- `d:` 表示完成信号
- `9:` 表示工具调用（如果支持）

## 2. 前端配置

### 环境变量

在 `.env.local` 或 `.env` 文件中设置：

```bash
# 开发环境
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# 生产环境（部署后）
NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com
```

### 模型映射

前端会将模型 ID 映射到后端支持的模型：

```typescript
const modelMapping = {
  "chat-model": "gpt-4",
  "chat-model-reasoning": "gpt-4-turbo-preview",
  "title-model": "gpt-3.5-turbo",
  "artifact-model": "gpt-4",
};
```

你可以在 `app/(chat)/api/chat/route.ts` 中修改这个映射。

## 3. 启动项目

### 启动后端

```bash
cd backend
python main.py
# 或使用 uvicorn
uvicorn main:app --reload --port 8000
```

### 启动前端

```bash
# 在项目根目录
pnpm dev
```

访问 http://localhost:3000

## 4. Python 后端示例代码

### 基础实现 (OpenAI)

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import openai
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = "your-api-key"

@app.post("/api/chat")
async def chat(request: dict):
    if request.get("stream"):
        return StreamingResponse(
            stream_openai(request),
            media_type="text/event-stream"
        )

async def stream_openai(request):
    response = await openai.ChatCompletion.acreate(
        model=request["model"],
        messages=request["messages"],
        temperature=request.get("temperature", 0.7),
        stream=True
    )

    async for chunk in response:
        if chunk.choices[0].delta.content:
            data = {
                "type": "text-delta",
                "textDelta": chunk.choices[0].delta.content
            }
            yield f"0:{json.dumps(data)}\n"

    yield f"d:{json.dumps({'type': 'finish', 'finishReason': 'stop'})}\n"
```

### Claude 实现

```python
import anthropic

@app.post("/api/chat/claude")
async def chat_claude(request: dict):
    client = anthropic.AsyncAnthropic(api_key="your-api-key")

    if request.get("stream"):
        return StreamingResponse(
            stream_claude(client, request),
            media_type="text/event-stream"
        )

async def stream_claude(client, request):
    async with client.messages.stream(
        model="claude-3-5-sonnet-20241022",
        messages=request["messages"],
        max_tokens=4096,
    ) as stream:
        async for text in stream.text_stream:
            data = {
                "type": "text-delta",
                "textDelta": text
            }
            yield f"0:{json.dumps(data)}\n"

    yield f"d:{json.dumps({'type': 'finish'})}\n"
```

### 使用本地模型 (Ollama)

```python
import ollama

@app.post("/api/chat/local")
async def chat_local(request: dict):
    async def generate():
        stream = ollama.chat(
            model='llama2',
            messages=request["messages"],
            stream=True
        )

        for chunk in stream:
            if chunk['message']['content']:
                data = {
                    "type": "text-delta",
                    "textDelta": chunk['message']['content']
                }
                yield f"0:{json.dumps(data)}\n"

        yield f"d:{json.dumps({'type': 'finish'})}\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

## 5. 消息格式说明

### 前端发送的消息格式

前端会将 UI 消息转换为标准格式发送给后端：

```typescript
{
  messages: [
    {
      role: "user",
      content: "用户的消息内容"
    },
    {
      role: "assistant",
      content: "AI 的回复内容"
    }
  ],
  model: "gpt-4",
  temperature: 0.7,
  stream: true
}
```

### 后端响应格式

流式响应每行格式：
- `0:{"type":"text-delta","textDelta":"文本内容"}` - 文本增量
- `d:{"type":"finish","finishReason":"stop"}` - 完成信号

## 6. 支持工具调用

工具调用在 Python 后端完成，前端只负责显示工具调用的 UI。

### 工具调用流程

```
用户消息 → 后端 → LLM (决定调用工具) → 后端执行工具 → 返回结果 → LLM 生成最终回复 → 前端显示
```

### 后端响应格式

后端需要在流式响应中包含以下类型的消息：

#### 1. 工具调用 (Tool Call)
当 LLM 决定调用工具时，发送：
```
9:{"type":"tool-call","toolCallId":"call_abc123","toolName":"get_weather","args":{"location":"Beijing"}}
```

#### 2. 工具结果 (Tool Result)
工具执行完成后，发送结果：
```
a:{"type":"tool-result","toolCallId":"call_abc123","toolName":"get_weather","result":"Beijing weather: 25°C, Sunny"}
```

#### 3. 文本响应 (Text Delta)
正常的文本内容：
```
0:{"type":"text-delta","textDelta":"北京今天天气晴朗"}
```

#### 4. 完成信号 (Finish)
响应结束：
```
d:{"type":"finish","finishReason":"stop"}
```

### Python 后端实现示例

```python
import json
from typing import Dict, Any, List
import openai

# 定义工具
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "城市名称，如：北京、上海"
                    }
                },
                "required": ["location"]
            }
        }
    }
]

# 工具执行函数
def execute_tool(tool_name: str, args: Dict[str, Any]) -> str:
    """执行工具调用"""
    if tool_name == "get_weather":
        location = args.get("location", "")
        # 这里调用实际的天气 API
        return f"{location}天气：晴，25°C"
    return "未知工具"

async def stream_with_tools(request: dict):
    """支持工具调用的流式响应"""
    messages = request["messages"]
    model = request["model"]

    # 第一次调用 LLM，可能返回工具调用
    response = await openai.ChatCompletion.acreate(
        model=model,
        messages=messages,
        tools=TOOLS,
        stream=True
    )

    tool_calls = []
    current_tool_call = None

    # 处理流式响应
    async for chunk in response:
        delta = chunk.choices[0].delta

        # 处理工具调用
        if hasattr(delta, 'tool_calls') and delta.tool_calls:
            for tool_call_delta in delta.tool_calls:
                if tool_call_delta.index == 0:
                    if current_tool_call is None:
                        current_tool_call = {
                            "id": tool_call_delta.id,
                            "name": "",
                            "arguments": ""
                        }

                    if tool_call_delta.function.name:
                        current_tool_call["name"] += tool_call_delta.function.name

                    if tool_call_delta.function.arguments:
                        current_tool_call["arguments"] += tool_call_delta.function.arguments

        # 处理文本内容
        elif hasattr(delta, 'content') and delta.content:
            data = {
                "type": "text-delta",
                "textDelta": delta.content
            }
            yield f"0:{json.dumps(data)}\n"

    # 如果有工具调用，执行并发送结果
    if current_tool_call and current_tool_call["name"]:
        tool_call_id = current_tool_call["id"]
        tool_name = current_tool_call["name"]
        tool_args = json.loads(current_tool_call["arguments"])

        # 发送工具调用信息到前端
        yield f"9:{json.dumps({
            'type': 'tool-call',
            'toolCallId': tool_call_id,
            'toolName': tool_name,
            'args': tool_args
        })}\n"

        # 执行工具
        tool_result = execute_tool(tool_name, tool_args)

        # 发送工具结果到前端
        yield f"a:{json.dumps({
            'type': 'tool-result',
            'toolCallId': tool_call_id,
            'toolName': tool_name,
            'result': tool_result
        })}\n"

        # 将工具结果添加到消息历史
        messages.append({
            "role": "assistant",
            "tool_calls": [{
                "id": tool_call_id,
                "type": "function",
                "function": {
                    "name": tool_name,
                    "arguments": json.dumps(tool_args)
                }
            }]
        })

        messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": tool_result
        })

        # 再次调用 LLM 生成最终回复
        final_response = await openai.ChatCompletion.acreate(
            model=model,
            messages=messages,
            stream=True
        )

        async for chunk in final_response:
            if chunk.choices[0].delta.content:
                data = {
                    "type": "text-delta",
                    "textDelta": chunk.choices[0].delta.content
                }
                yield f"0:{json.dumps(data)}\n"

    # 发送完成信号
    yield f"d:{json.dumps({'type': 'finish', 'finishReason': 'stop'})}\n"

@app.post("/api/chat")
async def chat(request: dict):
    return StreamingResponse(
        stream_with_tools(request),
        media_type="text/event-stream"
    )
```

### 前端显示

前端会自动识别并显示：
- 🔧 工具调用卡片（显示工具名称和参数）
- 📋 工具结果（显示执行结果）
- 💬 最终的文本回复

前端代码已经配置为直接转发后端的所有数据，无需额外修改。

## 7. 错误处理

后端应该正确处理错误并返回：

```python
try:
    # API 调用
    ...
except Exception as e:
    error_data = {
        "type": "error",
        "error": str(e)
    }
    yield f"3:{json.dumps(error_data)}\n"
```

## 8. 调试技巧

### 查看请求日志

在 `app/(chat)/api/chat/route.ts` 中已经添加了日志：

```typescript
console.log('Calling Python backend:', BACKEND_URL);
console.log('Model:', backendModel);
console.log('Messages count:', pythonMessages.length);
```

### 查看后端日志

在 Python 后端添加日志：

```python
import logging
logging.basicConfig(level=logging.INFO)

@app.post("/api/chat")
async def chat(request: dict):
    logging.info(f"Received request: model={request['model']}, messages={len(request['messages'])}")
    ...
```

### 测试后端 API

使用 curl 测试：

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "gpt-4",
    "temperature": 0.7,
    "stream": false
  }'
```

## 9. 部署建议

### 后端部署

- 使用 Docker 容器化
- 部署到 AWS/GCP/Azure
- 使用 Nginx 作为反向代理
- 配置 HTTPS

### 前端部署

更新环境变量指向生产后端：

```bash
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

### CORS 配置

生产环境更新 CORS 允许的源：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",  # 生产前端域名
        "http://localhost:3000",    # 开发环境
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 10. 常见问题

### Q: 为什么要使用自己的后端？

A:
- 完全控制模型选择和参数
- 避免 AI Gateway 费用
- 可以使用本地模型
- 更灵活的定制

### Q: 如何切换不同的 LLM 提供商？

A: 修改后端代码，调用不同的 API。前端不需要修改。

### Q: 流式响应为什么不显示？

A:
1. 检查后端是否正确返回 SSE 格式
2. 确保 Content-Type 是 `text/event-stream`
3. 查看浏览器 Network 标签的响应

### Q: 如何添加更多模型？

A: 在 `app/(chat)/api/chat/route.ts` 中更新 `modelMapping`：

```typescript
const modelMapping = {
  "chat-model": "gpt-4o",  // 改为其他模型
  "custom-model": "claude-3-opus-20240229",  // 添加新模型
};
```

## 11. 性能优化

### 缓存

在后端添加响应缓存：

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_response(messages_hash):
    # 返回缓存的响应
    pass
```

### 速率限制

```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/chat")
@limiter.limit("10/minute")
async def chat(request: dict):
    ...
```

## 12. 安全建议

1. **API Key 管理**: 使用环境变量存储 API keys
2. **请求验证**: 验证请求来源和内容
3. **速率限制**: 防止滥用
4. **HTTPS**: 生产环境必须使用 HTTPS
5. **错误信息**: 不要暴露敏感的错误信息

---

现在你可以完全控制整个 LLM 调用流程了！🎉
