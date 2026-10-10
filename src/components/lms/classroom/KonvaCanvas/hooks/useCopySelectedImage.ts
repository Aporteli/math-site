import { useEffect } from 'react';
import type { CanvasElement } from '../utils/types';

export function useCopySelectedImage(disabled: boolean, selectedImage: CanvasElement | null) {
  useEffect(() => {
    if (disabled) return;
    const onCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const src = selectedImage?.src;
      if (!src) return;
      e.preventDefault();
      void (async () => {
        const res = await fetch(src);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
      })();
    };
    window.addEventListener('copy', onCopy);
    return () => window.removeEventListener('copy', onCopy);
  }, [disabled, selectedImage]);
}
