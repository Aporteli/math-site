'use client';

import { useEffect } from 'react';

export function useAssignPaste(isOpen: boolean, addFiles: (files: File[]) => Promise<void>) {
  useEffect(() => {
    if (!isOpen) return;

    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        const hasImage = Array.from(e.clipboardData?.items ?? []).some((item) => item.type.startsWith('image/'));
        if (!hasImage) return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void addFiles(files);
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isOpen, addFiles]);
}
