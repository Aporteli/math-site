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
    (dataUrl: string, pos?: { x: number; y: number }, pageIndex?: number) => {
      const targetPage = pageIndex ?? currentPageIndexRef.current;
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        // How big the picture sits on the board. The stored bitmap stays sharper
        // than this so text in a pasted screenshot is still readable.
        const maxDisplay = 1200;
        const maxBitmap = 2048;
        const naturalW = img.naturalWidth || img.width || 300;
        const naturalH = img.naturalHeight || img.height || 200;

        let displayW = naturalW;
        let displayH = naturalH;
        if (displayW > maxDisplay || displayH > maxDisplay) {
          const ratio = Math.min(maxDisplay / displayW, maxDisplay / displayH);
          displayW = Math.round(displayW * ratio);
          displayH = Math.round(displayH * ratio);
        }

        let src = dataUrl;
        if (naturalW > maxBitmap || naturalH > maxBitmap) {
          const ratio = Math.min(maxBitmap / naturalW, maxBitmap / naturalH);
          const bitmapW = Math.max(1, Math.round(naturalW * ratio));
          const bitmapH = Math.max(1, Math.round(naturalH * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = bitmapW;
          canvas.height = bitmapH;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          const keepPng = dataUrl.startsWith('data:image/png');
          if (!keepPng) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, bitmapW, bitmapH);
          }
          ctx.drawImage(img, 0, 0, bitmapW, bitmapH);
          src = keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92);
        }

        const newImageElem: CanvasElement = {
          id: `el_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'image',
          x: pos ? pos.x : 100,
          y: pos ? pos.y : 100,
          width: displayW,
          height: displayH,
          src,
          stroke: 'transparent',
          strokeWidth: 0,
        };

        const currentElems = pagesRef.current[targetPage] || [];
        currentPageIndexRef.current = targetPage;
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
  }, [addImageToCanvas, currentPageIndexRef]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const files = e.clipboardData?.files;
      const items = e.clipboardData?.items;
      let blob: File | null = null;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            blob = files[i];
            break;
          }
        }
      }

      if (!blob && items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            blob = items[i].getAsFile();
            if (blob) break;
          }
        }
      }
      if (!blob) return;
      // Image paste always belongs on the board, even if a leftover
      // text overlay is still focused after switching pages.
      if (typing && !blob) return;
      e.preventDefault();
      const pageIndex = currentPageIndexRef.current;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) addImageToCanvas(base64, undefined, pageIndex);
      };
      reader.readAsDataURL(blob);
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
