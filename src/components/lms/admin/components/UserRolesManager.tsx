"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";
import {
  listAdminUsersAction,
  updateAdminUserRoleAction,
  type ManagedUser,
  type RoleUpdateError,
} from "@/lib/actions/admin-users";

type UsersToolCopy = Dictionary["dashboard"]["teacher"]["admin"]["usersTool"];
type RoleFilter = "ALL" | UserRole;

const ROLE_CHIP: Record<UserRole, string> = {
  ADMIN: "bg-brass-tint text-brass-strong",
  TEACHER: "bg-navy/10 text-navy",
  STUDENT: "bg-sectionHeader text-ink",
  VISITOR: "bg-sectionHeader text-muted",
};

function applyRole(users: ManagedUser[], userId: string, role: UserRole): ManagedUser[] {
  const next = users.map((user) => (user.id === userId ? { ...user, role } : user));
  const adminCount = next.filter((user) => user.role === "ADMIN").length;
  return next.map((user) => ({
    ...user,
    isLastAdmin: user.role === "ADMIN" && adminCount <= 1,
  }));
}

export function UserRolesManager({ locale, copy }: { locale: Locale; copy: UsersToolCopy }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<Record<string, { tone: "ok" | "error"; text: string }>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await listAdminUsersAction(locale);
      if (cancelled) return;
      if (!result.success) {
        setLoadError(copy.errors.load);
        setUsers([]);
      } else {
        setLoadError(null);
        setUsers(result.data);
        setDrafts(Object.fromEntries(result.data.map((user) => [user.id, user.role])));
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, copy.errors.load]);

  const counts = useMemo(() => {
    const byRole = Object.fromEntries(USER_ROLES.map((role) => [role, 0])) as Record<UserRole, number>;
    for (const user of users) byRole[user.role] += 1;
    return byRole;
  }, [users]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (filter !== "ALL" && user.role !== filter) return false;
      if (!needle) return true;
      return user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
    });
  }, [users, query, filter]);

  async function saveRole(user: ManagedUser) {
    const next = drafts[user.id] ?? user.role;
    if (next === user.role || user.isSelf || savingId) return;
    if (user.isOwner && next !== "ADMIN") return;
    if (user.isLastAdmin && next !== "ADMIN") return;

    if (next === "ADMIN" || user.role === "ADMIN") {
      const confirmed = window.confirm(
        copy.confirmAdmin.replace("{name}", user.name).replace("{role}", copy.roles[next]),
      );
      if (!confirmed) return;
    }

    setNotice(null);
    setSavingId(user.id);
    setRowMessage((current) => {
      const rest = { ...current };
      delete rest[user.id];
      return rest;
    });

    const result = await updateAdminUserRoleAction(locale, user.id, next);
    if (result.success) {
      setUsers((current) => applyRole(current, user.id, next));
      setNotice(copy.saved);
      setRowMessage((current) => ({ ...current, [user.id]: { tone: "ok", text: copy.saved } }));
    } else {
      const code = result.error as RoleUpdateError;
      setDrafts((current) => ({ ...current, [user.id]: user.role }));
      setRowMessage((current) => ({
        ...current,
        [user.id]: { tone: "error", text: copy.errors[code] ?? copy.errors.failed },
      }));
    }
    setSavingId(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <Loader2 className="mb-2 size-6 animate-spin text-navy" />
        <span className="text-sm font-bold">{copy.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body">{copy.hint}</p>

      {loadError ? (
        <p role="alert" className="text-sm font-bold text-loss">
          {loadError}
        </p>
      ) : null}

      {notice ? (
        <p role="status" className="text-sm font-bold text-navy">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{copy.searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-box border border-hairline bg-searchInput py-2.5 pl-9 pr-3 text-sm font-medium text-searchInputText outline-none focus:border-navy"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={copy.allRoles}>
        <FilterButton selected={filter === "ALL"} onClick={() => setFilter("ALL")}>
          {`${copy.allRoles} (${users.length})`}
        </FilterButton>
        {USER_ROLES.map((role) => (
          <FilterButton key={role} selected={filter === role} onClick={() => setFilter(role)}>
            {`${copy.roles[role]} (${counts[role]})`}
          </FilterButton>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm font-bold text-muted">{copy.empty}</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((user) => {
            const draft = drafts[user.id] ?? user.role;
            const dirty = draft !== user.role;
            const locked = user.isSelf || (user.isOwner && draft !== "ADMIN") || (user.isLastAdmin && draft !== "ADMIN");
            const message = rowMessage[user.id];

            return (
              <li
                key={user.id}
                className="flex flex-col gap-3 rounded-box border border-hairline bg-main p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-ink">{user.name}</p>
                    <span className={`rounded-box px-2 py-0.5 text-[11px] font-bold ${ROLE_CHIP[user.role]}`}>
                      {copy.roles[user.role]}
                    </span>
                    {user.isSelf ? (
                      <span className="rounded-box bg-sectionHeader px-2 py-0.5 text-[11px] font-bold text-muted">{copy.you}</span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                  <p className="mt-1 text-xs text-body">
                    {user.coursesTaught} {copy.groups} · {user.enrollments} {copy.enrollments}
                  </p>
                  {user.isSelf ? <p className="mt-1 text-xs text-muted">{copy.selfLocked}</p> : null}
                  {user.isOwner && !user.isSelf ? <p className="mt-1 text-xs text-muted">{copy.ownerLocked}</p> : null}
                  {user.isLastAdmin && !user.isSelf && !user.isOwner ? (
                    <p className="mt-1 text-xs text-muted">{copy.lastAdminLocked}</p>
                  ) : null}
                  {message ? (
                    <p role="status" className={`mt-1 text-xs font-bold ${message.tone === "ok" ? "text-navy" : "text-loss"}`}>
                      {message.text}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${user.id}`}>
                    {copy.roleLabel.replace("{name}", user.name)}
                  </label>
                  <select
                    id={`role-${user.id}`}
                    value={draft}
                    disabled={user.isSelf || savingId === user.id}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!USER_ROLES.includes(value as UserRole)) return;
                      setNotice(null);
                      setDrafts((current) => ({ ...current, [user.id]: value as UserRole }));
                      setRowMessage((current) => {
                        if (!current[user.id]) return current;
                        const rest = { ...current };
                        delete rest[user.id];
                        return rest;
                      });
                    }}
                    className="w-full rounded-box border border-hairline bg-searchInput px-3 py-2 text-sm font-bold text-searchInputText outline-none focus:border-navy disabled:opacity-60 sm:w-44">
                    {USER_ROLES.map((role) => (
                      <option
                        key={role}
                        value={role}
                        disabled={(user.isOwner || user.isLastAdmin) && role !== "ADMIN" && role !== user.role}>
                        {copy.roles[role]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!dirty || locked || savingId === user.id}
                    onClick={() => void saveRole(user)}
                    className="inline-flex cursor-pointer items-center justify-center rounded-box bg-[#465D73] px-3 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] disabled:cursor-not-allowed disabled:opacity-40">
                    {savingId === user.id ? copy.saving : copy.save}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "cursor-pointer rounded-box px-3 py-1.5 text-xs font-bold transition-colors",
        selected ? "bg-mainButton text-mainText" : "border border-hairline bg-main text-body hover:bg-sectionHeader",
      ].join(" ")}>
      {children}
    </button>
  );
}
