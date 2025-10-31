"use server";

import { type UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { BACKEND_URL } from "@/lib/ai/providers";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/memory-storage";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  try {
    // 提取消息文本内容
    let messageText = '';
    if (Array.isArray(message.parts)) {
      messageText = message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
    }

    // 如果没有提取到文本，使用默认标题
    if (!messageText) {
      return 'New Chat';
    }

    // 调用 Python 后端生成标题（使用流式响应）
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You will generate a short title based on the first message a user begins a conversation with. Ensure it is not more than 80 characters long. The title should be a summary of the user's message. Do not use quotes or colons. Just respond with the title text only.`,
          },
          {
            role: 'user',
            content: messageText,
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error('Failed to generate title:', response.status);
      // 降级处理：截取消息的前80个字符作为标题
      return messageText.substring(0, 80) || 'New Chat';
    }

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      return messageText.substring(0, 80) || 'New Chat';
    }

    let title = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('0:')) {
          try {
            const data = JSON.parse(line.substring(2));
            if (data.type === 'text-delta' && data.textDelta) {
              title += data.textDelta;
            }
          } catch (e) {
            console.warn('Failed to parse title line:', line);
          }
        }
      }
    }

    return title.trim().substring(0, 80) || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    // 降级处理
    let messageText = '';
    if (Array.isArray(message.parts)) {
      messageText = message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
    }
    return messageText.substring(0, 80) || 'New Chat';
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}
