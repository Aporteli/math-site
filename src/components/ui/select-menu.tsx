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
  marked?: boolean;
  hint?: string;
}

export interface SelectHeading {
  heading: string;
}

export type SelectItem<T extends string = string> =
  | SelectOption<T>
  | SelectHeading;

interface SelectMenuProps<T extends string> {
  id?: string;
  name?: string;
  value: T;
  options: readonly SelectItem<T>[];
  onChange: (value: T) => void;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

const triggerBase =
  "flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm text-ink shadow-sm transition-colors hover:border-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/15 disabled:cursor-not-allowed disabled:opacity-60";

function isOption<T extends string>(
  item: SelectItem<T>,
): item is SelectOption<T> {
  return "value" in item;
}

function optionIndex<T extends string>(
  items: readonly SelectItem<T>[],
  value: T,
) {
  return items.findIndex((item) => isOption(item) && item.value === value);
}

function firstSelectable<T extends string>(items: readonly SelectItem<T>[]) {
  return items.findIndex(isOption);
}

function lastSelectable<T extends string>(items: readonly SelectItem<T>[]) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (isOption(items[i]!)) return i;
  }
  return -1;
}

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
    Math.max(0, optionIndex(options, value)),
  );
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listId = `${triggerId}-list`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const selected = options.find(
    (item) => isOption(item) && item.value === value,
  );
  const selectedIndex = optionIndex(options, value);

  useEffect(() => {
    if (!open) return;

    setActive(selectedIndex >= 0 ? selectedIndex : Math.max(0, firstSelectable(options)));

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, selectedIndex, options]);

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
      let next = current;
      for (let step = 0; step < options.length; step += 1) {
        next += delta;
        if (next < 0 || next >= options.length) return current;
        if (isOption(options[next]!)) return next;
      }
      return current;
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
      setActive(Math.max(0, firstSelectable(options)));
      if (!open) setOpen(true);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, lastSelectable(options)));
      if (!open) setOpen(true);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const item = options[active];
      if (item && isOption(item)) selectValue(item.value);
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
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected && isOption(selected) && selected.marked ? (
            <span
              className="size-1.5 shrink-0 rounded-full bg-brass"
              aria-hidden="true"
            />
          ) : null}
          <span className="min-w-0 truncate">
            {selected && isOption(selected) ? selected.label : ""}
          </span>
        </span>
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
          className="thin-scrollbar absolute z-50 mt-1.5 max-h-72 w-full min-w-full origin-top overflow-y-auto animate-dropdown rounded-2xl border border-hairline bg-white p-1.5 shadow-lg shadow-navy/5"
        >
          {options.map((item, index) => {
            if (!isOption(item)) {
              return (
                <li
                  key={`heading-${item.heading}-${index}`}
                  role="presentation"
                  className="px-3 pb-1 pt-2.5 text-sm font-bold text-ink first:pt-1"
                >
                  {item.heading}
                </li>
              );
            }

            const isSelected = item.value === value;
            const isActive = index === active;

            return (
              <li
                key={item.value || `empty-${index}`}
                ref={isActive ? activeRef : undefined}
                role="option"
                aria-selected={isSelected}
                aria-label={
                  item.hint ? `${item.label}. ${item.hint}` : undefined
                }
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectValue(item.value)}
                className={[
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isSelected
                    ? "bg-navy-tint font-semibold text-navy"
                    : isActive
                      ? "bg-paper text-navy"
                      : "text-body hover:bg-paper hover:text-navy",
                ].join(" ")}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {item.marked ? (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-brass"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="min-w-0 break-words">{item.label}</span>
                </span>
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
