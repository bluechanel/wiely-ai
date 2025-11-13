export const DEFAULT_CHAT_MODEL: string = "gpt-4o";

export type ChatModel = {
    id: string;
    name: string;
    chef: string;
    chefSlug: string;
    providers: string[];
    description: string;
};

export const chatModels: ChatModel[] = [
    {
        id: "gpt-4o",
        name: "GPT-4o",
        chef: "OpenAI",
        chefSlug: "openai",
        providers: ["openai", "azure"],
        description:
            "Advanced multimodal model with vision and text capabilities",
    },
    {
        id: "claude-opus-4-20250514",
        name: "Claude 4 Opus",
        chef: "Anthropic",
        chefSlug: "anthropic",
        providers: ["anthropic", "azure", "google", "amazon-bedrock"],
        description:
            "Uses advanced chain-of-thought reasoning for complex problems",
    },
];
