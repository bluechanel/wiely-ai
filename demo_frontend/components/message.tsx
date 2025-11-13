"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { memo } from "react";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { MessageContent } from "./ai-elements/message";
import { Response } from "./ai-elements/response";
import { SparklesIcon } from "./icons";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";

const PurePreviewMessage = ({
    chatId,
    message,
    isLoading,
    setMessages,
    regenerate,
    isReadonly,
    requiresScrollPadding,
}: {
    chatId: string;
    message: ChatMessage;
    isLoading: boolean;
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
    isReadonly: boolean;
    requiresScrollPadding: boolean;
}) => {
    const attachmentsFromMessage = message.parts.filter(
        (part) => part.type === "file",
    );

    return (
        <motion.div
            animate={{ opacity: 1 }}
            className="group/message w-full"
            data-role={message.role}
            data-testid={`message-${message.role}`}
            initial={{ opacity: 0 }}
        >
            <div
                className={cn("flex w-full items-start gap-2 md:gap-3", {
                    "justify-end": message.role === "user",
                    "justify-start": message.role === "assistant",
                })}
            >
                {message.role === "assistant" && (
                    <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
                        <SparklesIcon size={14} />
                    </div>
                )}

                <div
                    className={cn("flex flex-col", {
                        "gap-2 md:gap-4": message.parts?.some(
                            (p) => p.type === "text" && p.text?.trim(),
                        ),
                        "min-h-96":
                            message.role === "assistant" &&
                            requiresScrollPadding,
                        "w-full":
                            message.role === "assistant" &&
                            message.parts?.some(
                                (p) => p.type === "text" && p.text?.trim(),
                            ),
                        "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
                            message.role === "user",
                    })}
                >
                    {attachmentsFromMessage.length > 0 && (
                        <div
                            className="flex flex-row justify-end gap-2"
                            data-testid={"message-attachments"}
                        >
                            {attachmentsFromMessage.map((attachment) => (
                                <PreviewAttachment
                                    attachment={{
                                        name: attachment.filename ?? "file",
                                        contentType: attachment.mediaType,
                                        url: attachment.url,
                                    }}
                                    key={attachment.url}
                                />
                            ))}
                        </div>
                    )}

                    {message.parts?.map((part, index) => {
                        const { type } = part;
                        const key = `message-${message.id}-part-${index}`;

                        if (
                            type === "reasoning" &&
                            part.text?.trim().length > 0
                        ) {
                            return (
                                <MessageReasoning
                                    isLoading={isLoading}
                                    key={key}
                                    reasoning={part.text}
                                />
                            );
                        }

                        if (type === "text") {
                            return (
                                <div key={key}>
                                    <MessageContent
                                        className={cn({
                                            "w-fit wrap-break-word rounded-2xl px-3 py-2 text-right text-white":
                                                message.role === "user",
                                            "bg-transparent px-0 py-0 text-left":
                                                message.role === "assistant",
                                        })}
                                        data-testid="message-content"
                                        style={
                                            message.role === "user"
                                                ? {
                                                      backgroundColor:
                                                          "#006cff",
                                                  }
                                                : undefined
                                        }
                                    >
                                        <Response>
                                            {sanitizeText(part.text)}
                                        </Response>
                                    </MessageContent>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>
        </motion.div>
    );
};

export const PreviewMessage = memo(
    PurePreviewMessage,
    (prevProps, nextProps) => {
        if (prevProps.isLoading !== nextProps.isLoading) {
            return false;
        }
        if (prevProps.message.id !== nextProps.message.id) {
            return false;
        }
        if (
            prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding
        ) {
            return false;
        }
        if (!equal(prevProps.message.parts, nextProps.message.parts)) {
            return false;
        }

        return false;
    },
);

export const ThinkingMessage = () => {
    const role = "assistant";

    return (
        <motion.div
            animate={{ opacity: 1 }}
            className="group/message w-full"
            data-role={role}
            data-testid="message-assistant-loading"
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <div className="flex items-start justify-start gap-3">
                <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
                    <SparklesIcon size={14} />
                </div>

                <div className="flex w-full flex-col gap-2 md:gap-4">
                    <div className="p-0 text-muted-foreground text-sm">
                        Thinking...
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
