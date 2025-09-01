import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // 读取前端传来的 body
  const body = await req.text();
  // 校验用户登录，获取用户id
  const userID = "wiley"
  // 将userid添加到body
  const newBody = JSON.parse(body)
  newBody.user_id = userID
  const newBodyStr = JSON.stringify(newBody)

  // 后端 SSE 接口地址
  const backendUrl = process.env.BACKENDURL ? process.env.BACKENDURL : 'http://127.0.0.1:8000/api/chat';

  // 转发到后端
  const backendResponse = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 转发鉴权信息（如果有）
      'Authorization': req.headers.get('authorization') || '',
    },
    body: newBodyStr,
  });

  if (!backendResponse.body) {
    return new Response('No SSE body', { status: 500 });
  }

  // 把后端返回的 SSE 流直接透传给前端
  const stream = new ReadableStream({
    async start(controller) {
      const reader = backendResponse.body!.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
