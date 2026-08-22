import {
  GEMINI_PLAIN_SCHEMA,
  GEMINI_VERIFIED_SCHEMA,
  type AiCheckMode,
  type DiverseGenerateError,
  type PlainProblemDraft,
  type VerifiedProblemDraft,
} from "./ai-schema";
import { parseProblemPayload } from "./ai-json";
import {
  envValue,
  getAiModel,
  type AiModelDef,
  type AiModelId,
} from "./ai-models";
import {
  buildProblemPrompt,
  buildUncheckedChatPrompt,
  temperatureFor,
  type ProposeInput,
} from "./ai-prompt";
import type { Locale } from "@/i18n/config";

const TIMEOUT_MS = 45_000;
const REASONER_TIMEOUT_MS = 90_000;
const CHAT_TIMEOUT_MS = 75_000;
const DEFAULT_MAX_TOKENS = 4096;
const CHAT_MAX_TOKENS = 8192;

const SCHOOL_SYSTEM =
  "You generate math problems. Reply with a JSON object only.";
const CHAT_SYSTEM =
  "You are a contest mathematician. Think at high depth and at speed: full multi-step olympiad reasoning, no easy drills, no wandering. Then reply with a JSON object only.";
const TEACHER_CHAT_SYSTEM =
  "You are a teacher's in-site math assistant. Reply in ordinary readable prose: short paragraphs, numbered steps, and simple '-' bullet lists. Write every formula in LaTeX: inline math in $...$ and display equations on their own line in $$...$$. Avoid heavy Markdown." +
  " When the teacher asks you to invent, write, generate, or propose one or more school problems:" +
  " (1) In the readable prose, for EACH problem use this shape:\n- ამოცანა N (or Problem N)\nსტემი: <full student-facing stem with $...$ math>\nამოხსნა: <complete worked solution with steps and final answer>\n" +
  " (2) AFTER that prose, append a machine block the site can parse. Prefer a fenced block:" +
  '\n```math-site-problems\n{"problems":[{"promptTex":"...","solutionTex":"...","topic":"algebra","difficulty":"medium","year":"10"}]}\n```' +
  " If you cannot use that fence name, a plain ```json fence or a raw JSON object with the same shape is also OK — put it at the very end." +
  " JSON rules: 1–12 problems; promptTex and solutionTex MUST be the same full text as in the prose (not a shorter rewrite)." +
  " promptTex = full stem including the instruction sentence, not only a formula." +
  " solutionTex = FULL worked solution with numbered steps and the final answer." +
  " CRITICAL for JSON strings: every LaTeX backslash must be doubled (write \\\\frac not \\frac, \\\\sum not \\sum)." +
  " Put human-language words as normal Unicode text — never wrap sentences in \\text{...}." +
  " Every formula inside promptTex/solutionTex must sit in $...$ or $$...$$; never leave bare \\frac or \\sum next to words." +
  " topic is one of algebra,equations,geometry,functions,percent,calculus,vectors,combinatorics;" +
  ' difficulty is easy|medium|hard|olympiad; year is optional "7"–"12".' +
  " Do not emit that JSON when you are only explaining or chatting without giving new problems.";

const GROQ_CHAT_PREFERENCE = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
] as const;

const GROQ_SKIP = /whisper|guard|orpheus|tts|canopy|compound|allam/i;

export class ProviderError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    message: string,
    status: number,
    code = "",
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function classifyProviderError(error: unknown): DiverseGenerateError {
  if (error instanceof Error) {
    if (error.message === "missing_key") return "missing_key";
    if (error.message === "limit_exceeded") return "limit_exceeded";
    if (error.message === "bad_output") return "bad_output";
    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      /aborted due to timeout/i.test(error.message)
    ) {
      return "timeout";
    }
  }
  if (isRequestTooLarge(error)) return "failed";
  if (error instanceof ProviderError) {
    const code = error.code.toLowerCase();
    const text = error.message.toLowerCase();
    if (
      error.status === 401 ||
      code === "invalid_api_key" ||
      code === "authentication_error" ||
      text.includes("incorrect api key") ||
      text.includes("invalid api key")
    ) {
      return "invalid_key";
    }
    if (
      error.status === 402 ||
      code === "insufficient_quota" ||
      text.includes("insufficient balance") ||
      (error.status === 429 &&
        (code.includes("quota") || text.includes("billing details")))
    ) {
      return "billing";
    }
    if (
      error.status === 429 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 529
    ) {
      return "timeout";
    }
  }
  return "failed";
}

function errorMessage(payload: Record<string, unknown>, fallback: string) {
  const error = payload.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message || fallback);
  }
  return fallback;
}

function errorCode(payload: Record<string, unknown>) {
  const error = payload.error;
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code || "");
  }
  return "";
}

function isRetryableProviderError(error: unknown) {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      /aborted due to timeout/i.test(error.message))
  ) {
    return true;
  }
  if (!(error instanceof ProviderError)) return false;
  return (
    error.status === 502 ||
    error.status === 503 ||
    error.status === 529 ||
    error.status === 429
  );
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeout = TIMEOUT_MS,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    signal: AbortSignal.timeout(timeout),
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      payload = { error: raw.slice(0, 240) };
    }
  }
  if (!response.ok) {
    throw new ProviderError(
      errorMessage(payload, "failed"),
      response.status,
      errorCode(payload),
      payload,
    );
  }
  return payload;
}

function jsonish(text: string) {
  return /"problems"\s*:|"promptTex"\s*:|"formula"\s*:/.test(text);
}

function failedGeneration(error: unknown) {
  if (!(error instanceof ProviderError) || !error.details) return "";
  const payload = error.details.error;
  if (!payload || typeof payload !== "object") return "";
  const text = (payload as { failed_generation?: unknown }).failed_generation;
  return typeof text === "string" ? text : "";
}

function openAiContent(payload: Record<string, unknown>) {
  const choices = payload.choices as
    | {
        message?: {
          content?: string | { text?: string }[] | null;
          reasoning_content?: string;
          reasoning?: string;
        };
      }[]
    | undefined;
  const message = choices?.[0]?.message;
  const content = message?.content;
  const contentText = Array.isArray(content)
    ? content.map((part) => part.text ?? "").join("")
    : typeof content === "string"
      ? content
      : "";
  const reasoning =
    (typeof message?.reasoning_content === "string"
      ? message.reasoning_content
      : "") ||
    (typeof message?.reasoning === "string" ? message.reasoning : "");
  if (jsonish(contentText)) return contentText;
  if (jsonish(reasoning)) return reasoning;
  return contentText.trim() || reasoning;
}

let groqModelsCache: { at: number; ids: string[] } | null = null;

async function listGroqModels(apiKey: string) {
  if (groqModelsCache && Date.now() - groqModelsCache.at < 10 * 60 * 1000) {
    return groqModelsCache.ids;
  }
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json()) as {
    data?: { id?: string }[];
  };
  if (!response.ok) {
    throw new ProviderError(
      errorMessage(payload as Record<string, unknown>, "failed"),
      response.status,
    );
  }
  const ids = (payload.data ?? []).map((item) => item.id ?? "").filter(Boolean);
  groqModelsCache = { at: Date.now(), ids };
  return ids;
}

function uniqueIds(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function isRequestTooLarge(error: unknown) {
  if (!(error instanceof ProviderError)) return false;
  if (error.status === 413) return true;
  return /too large|tokens per minute/i.test(error.message);
}

async function groqChatModels(preferred: string, apiKey: string) {
  const available = (await listGroqModels(apiKey)).filter(
    (id) => !GROQ_SKIP.test(id),
  );
  const ordered = uniqueIds([
    preferred,
    ...GROQ_CHAT_PREFERENCE,
    ...available,
  ]).filter((id) => available.includes(id));
  if (ordered.length === 0) {
    throw new ProviderError(
      "No Groq chat model is available for this key.",
      404,
    );
  }
  return ordered;
}

async function completeOpenAiCompat(
  url: string,
  apiKey: string,
  apiModel: string,
  prompt: string,
  options: {
    temperature?: number;
    jsonMode?: boolean;
    timeout?: number;
    maxTokens?: number;
    reasoningEffort?: string;
    reasoningFormat?: string;
    disableThinking?: boolean;
    enableThinking?: boolean;
    system?: string;
  } = {},
) {
  const body: Record<string, unknown> = {
    model: apiModel,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: [
      {
        role: "system",
        content: options.system ?? SCHOOL_SYSTEM,
      },
      { role: "user", content: prompt },
    ],
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.jsonMode) body.response_format = { type: "json_object" };
  if (options.reasoningEffort) body.reasoning_effort = options.reasoningEffort;
  if (options.reasoningFormat) body.reasoning_format = options.reasoningFormat;
  if (options.disableThinking) body.thinking = { type: "disabled" };
  if (options.enableThinking) {
    body.thinking = { type: "enabled" };
    if (!options.reasoningEffort) body.reasoning_effort = "high";
  }

  try {
    const payload = await postJson(
      url,
      { Authorization: `Bearer ${apiKey}` },
      body,
      options.timeout,
    );
    return openAiContent(payload);
  } catch (error) {
    const salvage = failedGeneration(error);
    if (jsonish(salvage)) return salvage;
    if (
      options.jsonMode &&
      !options.enableThinking &&
      !options.reasoningEffort &&
      error instanceof ProviderError &&
      error.status === 400
    ) {
      delete body.response_format;
      const payload = await postJson(
        url,
        { Authorization: `Bearer ${apiKey}` },
        body,
        options.timeout,
      );
      return openAiContent(payload);
    }
    throw error;
  }
}

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
  promptFeedback?: { blockReason?: string };
};

function geminiText(payload: GeminiResponse) {
  if (payload.promptFeedback?.blockReason) throw new Error("failed");
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

async function completeGemini(
  model: AiModelDef,
  input: ProposeInput,
  prompt: string,
) {
  const key = envValue("GEMINI_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.apiModel}:generateContent`;
  const freeThink = input.check === "plain";
  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    responseSchema:
      input.check === "verified" ? GEMINI_VERIFIED_SCHEMA : GEMINI_PLAIN_SCHEMA,
  };
  if (!/gemini-3/.test(model.apiModel)) {
    generationConfig.temperature = temperatureFor(input);
  }
  if (freeThink) {
    generationConfig.maxOutputTokens = CHAT_MAX_TOKENS;
    generationConfig.thinkingConfig = /gemini-3/.test(model.apiModel)
      ? { thinkingLevel: "HIGH", includeThoughts: false }
      : { thinkingBudget: 8192, includeThoughts: false };
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
    systemInstruction: {
      parts: [{ text: freeThink ? CHAT_SYSTEM : SCHOOL_SYSTEM }],
    },
  };

  try {
    const payload = (await postJson(
      url,
      { "x-goog-api-key": key },
      body,
      freeThink ? CHAT_TIMEOUT_MS : TIMEOUT_MS,
    )) as GeminiResponse;
    return geminiText(payload);
  } catch (error) {
    if (freeThink && error instanceof ProviderError && error.status === 400) {
      delete generationConfig.responseSchema;
      const payload = (await postJson(
        url,
        { "x-goog-api-key": key },
        { ...body, generationConfig },
        CHAT_TIMEOUT_MS,
      )) as GeminiResponse;
      return geminiText(payload);
    }
    throw error;
  }
}

function anthropicText(payload: Record<string, unknown>) {
  const content = payload.content as
    | { type?: string; text?: string }[]
    | undefined;
  return (content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();
}

async function completeAnthropic(
  model: AiModelDef,
  prompt: string,
  temperature: number,
  freeThink: boolean,
  systemOverride?: string,
) {
  const headers = {
    "x-api-key": envValue("ANTHROPIC_API_KEY"),
    "anthropic-version": "2023-06-01",
  };
  const messages = [{ role: "user", content: prompt }];
  const system = systemOverride ?? (freeThink ? CHAT_SYSTEM : SCHOOL_SYSTEM);

  const attempts: Record<string, unknown>[] = freeThink
    ? [
        {
          model: model.apiModel,
          max_tokens: 12000,
          temperature: 1,
          system,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          messages,
        },
        {
          model: model.apiModel,
          max_tokens: 12000,
          temperature: 1,
          system,
          thinking: { type: "enabled", budget_tokens: 6000 },
          messages,
        },
      ]
    : [
        {
          model: model.apiModel,
          max_tokens: 4096,
          temperature,
          system,
          messages,
        },
      ];

  let lastError: unknown = new Error("failed");
  for (const body of attempts) {
    try {
      const payload = await postJson(
        "https://api.anthropic.com/v1/messages",
        headers,
        body,
        freeThink ? CHAT_TIMEOUT_MS : TIMEOUT_MS,
      );
      return anthropicText(payload);
    } catch (error) {
      lastError = error;
      if (error instanceof ProviderError && error.status === 400) continue;
      throw error;
    }
  }

  if (!(lastError instanceof ProviderError) || lastError.status !== 400) {
    throw lastError;
  }

  const payload = await postJson(
    "https://api.anthropic.com/v1/messages",
    headers,
    {
      model: model.apiModel,
      max_tokens: freeThink ? CHAT_MAX_TOKENS : 4096,
      temperature: freeThink ? 1 : temperature,
      system,
      messages,
    },
    TIMEOUT_MS,
  );
  return anthropicText(payload);
}

async function completeCloudflare(
  model: AiModelDef,
  prompt: string,
  freeThink: boolean,
  systemOverride?: string,
) {
  const account = envValue("CLOUDFLARE_ACCOUNT_ID");
  const token = envValue("CLOUDFLARE_API_TOKEN");
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model.apiModel}`;
  const payload = await postJson(
    url,
    { Authorization: `Bearer ${token}` },
    {
      messages: [
        {
          role: "system",
          content: systemOverride ?? (freeThink ? CHAT_SYSTEM : SCHOOL_SYSTEM),
        },
        { role: "user", content: prompt },
      ],
    },
    freeThink ? CHAT_TIMEOUT_MS : TIMEOUT_MS,
  );
  const result = payload.result as { response?: string } | undefined;
  if (typeof result?.response === "string") return result.response;
  return openAiContent(payload);
}

async function completeGroq(
  model: AiModelDef,
  prompt: string,
  temperature: number,
  freeThink: boolean,
  systemOverride?: string,
) {
  const key = envValue("GROQ_API_KEY");
  const models = (await groqChatModels(model.apiModel, key)).slice(
    0,
    freeThink ? 1 : 2,
  );
  let lastError: unknown = new ProviderError(
    "No Groq chat model is available for this key.",
    404,
  );
  const timeout = freeThink ? 60_000 : TIMEOUT_MS;
  const system = systemOverride ?? (freeThink ? CHAT_SYSTEM : SCHOOL_SYSTEM);
  const efforts = freeThink
    ? (["high", "medium"] as const)
    : (["low"] as const);

  for (const apiModel of models) {
    const canReason = /gpt-oss|qwen/i.test(apiModel);
    for (const effort of canReason ? efforts : ([undefined] as const)) {
      try {
        const text = await completeOpenAiCompat(
          "https://api.groq.com/openai/v1/chat/completions",
          key,
          apiModel,
          prompt,
          {
            temperature: freeThink ? 1 : temperature,
            jsonMode: false,
            maxTokens: freeThink ? 3072 : 2048,
            timeout,
            system,
            ...(effort
              ? {
                  reasoningEffort: effort,
                  reasoningFormat: "hidden",
                }
              : {}),
          },
        );
        if (text.trim()) return text;
        lastError = new Error("bad_output");
      } catch (error) {
        lastError = error;
        const salvage = failedGeneration(error);
        if (salvage.trim()) return salvage;
        if (
          isRequestTooLarge(error) ||
          (error instanceof ProviderError &&
            (error.status === 400 || error.status === 429))
        ) {
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError;
}

const DEEPSEEK_JSON_TIMEOUT_MS = 60_000;

function deepseekSystem(input: ProposeInput) {
  return input.check === "plain" ? CHAT_SYSTEM : SCHOOL_SYSTEM;
}

async function completeDeepseek(
  model: AiModelDef,
  input: ProposeInput,
  prompt: string,
  temperature: number,
) {
  const key = envValue("DEEPSEEK_API_KEY");
  const url = "https://api.deepseek.com/chat/completions";
  const system = deepseekSystem(input);
  const freeThink = input.check === "plain";
  const reasoner = model.id === "deepseek-r1";

  const options = reasoner
    ? {
        jsonMode: false as const,
        timeout: CHAT_TIMEOUT_MS,
        maxTokens: 12_288,
        system,
      }
    : freeThink
      ? {
          temperature: 1,
          jsonMode: false as const,
          enableThinking: true,
          reasoningEffort: "high",
          timeout: CHAT_TIMEOUT_MS,
          maxTokens: 16_384,
          system,
        }
      : {
          temperature,
          jsonMode: true as const,
          disableThinking: true,
          timeout: DEEPSEEK_JSON_TIMEOUT_MS,
          maxTokens: 8192,
          system,
        };

  try {
    const text = await completeOpenAiCompat(
      url,
      key,
      model.apiModel,
      prompt,
      options,
    );
    if (text.trim()) return text;
    throw new Error("bad_output");
  } catch (error) {
    if (
      !freeThink ||
      reasoner ||
      !(error instanceof ProviderError) ||
      error.status !== 400
    ) {
      throw error;
    }
  }

  const text = await completeOpenAiCompat(url, key, model.apiModel, prompt, {
    temperature: 1,
    jsonMode: false,
    enableThinking: true,
    timeout: CHAT_TIMEOUT_MS,
    maxTokens: 16_384,
    system,
  });
  if (!text.trim()) throw new Error("bad_output");
  return text;
}

async function completeText(
  model: AiModelDef,
  input: ProposeInput,
  prompt: string,
) {
  const temperature = temperatureFor(input);
  const freeThink = input.check === "plain";
  const system = freeThink ? CHAT_SYSTEM : SCHOOL_SYSTEM;

  switch (model.provider) {
    case "gemini":
      return completeGemini(model, input, prompt);
    case "groq":
      return completeGroq(model, prompt, temperature, freeThink);
    case "deepseek":
      return completeDeepseek(model, input, prompt, temperature);
    case "openai":
      return completeOpenAiCompat(
        "https://api.openai.com/v1/chat/completions",
        envValue("OPENAI_API_KEY"),
        model.apiModel,
        prompt,
        {
          temperature: freeThink ? 1 : temperature,
          jsonMode: false,
          system,
          maxTokens: freeThink ? CHAT_MAX_TOKENS : DEFAULT_MAX_TOKENS,
          timeout: freeThink ? CHAT_TIMEOUT_MS : TIMEOUT_MS,
          ...(freeThink && /^(o[1-4]|gpt-5)/i.test(model.apiModel)
            ? { reasoningEffort: "high" }
            : {}),
        },
      );
    case "huggingface":
      return completeOpenAiCompat(
        "https://router.huggingface.co/v1/chat/completions",
        envValue("HF_TOKEN"),
        model.apiModel,
        prompt,
        {
          temperature,
          jsonMode: false,
          system,
          maxTokens: freeThink ? 4096 : 3072,
          timeout: freeThink ? CHAT_TIMEOUT_MS : TIMEOUT_MS,
        },
      );
    case "anthropic":
      return completeAnthropic(model, prompt, temperature, freeThink);
    case "cloudflare":
      return completeCloudflare(model, prompt, freeThink);
    default:
      throw new Error("failed");
  }
}

export async function proposeProblems(
  modelId: AiModelId,
  input: ProposeInput & { check: "verified" },
): Promise<VerifiedProblemDraft[]>;
export async function proposeProblems(
  modelId: AiModelId,
  input: ProposeInput & { check: "plain" },
): Promise<PlainProblemDraft[]>;
export async function proposeProblems(
  modelId: AiModelId,
  input: ProposeInput,
): Promise<VerifiedProblemDraft[] | PlainProblemDraft[]> {
  const model = getAiModel(modelId);
  if (!model) throw new Error("failed");

  const prompt =
    input.check === "plain"
      ? buildUncheckedChatPrompt(input)
      : buildProblemPrompt(input, {
          compact:
            model.provider === "deepseek" ||
            model.provider === "groq" ||
            model.provider === "huggingface" ||
            model.provider === "cloudflare",
        });
  const text = await completeText(model, input, prompt);
  return parseProblemPayload(text, input.check) as
    | VerifiedProblemDraft[]
    | PlainProblemDraft[];
}

const TEMPLATE_SYSTEM =
  "You convert every school math problem visible in the image or text into one JSON problem family. If the image shows multiple distinct tasks, emit one variants[] entry per task. Reply with a JSON object only.";
// "You convert one school math example into a reusable JSON problem family. Reply with a JSON object only.";

function buildTeacherChatPrompt(
  locale: Locale,
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
) {
  const language =
    locale === "ka" ? "Georgian" : locale === "ru" ? "Russian" : "English";
  const transcript = history
    .slice(-20)
    .map(
      (turn) =>
        `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`,
    )
    .join("\n\n");

  return [
    `Always reply in ${language}.`,
    "Focus on mathematics teaching, examples, explanations, and classroom help.",
    "Use ordinary readable formatting: paragraphs, numbered steps, and '-' bullet lists.",
    "Put every formula in LaTeX: inline in $...$ and display equations alone on a line in $$...$$.",
    "Example display line: $$\\log_2(x^2 + y^2 + 2) = 1 + \\log_2(x + y)$$",
    transcript ? `Conversation so far:\n${transcript}` : "",
    `Latest user message:\n${message.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function normalizeTeacherChatReply(text: string) {
  return text
    .replace(/^```[\s\S]*?\n([\s\S]*?)```$/m, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Gemini JSON completion with optional image parts (template import). */
export async function completeGeminiUserParts(options: {
  model: AiModelDef;
  prompt: string;
  image?: { mimeType: string; data: string };
  timeout?: number;
}): Promise<string> {
  const key = envValue("GEMINI_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model.apiModel}:generateContent`;
  const parts: Record<string, unknown>[] = [{ text: options.prompt }];
  if (options.image) {
    parts.push({
      inlineData: {
        mimeType: options.image.mimeType,
        data: options.image.data,
      },
    });
  }

  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    maxOutputTokens: CHAT_MAX_TOKENS,
  };
  if (!/gemini-3/.test(options.model.apiModel)) {
    generationConfig.temperature = 0.2;
  }

  const payload = (await postJson(
    url,
    { "x-goog-api-key": key },
    {
      contents: [{ role: "user", parts }],
      generationConfig,
      systemInstruction: { parts: [{ text: TEMPLATE_SYSTEM }] },
    },
    options.timeout ?? (options.image ? 90_000 : 60_000),
  )) as GeminiResponse;

  const text = geminiText(payload);
  if (!text.trim()) throw new Error("bad_output");
  return text;
}

export async function completeTeacherChatMessage(options: {
  modelId: AiModelId;
  locale: Locale;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}) {
  const model = getAiModel(options.modelId);
  if (!model) throw new Error("failed");

  const prompt = buildTeacherChatPrompt(
    options.locale,
    options.message,
    options.history,
  );
  switch (model.provider) {
    case "gemini": {
      const key = envValue("GEMINI_API_KEY");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.apiModel}:generateContent`;
      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: CHAT_MAX_TOKENS,
      };
      if (/gemini-3/.test(model.apiModel)) {
        generationConfig.thinkingConfig = {
          thinkingLevel: "MEDIUM",
          includeThoughts: false,
        };
      }
      const payload = (await postJson(
        url,
        { "x-goog-api-key": key },
        {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
          systemInstruction: {
            parts: [{ text: TEACHER_CHAT_SYSTEM }],
          },
        },
        CHAT_TIMEOUT_MS,
      )) as GeminiResponse;
      const text = normalizeTeacherChatReply(geminiText(payload));
      if (!text.trim()) throw new Error("bad_output");
      return text;
    }
    case "groq":
      return normalizeTeacherChatReply(
        await completeGroq(model, prompt, 1, true, TEACHER_CHAT_SYSTEM),
      );
    case "deepseek":
      return normalizeTeacherChatReply(
        await completeOpenAiCompat(
          "https://api.deepseek.com/chat/completions",
          envValue("DEEPSEEK_API_KEY"),
          model.apiModel,
          prompt,
          {
            temperature: 1,
            jsonMode: false,
            timeout: CHAT_TIMEOUT_MS,
            maxTokens: 8192,
            system: TEACHER_CHAT_SYSTEM,
            ...(model.id === "deepseek-r1" ? {} : { enableThinking: true }),
          },
        ),
      );
    case "openai":
      return normalizeTeacherChatReply(
        await completeOpenAiCompat(
          "https://api.openai.com/v1/chat/completions",
          envValue("OPENAI_API_KEY"),
          model.apiModel,
          prompt,
          {
            temperature: 1,
            jsonMode: false,
            system: TEACHER_CHAT_SYSTEM,
            maxTokens: CHAT_MAX_TOKENS,
            timeout: CHAT_TIMEOUT_MS,
            ...(/^(o[1-4]|gpt-5)/i.test(model.apiModel)
              ? { reasoningEffort: "high" }
              : {}),
          },
        ),
      );
    case "huggingface":
      return normalizeTeacherChatReply(
        await completeOpenAiCompat(
          "https://router.huggingface.co/v1/chat/completions",
          envValue("HF_TOKEN"),
          model.apiModel,
          prompt,
          {
            temperature: 1,
            jsonMode: false,
            system: TEACHER_CHAT_SYSTEM,
            maxTokens: 4096,
            timeout: CHAT_TIMEOUT_MS,
          },
        ),
      );
    case "anthropic":
      return normalizeTeacherChatReply(
        await completeAnthropic(model, prompt, 1, true, TEACHER_CHAT_SYSTEM),
      );
    case "cloudflare":
      return normalizeTeacherChatReply(
        await completeCloudflare(model, prompt, true, TEACHER_CHAT_SYSTEM),
      );
    default:
      throw new Error("failed");
  }
}

export type { AiCheckMode };