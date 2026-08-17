import { aiProblemsResponseSchema, GEMINI_PROBLEM_SCHEMA } from "./ai-schema";
import type { AiProblemDraft } from "./ai-schema";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  error?: { message?: string };
  promptFeedback?: { blockReason?: string };
};

function apiKey() {
  return process.env.GEMINI_API_KEY?.trim() || "";
}

export function hasGeminiKey() {
  return apiKey().length > 0;
}

function modelName() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function extractText(payload: GeminiResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function parseJsonPayload(text: string) {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(stripped) as unknown;
}

export async function proposeProblemsWithGemini(input: {
  request: string;
  topic: string;
  difficulty: string;
  year: string;
  count: number;
}): Promise<AiProblemDraft[]> {
  const key = apiKey();
  if (!key) throw new Error("missing_key");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName()}:generateContent`;
  const ask = Math.min(12, input.count + 3);

  const prompt = [
    "Design school mathematics problems.",
    `Topic: ${input.topic}. Year group: ${input.year}. Difficulty: ${input.difficulty}.`,
    `Teacher request: ${input.request}`,
    `Return exactly ${ask} problems, each a DIFFERENT kind.`,
    "promptTex must be KaTeX-friendly LaTeX containing the maths only — no English, Georgian, or Russian sentences.",
    "promptTemplate is the same as promptTex but every variable's number is replaced by {{name}}, e.g. {{ax}}.",
    "formula must be a math.js expression using the variable names that evaluates to ONE real number (the answer).",
    "Do not put the answer in promptTex or formula. Do not include an answer field.",
    "Use classroom-friendly integers (typically -20 to 20). Choose values so the answer is an integer or a simple fraction.",
    "Allowed in formula: + - * / ^ sqrt abs hypot sin cos tan log exp min max and the listed variable names.",
    "instructionId must be one of: solve, evaluate, findDerivative, percentOf, missingSide, expand.",
  ].join("\n");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: GEMINI_PROBLEM_SCHEMA,
      },
    }),
  });

  const payload = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "failed");
  }
  if (payload.promptFeedback?.blockReason) {
    throw new Error("failed");
  }

  const text = extractText(payload);
  if (!text) throw new Error("failed");

  const parsed = aiProblemsResponseSchema.safeParse(parseJsonPayload(text));
  if (!parsed.success) throw new Error("failed");

  return parsed.data.problems;
}
