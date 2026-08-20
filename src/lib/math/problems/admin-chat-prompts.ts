export type AdminChatPrompt = {
  id: string;
  name: string;
  body: string;
};

const STORAGE_PREFIX = "math-site.admin-chat-prompts.";

export function adminChatPromptsStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadAdminChatPrompts(userId: string): AdminChatPrompt[] {
  if (!userId || !canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(adminChatPromptsStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is AdminChatPrompt =>
          !!item &&
          typeof item === "object" &&
          typeof (item as AdminChatPrompt).id === "string" &&
          typeof (item as AdminChatPrompt).name === "string" &&
          typeof (item as AdminChatPrompt).body === "string",
      )
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        body: item.body,
      }))
      .filter((item) => item.name.length > 0);
  } catch {
    return [];
  }
}

export function saveAdminChatPrompts(
  userId: string,
  prompts: AdminChatPrompt[],
): void {
  if (!userId || !canUseStorage()) return;
  localStorage.setItem(
    adminChatPromptsStorageKey(userId),
    JSON.stringify(prompts),
  );
}

export function createAdminChatPrompt(
  name: string,
  body: string,
): AdminChatPrompt {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: name.trim(),
    body,
  };
}

/** Active `/query` token ending at the caret. */
export function findSlashToken(
  textBeforeCursor: string,
): { start: number; query: string } | null {
  const match = /(^|\s)\/([^\s]*)$/.exec(textBeforeCursor);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[1]!.length;
  return { start, query: match[2] ?? "" };
}

export function filterAdminChatPrompts(
  prompts: AdminChatPrompt[],
  query: string,
): AdminChatPrompt[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return prompts;
  return prompts.filter((prompt) =>
    prompt.name.toLowerCase().startsWith(needle),
  );
}

export function insertSlashPrompt(
  full: string,
  cursor: number,
  tokenStart: number,
  body: string,
): { text: string; cursor: number } {
  const text = full.slice(0, tokenStart) + body + full.slice(cursor);
  return { text, cursor: tokenStart + body.length };
}
