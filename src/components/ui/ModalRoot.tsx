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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-lg"
      >
        {title && (
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
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