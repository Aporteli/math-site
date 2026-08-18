import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  envValue,
  type AiProviderId,
} from "./ai-models";

const HINTS = path.join(process.cwd(), "data", "ai-wallet-hints.json");
const CACHE_MS = 2 * 60 * 1000;
const PROBE_MS = 8_000;

export type WalletKind = "free" | "paid";
export type WalletState =
  | "missing_key"
  | "invalid_key"
  | "ready"
  | "needs_billing"
  | "unknown";

export interface ModelWallet {
  kind: WalletKind;
  state: WalletState;
  currency?: string;
  balance?: string;
}

const PAID_PROVIDERS: ReadonlySet<AiProviderId> = new Set([
  "deepseek",
  "openai",
  "anthropic",
]);

type HintMap = Partial<Record<AiProviderId, WalletState>>;

let cache: { at: number; byProvider: Record<AiProviderId, ModelWallet> } | null =
  null;

function kindFor(provider: AiProviderId): WalletKind {
  return PAID_PROVIDERS.has(provider) ? "paid" : "free";
}

function missing(provider: AiProviderId): ModelWallet {
  return { kind: kindFor(provider), state: "missing_key" };
}

function invalid(provider: AiProviderId): ModelWallet {
  return { kind: kindFor(provider), state: "invalid_key" };
}

async function getJson(
  url: string,
  headers: Record<string, string>,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(PROBE_MS),
    cache: "no-store",
  });
  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }
  return { status: response.status, payload };
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    signal: AbortSignal.timeout(PROBE_MS),
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }
  return { status: response.status, payload };
}

function errorText(payload: Record<string, unknown>) {
  const error = payload.error;
  if (typeof error === "string") return error.toLowerCase();
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message ?? "").toLowerCase();
  }
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code ?? "").toLowerCase();
  }
  return "";
}

function looksEmptyWallet(status: number, payload: Record<string, unknown>) {
  const text = errorText(payload);
  return (
    status === 402 ||
    text.includes("insufficient") ||
    text.includes("credit") ||
    text.includes("balance") ||
    text.includes("quota") ||
    text.includes("billing")
  );
}

function looksBadKey(status: number, payload: Record<string, unknown>) {
  const text = errorText(payload);
  return (
    status === 401 ||
    text.includes("invalid api key") ||
    text.includes("incorrect api key") ||
    text.includes("authentication") ||
    text.includes("api key not valid")
  );
}

async function readHints(): Promise<HintMap> {
  try {
    const raw = await readFile(HINTS, "utf8");
    const parsed = JSON.parse(raw) as HintMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeHints(hints: HintMap) {
  await mkdir(path.dirname(HINTS), { recursive: true });
  await writeFile(HINTS, `${JSON.stringify(hints, null, 2)}\n`, "utf8");
}

export async function rememberProviderWallet(
  provider: AiProviderId,
  state: "needs_billing" | "ready",
) {
  const hints = await readHints();
  if (state === "ready") delete hints[provider];
  else hints[provider] = "needs_billing";
  await writeHints(hints);
  cache = null;
}

function applyHint(wallet: ModelWallet, hint: WalletState | undefined) {
  if (hint === "needs_billing" && wallet.state === "unknown") {
    return { ...wallet, state: "needs_billing" as const };
  }
  return wallet;
}

function formatAmount(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

async function probeDeepseek(key: string): Promise<ModelWallet> {
  const { status, payload } = await getJson(
    "https://api.deepseek.com/user/balance",
    { Authorization: `Bearer ${key}` },
  );
  if (looksBadKey(status, payload)) return invalid("deepseek");
  if (status !== 200) {
    return looksEmptyWallet(status, payload)
      ? { kind: "paid", state: "needs_billing" }
      : { kind: "paid", state: "unknown" };
  }

  const infos = (payload.balance_infos as
    | {
        currency?: string;
        total_balance?: string;
      }[]
    | undefined) ?? [];
  const row =
    infos.find((item) => item.currency === "USD") ??
    infos.find((item) => item.currency === "CNY") ??
    infos[0];
  const balance = formatAmount(row?.total_balance);
  const available = payload.is_available === true && Number(balance) > 0;
  return {
    kind: "paid",
    state: available ? "ready" : "needs_billing",
    currency: row?.currency || "USD",
    balance: balance || "0.00",
  };
}

async function probeOpenAi(key: string): Promise<ModelWallet> {
  for (const url of [
    "https://api.openai.com/v1/dashboard/billing/credit_grants",
    "https://api.openai.com/dashboard/billing/credit_grants",
  ]) {
    const { status, payload } = await getJson(url, {
      Authorization: `Bearer ${key}`,
    });
    if (looksBadKey(status, payload)) return invalid("openai");
    if (status === 200) {
      const available = formatAmount(
        payload.total_available ?? payload.total_granted,
      );
      if (available) {
        return Number(available) > 0
          ? {
              kind: "paid",
              state: "ready",
              currency: "USD",
              balance: available,
            }
          : {
              kind: "paid",
              state: "needs_billing",
              currency: "USD",
              balance: "0.00",
            };
      }
    }
  }

  const ping = await postJson(
    "https://api.openai.com/v1/chat/completions",
    { Authorization: `Bearer ${key}` },
    {
      model: "gpt-4o-mini",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    },
  );
  if (looksBadKey(ping.status, ping.payload)) return invalid("openai");
  if (looksEmptyWallet(ping.status, ping.payload)) {
    return { kind: "paid", state: "needs_billing" };
  }
  if (ping.status >= 200 && ping.status < 300) {
    return { kind: "paid", state: "ready" };
  }
  return { kind: "paid", state: "unknown" };
}

async function probeAnthropic(key: string): Promise<ModelWallet> {
  const { status, payload } = await getJson(
    "https://api.anthropic.com/v1/models",
    {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
  );
  if (looksBadKey(status, payload)) return invalid("anthropic");
  if (looksEmptyWallet(status, payload)) {
    return { kind: "paid", state: "needs_billing" };
  }
  if (status >= 200 && status < 300) return { kind: "paid", state: "unknown" };
  return { kind: "paid", state: "unknown" };
}

async function probeGemini(key: string): Promise<ModelWallet> {
  const { status, payload } = await getJson(
    "https://generativelanguage.googleapis.com/v1beta/models",
    { "x-goog-api-key": key },
  );
  if (looksBadKey(status, payload)) return invalid("gemini");
  if (status >= 200 && status < 300) return { kind: "free", state: "ready" };
  return { kind: "free", state: "unknown" };
}

async function probeGroq(key: string): Promise<ModelWallet> {
  const { status, payload } = await getJson(
    "https://api.groq.com/openai/v1/models",
    { Authorization: `Bearer ${key}` },
  );
  if (looksBadKey(status, payload)) return invalid("groq");
  if (status >= 200 && status < 300) return { kind: "free", state: "ready" };
  return { kind: "free", state: "unknown" };
}

async function probeHuggingFace(key: string): Promise<ModelWallet> {
  const { status, payload } = await getJson(
    "https://huggingface.co/api/whoami-v2",
    { Authorization: `Bearer ${key}` },
  );
  if (looksBadKey(status, payload) || status === 401) return invalid("huggingface");
  if (status >= 200 && status < 300) return { kind: "free", state: "ready" };
  return { kind: "free", state: "unknown" };
}

async function probeCloudflare(
  account: string,
  token: string,
): Promise<ModelWallet> {
  const { status, payload } = await getJson(
    "https://api.cloudflare.com/client/v4/user/tokens/verify",
    { Authorization: `Bearer ${token}` },
  );
  if (looksBadKey(status, payload) || payload.success === false) {
    return invalid("cloudflare");
  }
  if (status >= 200 && status < 300 && account) {
    return { kind: "free", state: "ready" };
  }
  return { kind: "free", state: "unknown" };
}

async function probeProvider(provider: AiProviderId): Promise<ModelWallet> {
  try {
    switch (provider) {
      case "deepseek": {
        const key = envValue("DEEPSEEK_API_KEY");
        return key ? await probeDeepseek(key) : missing(provider);
      }
      case "openai": {
        const key = envValue("OPENAI_API_KEY");
        return key ? await probeOpenAi(key) : missing(provider);
      }
      case "anthropic": {
        const key = envValue("ANTHROPIC_API_KEY");
        return key ? await probeAnthropic(key) : missing(provider);
      }
      case "gemini": {
        const key = envValue("GEMINI_API_KEY");
        return key ? await probeGemini(key) : missing(provider);
      }
      case "groq": {
        const key = envValue("GROQ_API_KEY");
        return key ? await probeGroq(key) : missing(provider);
      }
      case "huggingface": {
        const key = envValue("HF_TOKEN");
        return key ? await probeHuggingFace(key) : missing(provider);
      }
      case "cloudflare": {
        const account = envValue("CLOUDFLARE_ACCOUNT_ID");
        const token = envValue("CLOUDFLARE_API_TOKEN");
        if (!account || !token) return missing(provider);
        return probeCloudflare(account, token);
      }
      default:
        return missing(provider);
    }
  } catch {
    return { kind: kindFor(provider), state: "unknown" };
  }
}

const PROVIDERS: AiProviderId[] = [
  "gemini",
  "groq",
  "deepseek",
  "openai",
  "huggingface",
  "anthropic",
  "cloudflare",
];

export async function listProviderWallets(): Promise<
  Record<AiProviderId, ModelWallet>
> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.byProvider;

  const hints = await readHints();
  const entries = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const wallet = applyHint(await probeProvider(provider), hints[provider]);
      return [provider, wallet] as const;
    }),
  );
  const byProvider = Object.fromEntries(entries) as Record<
    AiProviderId,
    ModelWallet
  >;
  cache = { at: Date.now(), byProvider };
  return byProvider;
}
