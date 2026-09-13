'use client';

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';

interface Options {
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  handleElementsChange: (elems: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  setActiveTool: (tool: any) => void;
  /** Auto-select the newly-placed image so the inline toolbar appears. */
  selectElement: (id: string) => void;
}

export function useImageInput({
  pagesRef,
  currentPageIndexRef,
  handleElementsChange,
  setActiveTool,
  selectElement,
}: Options) {
  const addImageToCanvas = useCallback(
    (dataUrl: string, pos?: { x: number; y: number }) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const maxW = 450;
        const maxH = 450;
        let w = img.width || 300;
        let h = img.height || 200;

        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const newImageElem: CanvasElement = {
          id: `el_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'image',
          x: pos ? pos.x : 100,
          y: pos ? pos.y : 100,
          width: w,
          height: h,
          src: dataUrl,
          stroke: 'transparent',
          strokeWidth: 0,
        };

        const currentElems = pagesRef.current[currentPageIndexRef.current] || [];
        handleElementsChange([...currentElems, newImageElem]);
        setActiveTool('select');
        // Select on the next frame so the Konva node exists in the tree.
        requestAnimationFrame(() => selectElement(newImageElem.id));
      };
    },
    [pagesRef, currentPageIndexRef, handleElementsChange, setActiveTool, selectElement],
  );

  const pasteImageFromClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert('ბრაუზერი არ უჭერს მხარს ამ ფუნქციას. გთხოვთ გამოიყენოთ Ctrl+V.');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageTypes = item.types.filter((type) => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) addImageToCanvas(e.target.result as string);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert('ბუფერში (Clipboard) სურათი ვერ მოიძებნა.');
    } catch (err) {
      console.error(err);
      alert('გთხოვთ დართოთ ბუფერთან წვდომის უფლება, ან გამოიყენოთ კლავიატურა (Ctrl+V).');
    }
  }, [addImageToCanvas]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) addImageToCanvas(base64);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addImageToCanvas]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) addImageToCanvas(base64);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) addImageToCanvas(base64);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  return { pasteImageFromClipboard, handleDrop, handleFileInputChange };
}