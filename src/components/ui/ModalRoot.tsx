"use client";

import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { ReactNode } from "react";

type ModalRootProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

export function ModalRoot({ open, onClose, children, title }: ModalRootProps) {
  useLockBodyScroll(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-box border border-hairline bg-paper shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      >
        <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
        {title && (
          <div className="flex items-center justify-between border-b border-hairline bg-sectionHeader px-4 py-3">
            <h2 id="modal-title" className="text-lg font-bold text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-box text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98]"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}