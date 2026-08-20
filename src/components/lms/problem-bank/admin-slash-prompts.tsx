"use client";

import { useEffect, useId, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  createAdminChatPrompt,
  saveAdminChatPrompts,
  type AdminChatPrompt,
} from "@/lib/math/problems/admin-chat-prompts";
import type { ProblemBankCopy } from "@/lib/math/problems";

type SlashCopy = ProblemBankCopy["chat"]["slashPrompts"];

const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

export function AdminSlashPromptMenu({
  copy,
  items,
  activeIndex,
  onHover,
  onSelect,
}: {
  copy: SlashCopy;
  items: AdminChatPrompt[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (prompt: AdminChatPrompt) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label={copy.menuLabel}
      className="absolute bottom-full left-0 z-20 mb-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-hairline bg-white p-1.5 shadow-lg shadow-navy/10"
    >
      {items.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted">{copy.noMatches}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((prompt, index) => {
            const active = index === activeIndex;
            return (
              <li key={prompt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-navy-tint text-ink"
                      : "text-ink hover:bg-paper-deep"
                  }`}
                  onMouseEnter={() => onHover(index)}
                  onClick={() => onSelect(prompt)}
                >
                  <span className="font-semibold text-navy">/{prompt.name}</span>
                  <span className="line-clamp-2 text-xs text-muted">
                    {prompt.body}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminSlashPromptManager({
  copy,
  userId,
  prompts,
  onChange,
  onClose,
}: {
  copy: SlashCopy;
  userId: string;
  prompts: AdminChatPrompt[];
  onChange: (next: AdminChatPrompt[]) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function persist(next: AdminChatPrompt[]) {
    saveAdminChatPrompts(userId, next);
    onChange(next);
  }

  function onAdd() {
    const trimmedName = name.trim();
    const trimmedBody = body.trim();
    if (!trimmedName || !trimmedBody) {
      setError(copy.needBoth);
      return;
    }
    if (
      prompts.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      setError(copy.duplicate);
      return;
    }
    setError(null);
    persist([...prompts, createAdminChatPrompt(trimmedName, trimmedBody)]);
    setName("");
    setBody("");
  }

  function onRemove(id: string) {
    persist(prompts.filter((prompt) => prompt.id !== id));
  }

  return (
    <div className="rounded-2xl border border-navy/15 bg-navy-tint/25 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id={titleId} className="text-sm font-semibold text-ink">
            {copy.manageTitle}
          </h3>
          <p className="mt-1 text-xs text-body">{copy.manageHint}</p>
        </div>
        <button
          type="button"
          aria-label={copy.closeManage}
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto" aria-labelledby={titleId}>
        {prompts.length === 0 ? (
          <li className="rounded-xl border border-dashed border-hairline bg-white px-3 py-2 text-sm text-muted">
            {copy.empty}
          </li>
        ) : (
          prompts.map((prompt) => (
            <li
              key={prompt.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-hairline bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">
                  /{prompt.name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                  {prompt.body}
                </p>
              </div>
              <button
                type="button"
                aria-label={copy.remove}
                onClick={() => onRemove(prompt.id)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-paper-deep hover:text-ink"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="mt-3 space-y-2 border-t border-hairline-soft pt-3">
        <label className="block text-xs font-medium text-ink">
          {copy.nameLabel}
          <input
            className={`${fieldClass} mt-1`}
            value={name}
            maxLength={64}
            placeholder={copy.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-ink">
          {copy.bodyLabel}
          <textarea
            className={`${fieldClass} mt-1 min-h-[4.5rem]`}
            value={body}
            maxLength={4000}
            placeholder={copy.bodyPlaceholder}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        {error ? <p className="text-xs text-brass-strong">{error}</p> : null}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {copy.add}
        </button>
      </div>
    </div>
  );
}
