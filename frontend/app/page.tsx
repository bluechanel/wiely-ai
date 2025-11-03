"use client";

import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputAttachment,
    PromptInputAttachments,
    PromptInputBody,
    PromptInputButton,
    type PromptInputMessage,
    PromptInputModelSelect,
    PromptInputModelSelectContent,
    PromptInputModelSelectItem,
    PromptInputModelSelectTrigger,
    PromptInputModelSelectValue,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputTools,
    PromptInputHeader,
} from "@/components/ai-elements/prompt-input";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Fragment, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
import {
    Source,
    Sources,
    SourcesContent,
    SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
    Tool,
    ToolContent,
    ToolHeader,
    ToolOutput,
    ToolInput,
} from "@/components/ai-elements/tool";
import {
    CodeBlock,
    CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { Loader } from "@/components/ai-elements/loader";
import { Image } from "@/components/ai-elements/image";

const models = [
    {
        name: "GPT 4o",
        value: "openai/gpt-4o",
    },
    {
        name: "Deepseek R1",
        value: "deepseek/deepseek-r1",
    },
];

const ChatBot = () => {
    const [input, setInput] = useState("");
    const [model, setModel] = useState<string>(models[0].value);
    const [webSearch, setWebSearch] = useState(false);
    const { messages, sendMessage, status, regenerate } = useChat({
        onError: (err: Error) => {
            console.error("useChat encountered an error:", err);
        },
        onFinish: ({ message, messages, isAbort, isDisconnect, isError }) => {
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
        onData: (dataPart) => {
            // 可视为调试：每一个接收的 “data” 事件都会触发
            console.debug("Received data part from stream:", dataPart);
        },
    });

    const handleSubmit = (message: PromptInputMessage) => {
        const hasText = Boolean(message.text);
        const hasAttachments = Boolean(message.files?.length);

        if (!(hasText || hasAttachments)) {
            return;
        }

        sendMessage(
            {
                text: message.text || "Sent with attachments",
                files: message.files,
            },
            {
                body: {
                    model: model,
                    webSearch: webSearch,
                },
            },
        );
        setInput("");
    };

    return (
        <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
            <div className="flex flex-col h-full">
                <Conversation className="h-full">
                    <ConversationContent>
                        {messages.map((message) => (
                            <div key={message.id}>
                                {message.role === "assistant" &&
                                    message.parts.filter(
                                        (part) => part.type === "source-url",
                                    ).length > 0 && (
                                        <Sources>
                                            <SourcesTrigger
                                                count={
                                                    message.parts.filter(
                                                        (part) =>
                                                            part.type ===
                                                            "source-url",
                                                    ).length
                                                }
                                            />
                                            {message.parts
                                                .filter(
                                                    (part) =>
                                                        part.type ===
                                                        "source-url",
                                                )
                                                .map((part, i) => (
                                                    <SourcesContent
                                                        key={`${message.id}-${i}`}
                                                    >
                                                        <Source
                                                            key={`${message.id}-${i}`}
                                                            href={part.url}
                                                            title={part.url}
                                                        />
                                                    </SourcesContent>
                                                ))}
                                        </Sources>
                                    )}
                                {message.parts.map((part, i) => {
                                    if (part.type === "text") {
                                        return (
                                            <Fragment
                                                key={`${message.id}-${i}`}
                                            >
                                                <Message from={message.role}>
                                                    <MessageContent>
                                                        <Response>
                                                            {part.text}
                                                        </Response>
                                                    </MessageContent>
                                                </Message>
                                                {message.role === "assistant" &&
                                                    i ===
                                                        messages.length - 1 && (
                                                        <Actions className="mt-2">
                                                            <Action
                                                                onClick={() =>
                                                                    regenerate()
                                                                }
                                                                label="Retry"
                                                            >
                                                                <RefreshCcwIcon className="size-3" />
                                                            </Action>
                                                            <Action
                                                                onClick={() =>
                                                                    navigator.clipboard.writeText(
                                                                        part.text,
                                                                    )
                                                                }
                                                                label="Copy"
                                                            >
                                                                <CopyIcon className="size-3" />
                                                            </Action>
                                                        </Actions>
                                                    )}
                                            </Fragment>
                                        );
                                    }

                                    if (part.type === "reasoning") {
                                        return (
                                            <Reasoning
                                                key={`${message.id}-${i}`}
                                                className="w-full"
                                                isStreaming={
                                                    status === "streaming" &&
                                                    i ===
                                                        message.parts.length -
                                                            1 &&
                                                    message.id ===
                                                        messages.at(-1)?.id
                                                }
                                            >
                                                <ReasoningTrigger />
                                                <ReasoningContent>
                                                    {part.text}
                                                </ReasoningContent>
                                            </Reasoning>
                                        );
                                    }
                                    if (part.type === "file") {
                                        return (
                                            <div key={i}>
                                                <p>file: {part.url}</p>
                                            </div>
                                        );
                                    }
                                    if (part.type.startsWith("data-")) {
                                        return (
                                            <div key={i}>
                                                <p>
                                                    data:{" "}
                                                    {JSON.stringify(part.data)}
                                                </p>
                                            </div>
                                        );
                                    }
                                    if (part.type.startsWith("tool-")) {
                                        return (
                                            <Tool key={i}>
                                                <ToolHeader
                                                    state={part.state}
                                                    type={part.type}
                                                />
                                                <ToolContent>
                                                    <ToolInput
                                                        input={part.input}
                                                    />
                                                    {part.state ===
                                                        "output-available" && (
                                                        <ToolOutput
                                                            errorText={
                                                                part.errorText
                                                            }
                                                            output={
                                                                <CodeBlock
                                                                    code={JSON.stringify(
                                                                        part.output,
                                                                    )}
                                                                    language="json"
                                                                />
                                                            }
                                                        />
                                                    )}
                                                </ToolContent>
                                            </Tool>
                                        );
                                    }
                                })}
                            </div>
                        ))}
                        {status === "submitted" && <Loader />}
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>

                <PromptInput
                    onSubmit={handleSubmit}
                    className="mt-4"
                    globalDrop
                    multiple
                >
                    <PromptInputHeader>
                        <PromptInputAttachments>
                            {(attachment) => (
                                <PromptInputAttachment data={attachment} />
                            )}
                        </PromptInputAttachments>
                    </PromptInputHeader>
                    <PromptInputBody>
                        <PromptInputTextarea
                            onChange={(e) => setInput(e.target.value)}
                            value={input}
                        />
                    </PromptInputBody>
                    <PromptInputFooter>
                        <PromptInputTools>
                            <PromptInputActionMenu>
                                <PromptInputActionMenuTrigger />
                                <PromptInputActionMenuContent>
                                    <PromptInputActionAddAttachments />
                                </PromptInputActionMenuContent>
                            </PromptInputActionMenu>
                            <PromptInputButton
                                variant={webSearch ? "default" : "ghost"}
                                onClick={() => setWebSearch(!webSearch)}
                            >
                                <GlobeIcon size={16} />
                                <span>Search</span>
                            </PromptInputButton>
                            <PromptInputModelSelect
                                onValueChange={(value) => {
                                    setModel(value);
                                }}
                                value={model}
                            >
                                <PromptInputModelSelectTrigger>
                                    <PromptInputModelSelectValue />
                                </PromptInputModelSelectTrigger>
                                <PromptInputModelSelectContent>
                                    {models.map((model) => (
                                        <PromptInputModelSelectItem
                                            key={model.value}
                                            value={model.value}
                                        >
                                            {model.name}
                                        </PromptInputModelSelectItem>
                                    ))}
                                </PromptInputModelSelectContent>
                            </PromptInputModelSelect>
                        </PromptInputTools>
                        <PromptInputSubmit
                            disabled={!input && !status}
                            status={status}
                        />
                    </PromptInputFooter>
                </PromptInput>
            </div>
        </div>
    );
};

export default ChatBot;
