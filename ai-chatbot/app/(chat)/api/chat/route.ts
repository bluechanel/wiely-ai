import type { VisibilityType } from "@/components/visibility-selector";
import type { ChatModel } from "@/lib/ai/models";
import { BACKEND_URL } from "@/lib/ai/providers";
import {
    deleteChatById,
    getChatById,
    getMessagesByChatId,
    saveChat,
    saveMessages,
    getDefaultUser,
} from "@/lib/memory-storage";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

// 将 UI 消息转换为 Python 后端格式
function convertToPythonMessages(messages: any[]) {
    return messages.map((msg) => {
        if (msg.role === "user") {
            // 提取文本内容
            let content = "";
            if (Array.isArray(msg.parts)) {
                content = msg.parts
                    .filter((part: any) => part.type === "text")
                    .map((part: any) => part.text)
                    .join("\n");
            } else if (msg.content) {
                content = msg.content;
            }

            return {
                role: "user",
                content: content || "",
            };
        } else if (msg.role === "assistant") {
            let content = "";
            if (Array.isArray(msg.parts)) {
                content = msg.parts
                    .filter((part: any) => part.type === "text")
                    .map((part: any) => part.text)
                    .join("\n");
            } else if (msg.content) {
                content = msg.content;
            }

            return {
                role: "assistant",
                content: content || "",
            };
        }
        return msg;
    });
}

export async function POST(request: Request) {
    let requestBody: PostRequestBody;

    try {
        const json = await request.json();
        requestBody = postRequestBodySchema.parse(json);
    } catch (_) {
        return new ChatSDKError("bad_request:api").toResponse();
    }

    try {
        const {
            id,
            message,
            selectedChatModel,
            selectedVisibilityType,
        }: {
            id: string;
            message: ChatMessage;
            selectedChatModel: ChatModel["id"];
            selectedVisibilityType: VisibilityType;
        } = requestBody;

        // Use default user (no authentication)
        const user = getDefaultUser();

        const chat = await getChatById({ id });

        if (!chat) {
            const title = await generateTitleFromUserMessage({
                message,
            });

            await saveChat({
                id,
                userId: user.id,
                title,
                visibility: selectedVisibilityType,
            });
        }

        // 获取历史消息
        const messagesFromDb = await getMessagesByChatId({ id });

        // 转换为 Python 后端格式
        const pythonMessages = convertToPythonMessages([
            ...messagesFromDb,
            message,
        ]);

        // 保存用户消息
        await saveMessages({
            messages: [
                {
                    chatId: id,
                    id: message.id,
                    role: "user",
                    parts: message.parts,
                    attachments: [],
                    createdAt: new Date(),
                },
            ],
        });

        // 映射模型 ID 到 Python 后端支持的模型
        const modelMapping: Record<string, string> = {
            "chat-model": "gpt-4",
            "chat-model-reasoning": "gpt-4-turbo-preview",
            "title-model": "gpt-3.5-turbo",
            "artifact-model": "gpt-4",
        };

        const backendModel = modelMapping[selectedChatModel] || "gpt-4";

        console.log("Calling Python backend:", BACKEND_URL);
        console.log("Model:", backendModel);
        console.log("Messages count:", pythonMessages.length);

        // 调用 Python 后端
        const backendResponse = await fetch(`${BACKEND_URL}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: pythonMessages,
                model: backendModel,
                temperature: 0.7,
                stream: true,
            }),
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            console.error("Backend error:", backendResponse.status, errorText);
            throw new Error(
                `Backend error: ${backendResponse.status} - ${errorText}`,
            );
        }

        if (!backendResponse.body) {
            throw new Error("No response body from backend");
        }

        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                // 将 chunk 转为文本
                const text = new TextDecoder().decode(chunk);
                // 直接转发原始数据
                controller.enqueue(chunk);
            },
        });

        // 返回流式响应
        const stream = backendResponse.body.pipeThrough(transformStream);

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        const vercelId = request.headers.get("x-vercel-id");
        console.error("Unhandled error in chat API:", error, { vercelId });

        if (error instanceof Error) {
            console.error("Error details:", error.message, error.stack);
        }

        return new ChatSDKError("offline:chat").toResponse();
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return new ChatSDKError("bad_request:api").toResponse();
    }

    // No authentication check - allow deletion
    const deletedChat = await deleteChatById({ id });

    return Response.json(deletedChat, { status: 200 });
}
