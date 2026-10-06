'use client';

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { fileBytesFromDataUrl, megabytes } from './useWhiteboardState';

const MAX_DISPLAY = 1200;
const MAX_BITMAP = 2048;

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('image read failed'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('image read failed'));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), type, quality);
  });
}

function displaySize(naturalW: number, naturalH: number): { displayW: number; displayH: number } {
  let displayW = naturalW;
  let displayH = naturalH;
  if (displayW > MAX_DISPLAY || displayH > MAX_DISPLAY) {
    const ratio = Math.min(MAX_DISPLAY / displayW, MAX_DISPLAY / displayH);
    displayW = Math.round(displayW * ratio);
    displayH = Math.round(displayH * ratio);
  }
  return { displayW, displayH };
}

async function resizedUploadBlob(bitmap: ImageBitmap, bitmapW: number, bitmapH: number, keepPng: boolean): Promise<Blob | null> {
  let resized: ImageBitmap | null = null;
  try {
    resized = await createImageBitmap(bitmap, {
      resizeWidth: bitmapW,
      resizeHeight: bitmapH,
      resizeQuality: 'high',
    });
  } catch {
    resized = null;
  }

  const source = resized ?? bitmap;
  const canvas = document.createElement('canvas');
  canvas.width = bitmapW;
  canvas.height = bitmapH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    resized?.close();
    return null;
  }
  if (!keepPng) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, bitmapW, bitmapH);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, bitmapW, bitmapH);
  resized?.close();
  return canvasToBlob(canvas, keepPng ? 'image/png' : 'image/jpeg', keepPng ? undefined : 0.92);
}

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
    (file: Blob, pos?: { x: number; y: number }, pageIndex?: number) => {
      const targetPage = pageIndex ?? currentPageIndexRef.current;
      void (async () => {
        // Decode off the main thread. A large screenshot used to block here:
        // FileReader built a giant data URL, Image decoded it, then drawImage
        // and canvas.toDataURL ran synchronously inside this callback.
        let bitmap: ImageBitmap;
        try {
          bitmap = await createImageBitmap(file);
        } catch {
          return;
        }

        const naturalW = bitmap.width || 300;
        const naturalH = bitmap.height || 200;
        const { displayW, displayH } = displaySize(naturalW, naturalH);

        let uploadBlob: Blob = file;
        try {
          if (naturalW > MAX_BITMAP || naturalH > MAX_BITMAP) {
            const ratio = Math.min(MAX_BITMAP / naturalW, MAX_BITMAP / naturalH);
            const bitmapW = Math.max(1, Math.round(naturalW * ratio));
            const bitmapH = Math.max(1, Math.round(naturalH * ratio));
            const encoded = await resizedUploadBlob(bitmap, bitmapW, bitmapH, file.type === 'image/png');
            if (!encoded) return;
            uploadBlob = encoded;
          }
        } catch {
          return;
        } finally {
          bitmap.close();
        }

        let src: string;
        try {
          src = await readBlobAsDataUrl(uploadBlob);
        } catch {
          return;
        }

        const pastedFileBytes = file.size;
        const uploadedFileBytes = fileBytesFromDataUrl(src);
        console.log(
          `[whiteboard uploaded image] pasted ${megabytes(pastedFileBytes)}, uploaded ${megabytes(uploadedFileBytes)}`,
        );
        const uploaded = await uploadImageToStorageAction({ dataUrl: src });
        if (!uploaded.success || !uploaded.url) return;

        const newImageElem: CanvasElement = {
          id: `el_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'image',
          x: pos ? pos.x : 100,
          y: pos ? pos.y : 100,
          width: displayW,
          height: displayH,
          src: uploaded.url,
          stroke: 'transparent',
          strokeWidth: 0,
        };

        const currentElems = pagesRef.current[targetPage] || [];
        currentPageIndexRef.current = targetPage;
        handleElementsChange([...currentElems, newImageElem]);
        setActiveTool('select');
        // Select on the next frame so the Konva node exists in the tree.
        requestAnimationFrame(() => selectElement(newImageElem.id));
      })();
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
          addImageToCanvas(blob);
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
      addImageToCanvas(blob, undefined, pageIndex);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addImageToCanvas]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        addImageToCanvas(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      addImageToCanvas(file);
      e.target.value = '';
    }
  };

  return { pasteImageFromClipboard, handleDrop, handleFileInputChange };
}
