// Custom provider for Python backend
// This creates mock language models that satisfy the AI SDK interface
// but won't actually be used for chat (we handle that directly in the route)

import { customProvider, type LanguageModel } from "ai";

export interface PythonBackendSettings {
  baseURL: string;
}

export function createPythonBackendProvider(settings: PythonBackendSettings) {
  // Create mock models that satisfy the interface
  // These are used for tools/artifacts which we'll handle separately
  const createMockModel = (modelId: string) => {
    return {
      specificationVersion: "v2",
      provider: "python-backend",
      modelId,
      defaultObjectGenerationMode: "tool",
      supportedUrls: [],
      supportsImageUrls: false,
      supportsStructuredOutputs: false,
      doGenerate: async () => ({
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        content: [{ type: "text", text: "This model should not be called directly" }],
        warnings: [],
      }),
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: "text-delta",
              id: "mock-id",
              delta: "This model should not be called directly",
            });
            controller.close();
          },
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      }),
    } as unknown as LanguageModel;
  };

  return customProvider({
    languageModels: {
      "chat-model": createMockModel("chat-model") as any,
      "chat-model-reasoning": createMockModel("chat-model-reasoning") as any,
      "title-model": createMockModel("title-model") as any,
      "artifact-model": createMockModel("artifact-model") as any,
    },
  });
}
