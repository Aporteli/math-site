"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  FlaskConical,
  Library,
  MessageSquare,
  MoreVertical,
  PenLine,
  Plus,
  Save,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import type { BankProblem, ProblemBankCopy } from "@/lib/math/problems";

interface ProblemCardMenuProps {
  problem: BankProblem;
  copy: ProblemBankCopy;
  inSet: boolean;
  inLab?: boolean;
  showSendToLab?: boolean;
  showSaveToLab?: boolean;
  showGenerateVariants?: boolean;
  canGenerateVariants?: boolean;
  onEdit: (problem: BankProblem) => void;
  onAskAi: (problem: BankProblem) => void;
  onCopyPrompt: (problem: BankProblem) => void;
  onToggleSet: (problem: BankProblem) => void;
  onSendToLab?: (problem: BankProblem) => void;
  onSaveToLab?: (problem: BankProblem) => void;
  onSaveToBank?: (problem: BankProblem) => void;
  onRemoveFromLab?: (problem: BankProblem) => void;
  onGenerateVariants?: (problem: BankProblem) => void;
  onDiscard: (problem: BankProblem) => void;
}

export function ProblemCardMenu({
  problem,
  copy,
  inSet,
  inLab = false,
  showSendToLab = false,
  showSaveToLab = false,
  showGenerateVariants = false,
  canGenerateVariants = false,
  onEdit,
  onAskAi,
  onCopyPrompt,
  onToggleSet,
  onSendToLab,
  onSaveToLab,
  onSaveToBank,
  onRemoveFromLab,
  onGenerateVariants,
  onDiscard,
}: ProblemCardMenuProps) {
  const menu = copy.cardMenu;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 200;
      const menuHeight = menuRef.current?.offsetHeight ?? 240;
      const gap = 6;
      const padding = 8;

      let top = rect.bottom + gap;
      let left = rect.right - menuWidth;

      if (left < padding) left = padding;
      if (left + menuWidth > window.innerWidth - padding) {
        left = Math.max(padding, window.innerWidth - menuWidth - padding);
      }
      if (top + menuHeight > window.innerHeight - padding) {
        top = Math.max(padding, rect.top - menuHeight - gap);
      }

      setCoords({ top, left });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  const items = [
    {
      id: "edit",
      label: menu.edit,
      icon: PenLine,
      onClick: () => run(() => onEdit(problem)),
    },
    {
      id: "ask-ai",
      label: menu.askAi,
      icon: MessageSquare,
      onClick: () => run(() => onAskAi(problem)),
    },
    {
      id: "copy",
      label: menu.copyPrompt,
      icon: Copy,
      onClick: () => run(() => onCopyPrompt(problem)),
    },
    {
      id: "set",
      label: inSet ? copy.removeFromSet : copy.addToSet,
      icon: inSet ? X : Plus,
      onClick: () => run(() => onToggleSet(problem)),
    },
    {
      id: "discard",
      label:
        problem.source === "bank" ? copy.generate.remove : copy.generate.discard,
      icon: Trash2,
      danger: true,
      onClick: () => run(() => onDiscard(problem)),
    },
  ];

  return (
    <div ref={rootRef} className="absolute top-2 right-2 z-10">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={menu.open}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-hairline bg-white text-muted shadow-sm transition-colors hover:border-navy/30 hover:text-navy"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={menuRef}
              id={menuId}
              role="menu"
              style={
                coords
                  ? { top: coords.top, left: coords.left }
                  : { top: 0, left: 0, visibility: "hidden" as const }
              }
              className="fixed z-[80] min-w-[12.5rem] origin-top-right animate-dropdown rounded-2xl border border-hairline bg-white p-1.5 shadow-lg shadow-navy/5"
              onClick={(event) => event.stopPropagation()}
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className={[
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        item.danger
                          ? "text-brass-strong hover:bg-brass-tint/50"
                          : "text-body hover:bg-paper hover:text-navy",
                      ].join(" ")}
                      onClick={item.onClick}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
