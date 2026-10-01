'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

interface HeaderToolsMenuProps {
  label: string;
  children: ReactNode;
}

export function HeaderToolsMenu({ label, children }: HeaderToolsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={[
          'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-mainButton px-3 text-sm font-bold transition',
          open
            ? 'border-mainButton/40 bg-mainButton text-mainText'
            : 'text-mainText hover:border-mainButton hover:bg-mainButtonHover hover:text-mainText',
        ].join(' ')}>
        <SlidersHorizontal className="size-4 shrink-0" aria-hidden="true" />
        <ChevronDown
          className={`size-3.5 text-muted transition-transform ${open ? 'rotate-180 text-navy' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 flex w-max items-center gap-1 rounded-box border border-hairline bg-main p-1.5 shadow-lg  origin-top-right animate-dropdown">
          {children}
        </div>
      ) : null}
    </div>
  );
}
