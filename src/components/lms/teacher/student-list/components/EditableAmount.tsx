'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  onSave: (value: number) => void;
  suffix?: string;
  placeholder?: string;
  className?: string;
}

export function EditableAmount({
  value,
  onSave,
  suffix = '₾',
  placeholder = '—',
  className = '',
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const justOpenedRef = useRef(false);

  // დრაფტის სინქრონიზაცია — მხოლოდ როცა არ ვრედაქტირებთ
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  // როცა editing = true — ფოკუსი + დროებითი დაცვა blur-ისგან
  useEffect(() => {
    if (!editing) return;

    justOpenedRef.current = true;
    inputRef.current?.focus();
    inputRef.current?.select();

    const t = setTimeout(() => {
      justOpenedRef.current = false;
    }, 200);

    return () => clearTimeout(t);
  }, [editing]);

  const commit = () => {
    const parsed = Number(draft.replace(/\s/g, ''));
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onSave(parsed);
    } else {
      setDraft(String(value));
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  const handleBlur = () => {
    // თუ input ახლახან გაიხსნა — blur-ს იგნორირება
    if (justOpenedRef.current) return;
    commit();
  };

  if (editing) {
    return (
      <span
        className="inline-flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          onBlur={handleBlur}
          inputMode="decimal"
          className="w-24 max-w-full rounded-lg border border-navy/40 bg-surface px-2 py-1.5 text-base font-bold text-ink outline-none focus:ring-2 focus:ring-navy/20 sm:py-1 sm:text-xs"
        />
        <span className="text-xs font-bold text-muted">{suffix}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing(true);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!editing) setEditing(true);
      }}
      title="დააწკაპუნეთ რედაქტირებისთვის"
      className={`group inline-flex max-w-full cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-bold text-ink transition hover:bg-navy-tint ${className}`}
    >
      <span className="truncate">{value > 0 ? `${value.toLocaleString('ka-GE')} ${suffix}` : placeholder}</span>
    </button>
  );
}