export const AI_MODEL_IDS = [
  "gemini-flash-lite",
  "gemini-3.7-flash",
  "llama-3.3-70b",
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "deepseek-r1",
  "gpt-4o-mini",
  "huggingface",
  "claude-sonnet-5",
  "claude-haiku-4.5",
  "claude-3.5-haiku",
  "cloudflare-workers-ai",
] as const;

export type AiModelId = (typeof AI_MODEL_IDS)[number];

export type AiProviderId =
  | "gemini"
  | "groq"
  | "deepseek"
  | "openai"
  | "huggingface"
  | "anthropic"
  | "cloudflare";

export interface AiModelDef {
  id: AiModelId;
  provider: AiProviderId;
  /** API model name sent to the provider. */
  apiModel: string;
  env: readonly string[];
  /** Conservative daily request cap (free-tier style). 0 = unlimited. */
  dailyLimit: number;
}

function envModel(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

export const AI_MODELS: readonly AiModelDef[] = [
  {
    id: "gemini-flash-lite",
    provider: "gemini",
    apiModel: envModel("GEMINI_MODEL", "gemini-3.5-flash-lite"),
    env: ["GEMINI_API_KEY"],
    dailyLimit: 50,
  },
  {
    id: "gemini-3.7-flash",
    provider: "gemini",
    apiModel: envModel("GEMINI_FLASH_MODEL", "gemini-3.7-flash"),
    env: ["GEMINI_API_KEY"],
    dailyLimit: 30,
  },
  {
    id: "llama-3.3-70b",
    provider: "groq",
    apiModel: envModel("GROQ_MODEL", "openai/gpt-oss-120b"),
    env: ["GROQ_API_KEY"],
    dailyLimit: 30,
  },
  {
    id: "deepseek-v4-flash",
    provider: "deepseek",
    apiModel: envModel("DEEPSEEK_CHAT_MODEL", "deepseek-v4-flash"),
    env: ["DEEPSEEK_API_KEY"],
    dailyLimit: 40,
  },
  {
    id: "deepseek-v4-pro",
    provider: "deepseek",
    apiModel: envModel("DEEPSEEK_PRO_MODEL", "deepseek-v4-pro"),
    env: ["DEEPSEEK_API_KEY"],
    dailyLimit: 40,
  },
  {
    id: "deepseek-r1",
    provider: "deepseek",
    apiModel: envModel("DEEPSEEK_REASON_MODEL", "deepseek-reasoner"),
    env: ["DEEPSEEK_API_KEY"],
    dailyLimit: 10,
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    apiModel: envModel("OPENAI_MODEL", "gpt-4o-mini"),
    env: ["OPENAI_API_KEY"],
    dailyLimit: 20,
  },
  {
    id: "huggingface",
    provider: "huggingface",
    apiModel: envModel("HF_MODEL", "Qwen/Qwen2.5-7B-Instruct"),
    env: ["HF_TOKEN"],
    dailyLimit: 20,
  },
  {
    id: "claude-sonnet-5",
    provider: "anthropic",
    apiModel: envModel("ANTHROPIC_SONNET_MODEL", "claude-3-5-sonnet-latest"),
    env: ["ANTHROPIC_API_KEY"],
    dailyLimit: 10,
  },
  {
    id: "claude-haiku-4.5",
    provider: "anthropic",
    apiModel: envModel("ANTHROPIC_HAIKU_45_MODEL", "claude-haiku-4-5"),
    env: ["ANTHROPIC_API_KEY"],
    dailyLimit: 20,
  },
  {
    id: "claude-3.5-haiku",
    provider: "anthropic",
    apiModel: envModel("ANTHROPIC_HAIKU_MODEL", "claude-3-5-haiku-latest"),
    env: ["ANTHROPIC_API_KEY"],
    dailyLimit: 20,
  },
  {
    id: "cloudflare-workers-ai",
    provider: "cloudflare",
    apiModel: envModel(
      "CLOUDFLARE_AI_MODEL",
      "@cf/meta/llama-3.1-8b-instruct",
    ),
    env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
    dailyLimit: 30,
  },
];

export const DEFAULT_AI_MODEL: AiModelId = "gemini-flash-lite";

export function getAiModel(id: string): AiModelDef | undefined {
  return AI_MODELS.find((model) => model.id === id);
}

export function isAiModelId(value: string): value is AiModelId {
  return AI_MODELS.some((model) => model.id === value);
}

export function envValue(name: string) {
  const direct = process.env[name]?.trim();
  if (direct) return direct;
  if (name === "HF_TOKEN") {
    return (
      process.env.HF_API_KEY?.trim() ||
      process.env.HUGGINGFACE_TOKEN?.trim() ||
      process.env.HUGGING_FACE_HUB_TOKEN?.trim() ||
      ""
    );
  }
  return "";
}

export function isModelConfigured(model: AiModelDef) {
  return model.env.every((name) => envValue(name).length > 0);
}

export function dailyLimitFor(model: AiModelDef) {
  const override = Number(
    process.env[`AI_LIMIT_${model.id.replaceAll(/[^a-z0-9]/gi, "_").toUpperCase()}`],
  );
  if (Number.isFinite(override) && override >= 0) return Math.floor(override);
  return model.dailyLimit;
}
