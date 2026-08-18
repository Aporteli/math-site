import { getAiModel, isModelConfigured } from "./ai-models";

/** @deprecated Use isModelConfigured(getAiModel("gemini-flash-lite")). */
export function hasGeminiKey() {
  const model = getAiModel("gemini-flash-lite");
  return Boolean(model && isModelConfigured(model));
}
