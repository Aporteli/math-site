import type { UserRole } from "@/lib/auth/roles";

type SlashPromptUser = {
  id?: string | null;
  role?: UserRole | string | null;
  email?: string | null;
};

function ownerEmails(): string[] {
  const fromEnv = (process.env.SLASH_PROMPTS_OWNER_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  // Local demo: site owner usually logs in as teacher@ — not ADMIN.
  if (process.env.NODE_ENV !== "production") {
    return ["teacher@mathlab.ge", "admin@mathlab.ge"];
  }
  return [];
}

/** ADMIN always; optional email allowlist; in non-production also demo teacher/admin. */
export function canUseAdminSlashPrompts(user: SlashPromptUser | null | undefined): {
  enabled: boolean;
  storageKey: string;
} {
  if (!user) return { enabled: false, storageKey: "" };

  const email = user.email?.trim().toLowerCase() ?? "";
  const enabled =
    user.role === "ADMIN" ||
    (email.length > 0 && ownerEmails().includes(email));

  if (!enabled) return { enabled: false, storageKey: "" };

  const storageKey = (user.id?.trim() || email || "owner").slice(0, 128);
  return { enabled: true, storageKey };
}
