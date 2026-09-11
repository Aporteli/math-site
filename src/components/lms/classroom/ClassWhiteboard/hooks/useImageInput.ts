//CUT დასაჭერელი

'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';

interface Options {
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  handleElementsChange: (elems: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  setActiveTool: (tool: any) => void;
}

export interface PendingImage {
  src: string;
  pos?: { x: number; y: number };
  elementId?: string;
}

export function useImageInput({ pagesRef, currentPageIndexRef, handleElementsChange, setActiveTool }: Options) {
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const pendingRef = useRef<PendingImage | null>(null);
  pendingRef.current = pendingImage;

  const addImageToCanvas = useCallback((dataUrl: string, pos?: { x: number; y: number }) => {
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
    };
  }, [pagesRef, currentPageIndexRef, handleElementsChange, setActiveTool]);

  const queueImageForCrop = useCallback((src: string, pos?: { x: number; y: number }) => {
    // Ignore new inputs while a crop session is already open
    if (pendingRef.current) return;
    setPendingImage({ src, pos });
  }, []);

  const cancelCrop = useCallback(() => setPendingImage(null), []);

  const openCropForElement = useCallback((el: CanvasElement) => {
    if (!el.src || pendingRef.current) return;
    setPendingImage({ src: el.src, elementId: el.id });
  }, []);

  const confirmCrop = useCallback((dataUrl: string) => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (pending.elementId) {
      // Keep the original image and place the cropped copy next to it.
      const currentElems = pagesRef.current[currentPageIndexRef.current] || [];
      const original = currentElems.find((e) => e.id === pending.elementId);
      const pos = original
        ? { x: (original.x ?? 100) + 24, y: (original.y ?? 100) + 24 }
        : undefined;
      addImageToCanvas(dataUrl, pos);
    } else {
      addImageToCanvas(dataUrl, pending.pos);
    }
    setPendingImage(null);
  }, [addImageToCanvas, pagesRef, currentPageIndexRef]);

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
            if (e.target?.result) queueImageForCrop(e.target.result as string);
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
  }, [queueImageForCrop]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) queueImageForCrop(base64);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [queueImageForCrop]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) queueImageForCrop(base64);
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
        if (base64) queueImageForCrop(base64);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  return { queueImageForCrop, pasteImageFromClipboard, openCropForElement, pendingImage, cancelCrop, confirmCrop, handleDrop, handleFileInputChange };
}