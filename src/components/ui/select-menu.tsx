"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectMenuProps<T extends string> {
  id?: string;
  name?: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

const triggerBase =
  "flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm text-ink shadow-sm transition-colors hover:border-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/15 disabled:cursor-not-allowed disabled:opacity-60";

export function SelectMenu<T extends string>({
  id,
  name,
  value,
  options,
  onChange,
  className = "",
  triggerClassName = "",
  disabled = false,
  invalid = false,
  describedBy,
}: SelectMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listId = `${triggerId}-list`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const selected = options.find((option) => option.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    setActive(selectedIndex >= 0 ? selectedIndex : 0);

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function selectValue(next: T) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveActive(delta: number) {
    setActive((current) => {
      const last = options.length - 1;
      if (last < 0) return 0;
      return Math.min(last, Math.max(0, current + delta));
    });
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
      if (!open) setOpen(true);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, options.length - 1));
      if (!open) setOpen(true);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const option = options[active];
      if (option) selectValue(option.value);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${open ? "z-50" : ""} ${className}`}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        onKeyDown={onTriggerKeyDown}
        className={[
          triggerBase,
          invalid
            ? "border-brass focus-visible:border-navy/40"
            : open
              ? "border-navy/40"
              : "border-hairline focus-visible:border-navy/40",
          triggerClassName,
        ].join(" ")}
      >
        <span className="min-w-0 truncate">{selected?.label ?? ""}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted transition-transform ${
            open ? "rotate-180 text-navy" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          className="thin-scrollbar absolute z-50 mt-1.5 max-h-60 w-full min-w-full origin-top overflow-y-auto animate-dropdown rounded-2xl border border-hairline bg-white p-1.5 shadow-lg shadow-navy/5"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === active;

            return (
              <li
                key={option.value || `empty-${index}`}
                ref={isActive ? activeRef : undefined}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectValue(option.value)}
                className={[
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isSelected
                    ? "bg-navy-tint font-semibold text-navy"
                    : isActive
                      ? "bg-paper text-navy"
                      : "text-body hover:bg-paper hover:text-navy",
                ].join(" ")}
              >
                <span className="min-w-0 break-words">{option.label}</span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-brass" aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
