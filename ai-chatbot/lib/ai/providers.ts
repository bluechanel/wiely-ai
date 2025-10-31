import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { createPythonBackendProvider } from "./python-backend-provider";

// Python 后端 URL
const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : createPythonBackendProvider({
      baseURL: PYTHON_BACKEND_URL,
    });

// 导出 backend URL 供其他地方使用
export const BACKEND_URL = PYTHON_BACKEND_URL;
