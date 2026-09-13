import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  AI_MODELS,
  dailyLimitFor,
  isModelConfigured,
  type AiModelId,
  type AiProviderId,
} from "./ai-models";
import { listProviderWallets, type ModelWallet } from "./ai-billing";

// Vercel Serverless (Read-Only) გარემოში იყენებს /tmp დირექტორიას, ლოკალზე process.cwd()/data-ს
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "data")
  : path.join(process.cwd(), "data");

const STORE = path.join(DATA_DIR, "ai-usage.json");

type UsageFile = {
  day: string;
  used: Record<string, number>;
};

export interface AiModelStatus {
  id: AiModelId;
  provider: AiProviderId;
  configured: boolean;
  used: number;
  limit: number;
  remaining: number;
  wallet: ModelWallet;
}

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

async function readStore(): Promise<UsageFile> {
  const day = utcDay();
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as UsageFile;
    if (parsed.day === day && parsed.used && typeof parsed.used === "object") {
      return parsed;
    }
  } catch {
    // ფაილის არარსებობისას იწყებს ახალ დღეს
  }
  return { day, used: {} };
}

async function writeStore(store: UsageFile) {
  try {
    await mkdir(path.dirname(STORE), { recursive: true });
    await writeFile(STORE, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  } catch (error) {
    console.error("AI_USAGE_WRITE_ERROR:", error);
  }
}

export async function listAiModelStatus(): Promise<AiModelStatus[]> {
  const [store, wallets] = await Promise.all([
    readStore(),
    listProviderWallets(),
  ]);
  return AI_MODELS.map((model) => {
    const limit = dailyLimitFor(model);
    const used = store.used[model.id] ?? 0;
    const configured = isModelConfigured(model);
    return {
      id: model.id,
      provider: model.provider,
      configured,
      used,
      limit,
      remaining: limit === 0 ? 0 : Math.max(0, limit - used),
      wallet: wallets[model.provider],
    };
  });
}

export async function assertModelAvailable(id: AiModelId) {
  const model = AI_MODELS.find((entry) => entry.id === id);
  if (!model) throw new Error("failed");
  if (!isModelConfigured(model)) throw new Error("missing_key");

  const status = (await listAiModelStatus()).find((entry) => entry.id === id);
  if (!status) throw new Error("failed");
  if (status.limit > 0 && status.remaining <= 0) {
    throw new Error("limit_exceeded");
  }
}

export async function recordModelUse(id: AiModelId) {
  const store = await readStore();
  store.used[id] = (store.used[id] ?? 0) + 1;
  await writeStore(store);
}