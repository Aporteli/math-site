export const USER_ROLES = ["ADMIN", "TEACHER", "STUDENT", "VISITOR"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    USER_ROLES.includes(value as UserRole)
  );
}

/** Comma-separated owner emails configured only in the deployment environment. */
export function isOwnerEmail(email: string | null | undefined) {
  if (!email) return false;

  const owners = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return owners.includes(email.trim().toLowerCase());
}



