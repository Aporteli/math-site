"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { findBracketPlaceholders } from "@/lib/math/problems/slash-prompt-placeholders";
import type { ProblemBankCopy } from "@/lib/math/problems";

type SlashCopy = ProblemBankCopy["chat"]["slashPrompts"];

/** Scroll a textarea so character `offset` is near the vertical middle of the view. */
function scrollTextareaToOffset(el: HTMLTextAreaElement, offset: number) {
  const style = window.getComputedStyle(el);
  const mirror = document.createElement("div");

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.width = `${el.clientWidth}px`;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.font = style.font;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.wordSpacing = style.wordSpacing;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.textAlign = style.textAlign;
  mirror.style.textTransform = style.textTransform;
  mirror.style.textIndent = style.textIndent;
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.wordBreak = style.wordBreak;

  const before = document.createTextNode(el.value.slice(0, offset));
  const marker = document.createElement("span");
  marker.textContent = el.value.slice(offset, offset + 1) || ".";
  mirror.appendChild(before);
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const markerTop = marker.offsetTop;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  document.body.removeChild(mirror);

  const target =
    markerTop - el.clientHeight / 2 + paddingTop + marker.offsetHeight / 2;
  el.scrollTop = Math.max(0, Math.min(target, el.scrollHeight - el.clientHeight));
}

function focusBracketSlot(
  node: HTMLTextAreaElement,
  slot: { start: number; end: number } | null | undefined,
) {
  node.focus({ preventScroll: true });
  if (slot) {
    node.setSelectionRange(slot.start, slot.end);
    scrollTextareaToOffset(node, slot.start);
  } else {
    node.setSelectionRange(0, 0);
    node.scrollTop = 0;
  }
}

export function AdminSlashPromptFillModal({
  copy,
  title,
  initialBody,
  onConfirm,
  onCancel,
}: {
  copy: SlashCopy;
  title: string;
  initialBody: string;
  onConfirm: (filled: string) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(initialBody);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Run after the portal textarea exists in the DOM.
  useLayoutEffect(() => {
    if (!mounted) return;
    const node = textareaRef.current;
    if (!node) return;

    const first = findBracketPlaceholders(initialBody)[0] ?? null;
    focusBracketSlot(node, first);

    // Some browsers clear selection on the first paint — re-apply once.
    const id = window.requestAnimationFrame(() => {
      focusBracketSlot(node, first);
    });
    return () => window.cancelAnimationFrame(id);
  }, [mounted, initialBody]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      // Capture Tab even if focus briefly left the textarea.
      if (event.key !== "Tab") return;
      const node = textareaRef.current;
      if (!node) return;
      event.preventDefault();
      event.stopPropagation();

      const value = node.value;
      const slots = findBracketPlaceholders(value);
      if (slots.length === 0) {
        node.focus();
        return;
      }

      const { selectionStart, selectionEnd } = node;
      let idx = slots.findIndex(
        (slot) =>
          selectionStart >= slot.start && selectionStart <= slot.end,
      );
      if (idx < 0) {
        idx = slots.findIndex((slot) => slot.start >= selectionEnd);
        if (idx < 0) idx = slots.length - 1;
        else if (!event.shiftKey) {
          focusBracketSlot(node, slots[idx]);
          return;
        }
      }

      const nextIdx = event.shiftKey
        ? (idx - 1 + slots.length) % slots.length
        : (idx + 1) % slots.length;
      focusBracketSlot(node, slots[nextIdx]);
    }

    window.addEventListener("keydown", onKey, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onConfirm(event.currentTarget.value);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-3 sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-label={copy.fillCancel}
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-xl shadow-navy/10"
        style={{ height: "min(300px, calc(100vh - 2rem))" }}
      >
        <div className="flex items-start justify-between gap-2 border-b border-hairline-soft px-4 py-3">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="truncate text-sm font-semibold text-ink"
            >
              {copy.fillTitle}
              {title ? (
                <span className="font-normal text-muted"> · /{title}</span>
              ) : null}
            </h3>
            <p className="mt-0.5 text-xs text-muted">{copy.fillHint}</p>
          </div>
          <button
            type="button"
            tabIndex={-1}
            aria-label={copy.fillCancel}
            onClick={onCancel}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-paper-deep hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          autoFocus
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          className="min-h-0 flex-1 resize-none border-0 bg-paper px-4 py-3 font-sans text-sm leading-relaxed text-ink outline-none focus:ring-0"
          spellCheck={false}
        />

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline-soft px-4 py-3">
          <button
            type="button"
            tabIndex={-1}
            onClick={onCancel}
            className="rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-semibold text-body hover:border-navy/30 hover:text-navy"
          >
            {copy.fillCancel}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onConfirm(text)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
          >
            <Check className="size-3.5" aria-hidden="true" />
            {copy.fillInsert}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
