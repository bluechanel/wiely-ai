"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
    type ChangeEvent,
    type Dispatch,
    memo,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { chatModels } from "@/lib/models";
import type { Attachment, ChatMessage } from "@/lib/types";
import {
    ModelSelector,
    ModelSelectorContent,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorInput,
    ModelSelectorItem,
    ModelSelectorList,
    ModelSelectorLogo,
    ModelSelectorLogoGroup,
    ModelSelectorName,
    ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
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
    PromptInputFooter,
    type PromptInputMessage,
    PromptInputProvider,
    PromptInputSpeechButton,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { CheckIcon, GlobeIcon } from "lucide-react";

function PureMultimodalInput({
    chatId,
    input,
    setInput,
    status,
    stop,
    attachments,
    setAttachments,
    messages,
    setMessages,
    sendMessage,
    className,
    selectedModelId,
    onModelChange,
}: {
    chatId: string;
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    status: UseChatHelpers<ChatMessage>["status"];
    stop: () => void;
    attachments: Attachment[];
    setAttachments: Dispatch<SetStateAction<Attachment[]>>;
    messages: UIMessage[];
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
    className?: string;
    selectedModelId: string;
    onModelChange?: (modelId: string) => void;
}) {
    const [optimisticModelId, setOptimisticModelId] = useState(selectedModelId);
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
    const [useWebSearch, setUseWebSearch] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const selectedModelData = chatModels.find(
        (m) => m.id === optimisticModelId,
    );

    useEffect(() => {
        setOptimisticModelId(selectedModelId);
    }, [selectedModelId]);

    const handleSubmit = (message: PromptInputMessage) => {
        const hasText = Boolean(message.text);
        const hasAttachments = Boolean(message.files?.length);
        if (!(hasText || hasAttachments)) {
            return;
        }
        console.log("Submitting message:", message);
        sendMessage(
            {
                text: message.text || "Sent with attachments",
                files: message.files,
            },
            {
                body: {
                    model: optimisticModelId,
                    webSearch: useWebSearch,
                },
            },
        );
        // setText("");
        // setStatus("submitted");
        // eslint-disable-next-line no-console

        // setTimeout(() => {
        //   setStatus("streaming");
        // }, SUBMITTING_TIMEOUT);
        // setTimeout(() => {
        //   setStatus("ready");
        // }, STREAMING_TIMEOUT);
    };
    return (
        <div className="size-full">
            <PromptInputProvider>
                <PromptInput globalDrop multiple onSubmit={handleSubmit}>
                    <PromptInputAttachments>
                        {(attachment) => (
                            <PromptInputAttachment data={attachment} />
                        )}
                    </PromptInputAttachments>
                    <PromptInputBody>
                        <PromptInputTextarea ref={textareaRef} />
                    </PromptInputBody>
                    <PromptInputFooter>
                        <PromptInputTools>
                            <PromptInputActionMenu>
                                <PromptInputActionMenuTrigger />
                                <PromptInputActionMenuContent>
                                    <PromptInputActionAddAttachments />
                                </PromptInputActionMenuContent>
                            </PromptInputActionMenu>
                            <PromptInputSpeechButton
                                textareaRef={textareaRef}
                            />
                            <PromptInputButton>
                                <GlobeIcon size={16} />
                                <span>Search</span>
                            </PromptInputButton>
                            <ModelSelector
                                onOpenChange={setModelSelectorOpen}
                                open={modelSelectorOpen}
                            >
                                <ModelSelectorTrigger asChild>
                                    <PromptInputButton>
                                        {selectedModelData?.chefSlug && (
                                            <ModelSelectorLogo
                                                provider={
                                                    selectedModelData.chefSlug
                                                }
                                            />
                                        )}
                                        {selectedModelData?.name && (
                                            <ModelSelectorName>
                                                {selectedModelData.name}
                                            </ModelSelectorName>
                                        )}
                                    </PromptInputButton>
                                </ModelSelectorTrigger>
                                <ModelSelectorContent>
                                    <ModelSelectorInput placeholder="Search models..." />
                                    <ModelSelectorList>
                                        <ModelSelectorEmpty>
                                            No models found.
                                        </ModelSelectorEmpty>
                                        {["OpenAI", "Anthropic", "Google"].map(
                                            (chef) => (
                                                <ModelSelectorGroup
                                                    heading={chef}
                                                    key={chef}
                                                >
                                                    {chatModels
                                                        .filter(
                                                            (m) =>
                                                                m.chef === chef,
                                                        )
                                                        .map((m) => (
                                                            <ModelSelectorItem
                                                                key={m.id}
                                                                onSelect={() => {
                                                                    setOptimisticModelId(
                                                                        m.id,
                                                                    );
                                                                    setModelSelectorOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                                value={m.id}
                                                            >
                                                                <ModelSelectorLogo
                                                                    provider={
                                                                        m.chefSlug
                                                                    }
                                                                />
                                                                <ModelSelectorName>
                                                                    {m.name}
                                                                </ModelSelectorName>
                                                                <ModelSelectorLogoGroup>
                                                                    {m.providers.map(
                                                                        (
                                                                            provider,
                                                                        ) => (
                                                                            <ModelSelectorLogo
                                                                                key={
                                                                                    provider
                                                                                }
                                                                                provider={
                                                                                    provider
                                                                                }
                                                                            />
                                                                        ),
                                                                    )}
                                                                </ModelSelectorLogoGroup>
                                                                {optimisticModelId ===
                                                                m.id ? (
                                                                    <CheckIcon className="ml-auto size-4" />
                                                                ) : (
                                                                    <div className="ml-auto size-4" />
                                                                )}
                                                            </ModelSelectorItem>
                                                        ))}
                                                </ModelSelectorGroup>
                                            ),
                                        )}
                                    </ModelSelectorList>
                                </ModelSelectorContent>
                            </ModelSelector>
                        </PromptInputTools>
                        <PromptInputSubmit status={status} />
                    </PromptInputFooter>
                </PromptInput>
            </PromptInputProvider>
        </div>
    );
}

export const MultimodalInput = memo(
    PureMultimodalInput,
    (prevProps, nextProps) => {
        if (prevProps.input !== nextProps.input) {
            return false;
        }
        if (prevProps.status !== nextProps.status) {
            return false;
        }
        if (!equal(prevProps.attachments, nextProps.attachments)) {
            return false;
        }
        if (prevProps.selectedModelId !== nextProps.selectedModelId) {
            return false;
        }

        return true;
    },
);
