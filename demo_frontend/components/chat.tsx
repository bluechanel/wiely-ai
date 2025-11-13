"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import type { Attachment, ChatMessage } from "@/lib/types";

import { Messages } from "./messages";
import { MultimodalInput } from "./input";

export function Chat({
    id,
    initialMessages,
    initialChatModel,
    isReadonly,
}: {
    id: string;
    initialMessages: ChatMessage[];
    initialChatModel: string;
    isReadonly: boolean;
}) {
    const [input, setInput] = useState<string>("");
    const [currentModelId, setCurrentModelId] = useState(initialChatModel);
    const currentModelIdRef = useRef(currentModelId);

    useEffect(() => {
        currentModelIdRef.current = currentModelId;
    }, [currentModelId]);

    const { messages, setMessages, sendMessage, status, stop, regenerate } =
        useChat<ChatMessage>({
            id,
            messages: initialMessages,
            experimental_throttle: 100,
            transport: new DefaultChatTransport({
                api: "/api/chat",
            }),
            onData: (dataPart) => {
                // 可视为调试：每一个接收的 “data” 事件都会触发
                console.debug("Received data part from stream:", dataPart);
            },
            onError: (err: Error) => {
                console.error("useChat encountered an error:", err);
            },
            onFinish: ({
                message,
                messages,
                isAbort,
                isDisconnect,
                isError,
            }) => {
                console.log(
                    "Chat finished. isError:",
                    isError,
                    "isAbort:",
                    isAbort,
                    "isDisconnect:",
                    isDisconnect,
                );
                if (isError) {
                    console.warn(
                        "Finished with error state. Last assistant message:",
                        message,
                    );
                }
            },
        });

    const [attachments, setAttachments] = useState<Attachment[]>([]);

    return (
        <>
            <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
                <Messages
                    chatId={id}
                    isReadonly={isReadonly}
                    messages={messages}
                    regenerate={regenerate}
                    setMessages={setMessages}
                    status={status}
                />

                <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
                    {!isReadonly && (
                        <MultimodalInput
                            attachments={attachments}
                            chatId={id}
                            input={input}
                            messages={messages}
                            onModelChange={setCurrentModelId}
                            selectedModelId={currentModelId}
                            sendMessage={sendMessage}
                            setAttachments={setAttachments}
                            setInput={setInput}
                            setMessages={setMessages}
                            status={status}
                            stop={stop}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
