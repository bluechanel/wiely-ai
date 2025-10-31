import type { ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

// For local deployment, all features are available
export const entitlementsByUserType: Record<string, Entitlements> = {
  local: {
    maxMessagesPerDay: Number.POSITIVE_INFINITY,
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
};
